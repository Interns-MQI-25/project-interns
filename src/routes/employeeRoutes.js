const express = require('express');
const router = express.Router();

// Employee routes module
module.exports = (pool, requireAuth, requireRole) => {
    
    // Employee: Records Route
    router.get('/records', requireAuth, requireRole(['employee']), async (req, res) => {
        try {
            const [records] = await pool.execute(`
                SELECT pa.*, p.product_name, u.full_name as monitor_name, pa.return_date, pa.assignment_id, pa.is_returned
                FROM product_assignments pa
                JOIN products p ON pa.product_id = p.product_id
                JOIN users u ON pa.monitor_id = u.user_id
                JOIN employees e ON pa.employee_id = e.employee_id
                WHERE e.user_id = ?
                ORDER BY pa.assigned_at DESC
            `, [req.session.user.user_id]);
            
            res.render('employee/records', { user: req.session.user, records });
        } catch (error) {
            console.error('Records error:', error);
            res.render('error', { message: 'Error loading records' });
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

    // Employee: Requests Route
    router.get('/requests', requireAuth, requireRole(['employee']), async (req, res) => {
        try {
            const [products] = await pool.execute('SELECT * FROM products WHERE quantity > 0');
            const [requests] = await pool.execute(`
                SELECT pr.*, p.product_name, u.full_name as processed_by_name
                FROM product_requests pr
                JOIN products p ON pr.product_id = p.product_id
                JOIN employees e ON pr.employee_id = e.employee_id
                LEFT JOIN users u ON pr.processed_by = u.user_id
                WHERE e.user_id = ?
                ORDER BY pr.requested_at DESC
            `, [req.session.user.user_id]);
            
            res.render('employee/requests', { user: req.session.user, products, requests });
        } catch (error) {
            console.error('Requests error:', error);
            res.render('error', { message: 'Error loading requests' });
        }
    });

    // Employee: Stock Route
    router.get('/stock', requireAuth, requireRole(['employee']), async (req, res) => {
        try {
            // Get products with corrected column names
            const [products] = await pool.execute(`
                SELECT 
                    product_id,
                    item_number,
                    product_name,
                    asset_type,
                    product_category,
                    model_number,
                    serial_number,
                    is_available,
                    quantity,
                    COALESCE(calibration_required, FALSE) as calibration_required,
                    added_at
                FROM products 
                WHERE is_available = TRUE AND quantity > 0
                ORDER BY asset_type, product_category, product_name
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
        const { product_id, quantity, purpose } = req.body;

        // Input validation
        if (!product_id || !quantity || !purpose) {
            req.flash('error', 'Product, quantity, and purpose are required fields.');
            return res.redirect('/employee/requests');
        }

        // Validate quantity is a positive integer
        const qty = parseInt(quantity, 10);
        if (isNaN(qty) || qty <= 0) {
            req.flash('error', 'Quantity must be a positive number.');
            return res.redirect('/employee/requests');
        }

        try {
            const [employee] = await pool.execute(
                'SELECT employee_id FROM employees WHERE user_id = ?',
                [req.session.user.user_id]
            );

            if (!employee || employee.length === 0) {
                req.flash('error', 'Employee record not found. Cannot submit request.');
                return res.redirect('/employee/requests');
            }

            // Check if product exists and has sufficient quantity
            const [products] = await pool.execute(
                'SELECT quantity FROM products WHERE product_id = ?',
                [product_id]
            );

            if (!products || products.length === 0) {
                req.flash('error', 'Selected product does not exist.');
                return res.redirect('/employee/requests');
            }

            if (products[0].quantity < qty) {
                req.flash('error', `Requested quantity exceeds available stock (${products[0].quantity}).`);
                return res.redirect('/employee/requests');
            }

            await pool.execute(
                'INSERT INTO product_requests (employee_id, product_id, quantity, purpose) VALUES (?, ?, ?, ?)',
                [employee[0].employee_id, product_id, qty, purpose]
            );

            req.flash('success', 'Product request submitted successfully');
            res.redirect('/employee/requests');
        } catch (error) {
            console.error('Request product error:', error);
            req.flash('error', `Error submitting request: ${error.message}`);
            res.redirect('/employee/requests');
        }
    });

    // Employee: Return Product Route
    router.post('/return-product', requireAuth, requireRole(['employee']), async (req, res) => {
        const { assignment_id } = req.body;

        if (!assignment_id) {
            req.flash('error', 'Invalid request.');
            return res.redirect('/employee/records');
        }

        try {
            const [assignments] = await pool.execute(
                'SELECT * FROM product_assignments WHERE assignment_id = ? AND is_returned = 0',
                [assignment_id]
            );

            if (assignments.length === 0) {
                req.flash('error', 'Assignment not found or already returned.');
                return res.redirect('/employee/records');
            }

            await pool.execute(
                'UPDATE product_assignments SET is_returned = 1, return_date = NOW() WHERE assignment_id = ?',
                [assignment_id]
            );

            req.flash('success', 'Product returned successfully.');
            res.redirect('/employee/records');
        } catch (error) {
            console.error('Return product error:', error);
            req.flash('error', 'Error processing return.');
            res.redirect('/employee/records');
        }
    });

    return router;
};
