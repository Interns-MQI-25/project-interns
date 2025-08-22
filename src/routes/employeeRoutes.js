/**
 * @fileoverview Employee Routes Module - Handles all employee-specific functionality routes
 * 
 * This module exports a factory function that creates Express router with employee routes.
 * Provides dashboard access, product requests, records viewing, account management,
 * and product interaction capabilities for employees in the inventory management system.
 * 
 * @author Priyanshu Kumar Sharma
 * @version 1.0.0
 * @requires express - Web application framework
 * @requires path - Utilities for working with file paths
 * @requires ../utils/activityLogger - Activity logging utilities (optional fallback)
 * @requires ../utils/fileUpload - File attachment management utilities
 */

const express = require('express');
const router = express.Router();
const path = require('path');

/**
 * Activity Logger Import with Fallback
 * 
 * Attempts to import activity logging utility with graceful fallback.
 * Provides no-op functions if activity logger is not available to prevent crashes.
 * 
 * @type {Object} ActivityLogger - Activity logging utility or fallback object
 */
let ActivityLogger;
try {
    ActivityLogger = require('../utils/activityLogger');
} catch (err) {
    console.log('ActivityLogger not available, using fallback');
    ActivityLogger = {
        logProductRequest: () => Promise.resolve()
    };
}

// Import file upload utilities
const { 
    getProductAttachments, 
    getFileIcon,
    formatFileSize 
} = require('../utils/fileUpload');

/**
 * Employee Routes Factory Function
 * 
 * Creates and configures all employee-specific routes with proper authentication and authorization.
 * Returns an Express router instance with employee functionality including dashboard,
 * product requests, records management, and account settings.
 * 
 * @param {mysql.Pool} pool - MySQL connection pool for database operations
 * @param {Function} requireAuth - Authentication middleware function
 * @param {Function} requireRole - Role-based authorization middleware function
 * @returns {express.Router} Configured Express router with employee routes
 * 
 * @example
 * // Usage in main server file
 * const employeeRoutes = require('./src/routes/employeeRoutes');
 * app.use('/employee', employeeRoutes(pool, requireAuth, requireRole));
 */
