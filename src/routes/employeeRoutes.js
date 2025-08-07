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
                    SELECT pa.*, p.product_name, u.full_name as monitor_name
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

            res.render('employee/account', { 
                user: req.session.user, 
                employee: employeeDetails[0],
                messages: req.flash()
            });
        } catch (error) {
            console.error('Account error:', error);
            res.render('error', { message: 'Error loading account details' });
        }
    });

    // Employee: Change Password Route
    router.post('/change-password', requireAuth, requireRole(['employee']), async (req, res) => {
        const { current_password, new_password, confirm_password } = req.body;
        
        try {
            // Validate input
            if (!current_password || !new_password || !confirm_password) {
                req.flash('error', 'All password fields are required');
                return res.redirect('/employee/account');
            }
            
            if (new_password !== confirm_password) {
                req.flash('error', 'New password and confirmation do not match');
                return res.redirect('/employee/account');
            }
            
            if (new_password.length < 6) {
                req.flash('error', 'New password must be at least 6 characters long');
                return res.redirect('/employee/account');
            }
            
            // Get current user details
            const [users] = await pool.execute(
                'SELECT password FROM users WHERE user_id = ?',
                [req.session.user.user_id]
            );
            
            if (users.length === 0) {
                req.flash('error', 'User not found');
                return res.redirect('/employee/account');
            }
            
            // Verify current password
            const bcrypt = require('bcryptjs');
            const isValidPassword = await bcrypt.compare(current_password, users[0].password);
            
            if (!isValidPassword) {
                req.flash('error', 'Current password is incorrect');
                return res.redirect('/employee/account');
            }
            
            // Hash new password
            const hashedNewPassword = await bcrypt.hash(new_password, 10);
            
            // Update password in database
            await pool.execute(
                'UPDATE users SET password = ?, updated_at = NOW() WHERE user_id = ?',
                [hashedNewPassword, req.session.user.user_id]
            );
            
            req.flash('success', 'Password changed successfully');
            res.redirect('/employee/account');
            
        } catch (error) {
            console.error('Change password error:', error);
            req.flash('error', 'Error changing password. Please try again.');
            res.redirect('/employee/account');
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
                        WHERE pa.product_id = p.product_id AND pa.is_returned = FALSE
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
                        WHERE pa.product_id = p.product_id AND pa.is_returned = FALSE
                        LIMIT 3
                    ) as current_users
                FROM products p
                WHERE p.quantity > 0
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
        const { product_id, expected_return_date, purpose } = req.body;

        // Input validation
        if (!product_id || !expected_return_date) {
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
                'INSERT INTO product_requests (employee_id, product_id, quantity, purpose) VALUES (?, ?, ?, ?)',
                [employee[0].employee_id, product_id, 1, purpose || 'No purpose specified']
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
            return res.redirect('/employee/my-products');
        }

        try {
            const [assignments] = await pool.execute(
                'SELECT * FROM product_assignments WHERE assignment_id = ? AND is_returned = 0',
                [assignment_id]
            );

            if (assignments.length === 0) {
                req.flash('error', 'Assignment not found or already returned.');
                return res.redirect('/employee/my-products');
            }

            // Check if return is already requested
            if (assignments[0].return_status === 'requested') {
                req.flash('error', 'Return request already submitted.');
                return res.redirect('/employee/my-products');
            }

            // Mark return as requested (needs monitor approval)
            await pool.execute(
                'UPDATE product_assignments SET return_status = ? WHERE assignment_id = ?',
                ['requested', assignment_id]
            );

            req.flash('success', 'Return request submitted successfully. Waiting for monitor approval.');
            res.redirect('/employee/my-products');
        } catch (error) {
            console.error('Return request error:', error);
            req.flash('error', `Error submitting return request: ${error.message}`);
            res.redirect('/employee/my-products');
        }
    });

    // Employee: My Products Route
    router.get('/my-products', requireAuth, requireRole(['employee']), async (req, res) => {
        try {
            const [myProducts] = await pool.execute(`
                SELECT pa.assignment_id, pa.assigned_at, pa.return_date, pa.is_returned, pa.return_status, pa.returned_at, pa.remarks,
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