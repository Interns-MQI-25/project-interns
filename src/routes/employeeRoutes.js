const express = require('express');
const router = express.Router();

// Try to import ActivityLogger, fallback if not available
let ActivityLogger;
try {
    ActivityLogger = require('../utils/activityLogger');
} catch (err) {
    console.log('ActivityLogger not available, using fallback');
    ActivityLogger = {
        logProductRequest: () => Promise.resolve()
    };
}

// Employee routes module
module.exports = (pool, requireAuth, requireRole) => {
    
    // Employee: Records Route
    router.get('/records', requireAuth, requireRole(['employee']), async (req, res) => {
        try {
            let assignments = [];
            let requests = [];
            
            try {
                const [assignmentResults] = await pool.execute(`
                    SELECT pa.*, p.product_name, u.full_name as monitor_name, pa.return_date, pa.assignment_id, pa.is_returned, pa.return_status, pa.return_remarks
                    FROM product_assignments pa
                    JOIN products p ON pa.product_id = p.product_id
                    JOIN users u ON pa.monitor_id = u.user_id
                    JOIN employees e ON pa.employee_id = e.employee_id
                    WHERE e.user_id = ?
                    ORDER BY pa.assigned_at DESC
                `, [req.session.user.user_id]);
                assignments = assignmentResults || [];
            } catch (err) {
                console.error('Assignments query error:', err);
            }
            
            try {
                const [requestResults] = await pool.execute(`
                    SELECT pr.*, p.product_name, u.full_name as processed_by_name
                    FROM product_requests pr
                    JOIN products p ON pr.product_id = p.product_id
                    JOIN employees e ON pr.employee_id = e.employee_id
                    LEFT JOIN users u ON pr.processed_by = u.user_id
                    WHERE e.user_id = ?
                    ORDER BY pr.requested_at DESC
                `, [req.session.user.user_id]);
                requests = requestResults || [];
            } catch (err) {
                console.error('Requests query error:', err);
            }
            
            res.render('employee/records', { user: req.session.user, assignments, requests });
        } catch (error) {
            console.error('Records error:', error);
            res.render('employee/records', { user: req.session.user, assignments: [], requests: [] });
        }
    });

    // Employee: Account Route
    router.get('/account', requireAuth, requireRole(['employee']), async (req, res) => {
        try {
            const [employeeDetails] = await pool.execute(`
                SELECT u.user_id, u.username, u.full_name, u.email, u.role, e.is_active, d.department_name
                FROM users u
                JOIN employees e ON u.user_id = e.user_id
                JOIN departments d ON e.department_id = d.department_id
                WHERE u.user_id = ?
            `, [req.session.user.user_id]);

            if (!employeeDetails || employeeDetails.length === 0) {
                req.flash('error', 'Employee details not found.');
                return res.redirect('/employee/dashboard');
            }

            res.render('employee/account', { user: req.session.user, employee: employeeDetails[0] });
        } catch (error) {
            console.error('Account error:', error);
            res.render('error', { message: 'Error loading account details' });
        }
    });

    // Employee: Requests Route - Redirect to Stock
    router.get('/requests', requireAuth, requireRole(['employee']), (req, res) => {
        res.redirect('/employee/stock');
    });

    // Employee: Stock Route
    router.get('/stock', requireAuth, requireRole(['employee']), async (req, res) => {
        try {
            // Get all products with assignment information
            const [products] = await pool.execute(`
                SELECT 
                    p.product_id,
                    p.item_number,
                    p.product_name,
                    p.asset_type,
                    p.product_category,
                    p.model_number,
                    p.serial_number,
                    p.quantity,
                    p.added_at,
                    CASE WHEN EXISTS(
                        SELECT 1 FROM product_assignments pa 
                        WHERE pa.product_id = p.product_id AND pa.is_returned = FALSE AND pa.return_status != 'approved'
                    ) THEN 1 ELSE 0 END as is_assigned,
                    (
                        SELECT GROUP_CONCAT(
                            CONCAT(u.full_name, ' (Return: ', 
                                DATE_FORMAT(pa.return_date, '%d/%m/%Y'), ')')
                            SEPARATOR ', '
                        )
                        FROM product_assignments pa
                        JOIN employees e ON pa.employee_id = e.employee_id
                        JOIN users u ON e.user_id = u.user_id
                        WHERE pa.product_id = p.product_id AND pa.is_returned = FALSE AND pa.return_status != 'approved'
                        LIMIT 3
                    ) as current_users
                FROM products p
                WHERE p.is_available = 1
                ORDER BY p.asset_type, p.product_category, p.product_name
            `);
            
            res.render('employee/stock', { 
                user: req.session.user,
                products: products || []
            });
        } catch (error) {
            console.error('Employee stock error:', error);
            res.render('employee/stock', { 
                user: req.session.user || { full_name: 'Unknown User', role: 'employee' },
                products: [],
                error: 'Failed to load stock information'
            });
        }
    });

    // Employee: Request Product Route
    router.post('/request-product', requireAuth, requireRole(['employee']), async (req, res) => {
        const { product_id, return_date, purpose } = req.body;

        // Input validation
        if (!product_id || !return_date) {
            req.flash('error', 'Product and return date are required fields.');
            return res.redirect('/employee/stock');
        }

        try {
            const [employee] = await pool.execute(
                'SELECT employee_id FROM employees WHERE user_id = ?',
                [req.session.user.user_id]
            );

            if (!employee || employee.length === 0) {
                req.flash('error', 'Employee record not found. Cannot submit request.');
                return res.redirect('/employee/stock');
            }

            // Check if product exists
            const [products] = await pool.execute(
                'SELECT product_id FROM products WHERE product_id = ?',
                [product_id]
            );

            if (!products || products.length === 0) {
                req.flash('error', 'Selected product does not exist.');
                return res.redirect('/employee/stock');
            }

            // Get product details for logging
            const [productDetails] = await pool.execute(
                'SELECT product_name FROM products WHERE product_id = ?',
                [product_id]
            );
            
            const [result] = await pool.execute(
                'INSERT INTO product_requests (employee_id, product_id, quantity, purpose, return_date) VALUES (?, ?, ?, ?, ?)',
                [employee[0].employee_id, product_id, 1, purpose || null, return_date]
            );
            
            // Log the product request activity
            if (productDetails.length > 0 && ActivityLogger && ActivityLogger.logProductRequest) {
                try {
                    await ActivityLogger.logProductRequest(
                        pool,
                        req.session.user.user_id,
                        product_id,
                        result.insertId,
                        productDetails[0].product_name,
                        1,
                        purpose || 'No purpose specified'
                    );
                } catch (logError) {
                    console.error('Error logging product request:', logError);
                }
            }

            req.flash('success', 'Product request submitted successfully');
            res.redirect('/employee/stock');
        } catch (error) {
            console.error('Request product error:', error);
            req.flash('error', `Error submitting request: ${error.message}`);
            res.redirect('/employee/stock');
        }
    });

    // Employee: Return Product Route (Request Return)
    router.post('/return-product', requireAuth, requireRole(['employee']), async (req, res) => {
        const { assignment_id } = req.body;

        if (!assignment_id) {
            req.flash('error', 'Invalid request.');
            return res.redirect('/employee/records');
        }

        try {
            const [assignments] = await pool.execute(
                'SELECT * FROM product_assignments WHERE assignment_id = ? AND is_returned = 0 AND return_status = "none"',
                [assignment_id]
            );

            if (assignments.length === 0) {
                req.flash('error', 'Assignment not found, already returned, or return already requested.');
                return res.redirect('/employee/records');
            }

            // Mark return as requested (pending approval)
            await pool.execute(
                'UPDATE product_assignments SET return_status = "requested" WHERE assignment_id = ?',
                [assignment_id]
            );

            req.flash('success', 'Return request submitted. Waiting for monitor/admin approval.');
            res.redirect('/employee/records');
        } catch (error) {
            console.error('Return request error:', error);
            req.flash('error', 'Error submitting return request.');
            res.redirect('/employee/records');
        }
    });

    // Employee: My Products Route
    router.get('/my-products', requireAuth, requireRole(['employee']), async (req, res) => {
        try {
            const [myProducts] = await pool.execute(`
                SELECT pa.assignment_id, pa.assigned_at, pa.return_date, pa.is_returned, pa.return_status,
                       p.product_name, p.asset_type, p.model_number, p.serial_number,
                       u.full_name as monitor_name
                FROM product_assignments pa
                JOIN products p ON pa.product_id = p.product_id
                JOIN employees e ON pa.employee_id = e.employee_id
                JOIN users u ON pa.monitor_id = u.user_id
                WHERE e.user_id = ?
                ORDER BY pa.assigned_at DESC
            `, [req.session.user.user_id]);
            
            res.render('employee/my-products', { 
                user: req.session.user,
                myProducts: myProducts || []
            });
        } catch (error) {
            console.error('My products error:', error);
            res.render('employee/my-products', { 
                user: req.session.user,
                myProducts: []
            });
        }
    });

    return router;
};