module.exports = (pool, requireAuth, requireRole) => {
    
    /**
     * Employee Records Route
     * 
     * Displays comprehensive employee transaction history including product assignments
     * and requests. Shows current assignments, return status, processed requests,
     * and provides complete audit trail for employee's product interactions.
     * 
     * @route GET /employee/records
     * @access Employee and Monitor roles
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {void} Renders employee records view
     * 
     * @example
     * // Access: GET /employee/records
     * // Renders view with: assignments history, requests history
     */
    router.get('/records', requireAuth, requireRole(['employee']), async (req, res) => {
        try {
            let assignments = [];
            let requests = [];
            
            try {
                const [assignmentResults] = await pool.execute(`
                    SELECT pa.*, p.product_name, u.full_name as monitor_name,
                           CASE 
                               WHEN pa.return_status = 'requested' THEN 'Return request submitted'
                               WHEN pa.is_returned = 1 THEN 'Return approved and completed'
                               WHEN pa.remarks LIKE 'RETURN_REJECTED:%' THEN 'Return request rejected'
                               ELSE 'Product assigned for use'
                           END as return_purpose,
                           CASE 
                               WHEN pa.return_status = 'requested' THEN 'pending'
                               WHEN pa.is_returned = 1 THEN 'approved'
                               WHEN pa.remarks LIKE 'RETURN_REJECTED:%' THEN 'rejected'
                               ELSE 'assigned'
                           END as return_request_status,
                           CASE 
                               WHEN pa.return_status = 'requested' THEN pa.assigned_at
                               WHEN pa.is_returned = 1 THEN pa.returned_at
                               WHEN pa.remarks LIKE 'RETURN_REJECTED:%' THEN pa.assigned_at
                               ELSE NULL
                           END as return_requested_date,
                           returned_user.full_name as returned_processed_by_name
                    FROM product_assignments pa
                    JOIN products p ON pa.product_id = p.product_id
                    JOIN users u ON pa.monitor_id = u.user_id
                    JOIN employees e ON pa.employee_id = e.employee_id
                    LEFT JOIN users returned_user ON pa.returned_to = returned_user.user_id
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
                    COALESCE(
                        (SELECT COUNT(*) FROM product_assignments pa 
                         WHERE pa.product_id = p.product_id AND pa.is_returned = FALSE), 0
                    ) as assigned_quantity,
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
                'INSERT INTO product_requests (employee_id, product_id, quantity, purpose, return_date) VALUES (?, ?, ?, ?, ?)',
                [employee[0].employee_id, product_id, 1, purpose || 'No purpose specified', expected_return_date]
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

    // Employee: Request Extension Route
    router.post('/request-extension', requireAuth, requireRole(['employee']), async (req, res) => {
        const { assignment_id, extension_reason, new_return_date } = req.body;

        if (!assignment_id || !extension_reason || !new_return_date) {
            req.flash('error', 'All fields are required for extension request.');
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

            if (assignments[0].extension_status === 'requested') {
                req.flash('error', 'Extension request already submitted.');
                return res.redirect('/employee/my-products');
            }

            await pool.execute(
                'UPDATE product_assignments SET extension_requested = TRUE, extension_reason = ?, new_return_date = ?, extension_status = "requested", extension_requested_at = NOW() WHERE assignment_id = ?',
                [extension_reason, new_return_date, assignment_id]
            );

            req.flash('success', 'Extension request submitted successfully.');
            res.redirect('/employee/my-products');
        } catch (error) {
            console.error('Extension request error:', error);
            req.flash('error', 'Error submitting extension request.');
            res.redirect('/employee/my-products');
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

            // Mark return as requested (needs monitor approval) and clear any previous rejection remarks
            await pool.execute(
                'UPDATE product_assignments SET return_status = "requested", return_remarks = NULL WHERE assignment_id = ?',
                [assignment_id]
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
                       pa.extension_requested, pa.extension_reason, pa.new_return_date, pa.extension_status, pa.extension_requested_at, pa.extension_remarks,
                       p.product_name, p.asset_type, p.model_number, p.serial_number,
                       u.full_name as monitor_name, ext_user.full_name as extension_processed_by_name
                FROM product_assignments pa
                JOIN products p ON pa.product_id = p.product_id
                JOIN employees e ON pa.employee_id = e.employee_id
                JOIN users u ON pa.monitor_id = u.user_id
                LEFT JOIN users ext_user ON pa.extension_processed_by = ext_user.user_id
                WHERE e.user_id = ? AND pa.is_returned = 0
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

    // API endpoint to get active products count for dashboard
    router.get('/api/active-products-count', requireAuth, requireRole(['employee']), async (req, res) => {
        try {
            const currentUserId = req.session.user.user_id;
            
            // Get current employee's employee_id
            const [currentEmployee] = await pool.execute(
                'SELECT employee_id FROM employees WHERE user_id = ?', 
                [currentUserId]
            );
            
            if (currentEmployee.length === 0) {
                return res.json({ count: 0 });
            }
            
            const currentEmployeeId = currentEmployee[0].employee_id;
            
            // Count active products (not returned)
            const [activeProducts] = await pool.execute(
                'SELECT COUNT(*) as count FROM product_assignments WHERE employee_id = ? AND is_returned = FALSE',
                [currentEmployeeId]
            );
            
            res.json({ count: activeProducts[0].count });
        } catch (error) {
            console.error('Error fetching active products count:', error);
            res.json({ count: 0 });
        }
    });

    // API endpoint to get pending requests count for dashboard
    router.get('/api/pending-requests-count', requireAuth, requireRole(['employee']), async (req, res) => {
        try {
            const currentUserId = req.session.user.user_id;
            
            // Get current employee's employee_id
            const [currentEmployee] = await pool.execute(
                'SELECT employee_id FROM employees WHERE user_id = ?', 
                [currentUserId]
            );
            
            if (currentEmployee.length === 0) {
                return res.json({ count: 0 });
            }
            
            const currentEmployeeId = currentEmployee[0].employee_id;
            
            // Count pending requests
            const [pendingRequests] = await pool.execute(
                'SELECT COUNT(*) as count FROM product_requests WHERE employee_id = ? AND status = "pending"',
                [currentEmployeeId]
            );
            
            res.json({ count: pendingRequests[0].count });
        } catch (error) {
            console.error('Error fetching pending requests count:', error);
            res.json({ count: 0 });
        }
    });

    // API endpoint to get total requests count for dashboard
    router.get('/api/total-requests-count', requireAuth, requireRole(['employee']), async (req, res) => {
        try {
            const currentUserId = req.session.user.user_id;
            
            // Get current employee's employee_id
            const [currentEmployee] = await pool.execute(
                'SELECT employee_id FROM employees WHERE user_id = ?', 
                [currentUserId]
            );
            
            if (currentEmployee.length === 0) {
                return res.json({ count: 0 });
            }
            
            const currentEmployeeId = currentEmployee[0].employee_id;
            
            // Count all requests
            const [totalRequests] = await pool.execute(
                'SELECT COUNT(*) as count FROM product_requests WHERE employee_id = ?',
                [currentEmployeeId]
            );
            
            res.json({ count: totalRequests[0].count });
        } catch (error) {
            console.error('Error fetching total requests count:', error);
            res.json({ count: 0 });
        }
    });

    // Route: Download file attachment (Employee)
    router.get('/download-attachment/:attachmentId', requireAuth, requireRole(['employee']), async (req, res) => {
        try {
            const attachmentId = req.params.attachmentId;
            
            // Get attachment details
            const [attachments] = await pool.execute(
                'SELECT * FROM product_attachments WHERE attachment_id = ?',
                [attachmentId]
            );
            
            if (attachments.length === 0) {
                return res.status(404).json({ error: 'File not found' });
            }
            
            const attachment = attachments[0];
            const filePath = attachment.file_path;
            
            // Check if file exists
            const fs = require('fs');
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found on server' });
            }
            
            // Set headers for download
            res.setHeader('Content-Disposition', `attachment; filename="${attachment.original_filename}"`);
            res.setHeader('Content-Type', attachment.mime_type);
            
            // Send file
            res.sendFile(path.resolve(filePath));
            
        } catch (error) {
            console.error('Download error:', error);
            res.status(500).json({ error: 'Error downloading file' });
        }
    });

    // Route: View product attachments (API - Employee)
    router.get('/api/product-attachments/:productId', requireAuth, requireRole(['employee']), async (req, res) => {
        try {
            const productId = req.params.productId;
            const attachments = await getProductAttachments(pool, productId);
            
            // Add file icons and formatted sizes
            const formattedAttachments = attachments.map(attachment => ({
                ...attachment,
                file_icon: getFileIcon(attachment.filename),
                formatted_size: formatFileSize(attachment.file_size),
                download_url: `/employee/download-attachment/${attachment.attachment_id}`
            }));
            
            res.json(formattedAttachments);
        } catch (error) {
            console.error('Error fetching attachments:', error);
            res.status(500).json({ error: 'Error fetching attachments' });
        }
    });

    return router;
};