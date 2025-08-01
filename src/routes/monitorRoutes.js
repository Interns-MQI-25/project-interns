const express = require('express');
const router = express.Router();

// Try to import ActivityLogger, fallback if not available
let ActivityLogger;
try {
    ActivityLogger = require('../utils/activityLogger');
} catch (err) {
    console.log('ActivityLogger not available, using fallback');
    ActivityLogger = {
        logRequestApproval: () => Promise.resolve(),
        logProductAssignment: () => Promise.resolve()
    };
}

// Monitor routes module
module.exports = (pool, requireAuth, requireRole) => {
    
    // Monitor: Approvals Route
    router.get('/approvals', requireAuth, requireRole(['monitor']), async (req, res) => {
        try {
            const currentUserId = req.session.user.user_id;
            
            // Get current monitor's employee_id
            const [currentMonitor] = await pool.execute(
                'SELECT employee_id FROM employees WHERE user_id = ?', 
                [currentUserId]
            );
            
            if (currentMonitor.length === 0) {
                return res.render('monitor/approvals', { 
                    user: req.session.user, 
                    requests: [], 
                    returnRequests: [],
                    error: 'Monitor employee record not found'
                });
            }
            
            const currentMonitorEmployeeId = currentMonitor[0].employee_id;
            
            // Get pending product requests assigned to this monitor OR unassigned legacy requests
            const [requests] = await pool.execute(`
                SELECT pr.*, p.product_name, u.full_name as employee_name, d.department_name,
                       requestor.full_name as requestor_name, requestor.role as requestor_role
                FROM product_requests pr
                JOIN products p ON pr.product_id = p.product_id
                JOIN employees e ON pr.employee_id = e.employee_id
                JOIN users u ON e.user_id = u.user_id
                JOIN departments d ON e.department_id = d.department_id
                JOIN users requestor ON e.user_id = requestor.user_id
                WHERE pr.status = 'pending' 
                AND (pr.assigned_monitor_id = ? OR pr.assigned_monitor_id IS NULL)
                ORDER BY pr.requested_at ASC
            `, [currentMonitorEmployeeId]);
            
            // Get pending return requests
            let returnRequests = [];
            try {
                const [returnResults] = await pool.execute(`
                    SELECT pa.*, p.product_name, u.full_name as employee_name, d.department_name
                    FROM product_assignments pa
                    JOIN products p ON pa.product_id = p.product_id
                    JOIN employees e ON pa.employee_id = e.employee_id
                    JOIN users u ON e.user_id = u.user_id
                    JOIN departments d ON e.department_id = d.department_id
                    WHERE pa.return_status = 'requested'
                    ORDER BY pa.assigned_at ASC
                `);
                returnRequests = returnResults || [];
            } catch (err) {
                console.log('Return requests query failed (column may not exist):', err.message);
            }
            
            console.log('Found pending requests:', requests.length);
            console.log('Found return requests:', returnRequests.length);
            
            res.render('monitor/approvals', { 
                user: req.session.user, 
                requests: requests || [], 
                returnRequests: returnRequests || [] 
            });
        } catch (error) {
            console.error('Approvals error:', error);
            res.render('monitor/approvals', { 
                user: req.session.user, 
                requests: [], 
                returnRequests: [] 
            });
        }
    });

    // Monitor: Inventory Route
    router.get('/inventory', requireAuth, requireRole(['monitor']), async (req, res) => {
        try {
            const [products] = await pool.execute('SELECT * FROM products ORDER BY product_name');
            res.render('monitor/inventory', { 
                user: req.session.user, 
                products 
            });
        } catch (error) {
            console.error('Inventory error:', error);
            res.render('error', { message: 'Error loading inventory' });
        }
    });

    // Monitor: Stock Route
    router.get('/stock', requireAuth, requireRole(['monitor']), async (req, res) => {
        try {
            const productsQuery = `
                SELECT 
                    p.*,
                    u.full_name as added_by_name,
                    COALESCE((
                        SELECT COUNT(*) 
                        FROM product_assignments pa 
                        WHERE pa.product_id = p.product_id
                    ), 0) as total_assignments,
                    COALESCE((
                        SELECT SUM(pa.quantity) 
                        FROM product_assignments pa 
                        WHERE pa.product_id = p.product_id AND pa.is_returned = FALSE
                    ), 0) as currently_assigned,
                    CASE 
                        WHEN p.calibration_due_date IS NOT NULL AND p.calibration_due_date < CURDATE() THEN 'Overdue'
                        WHEN p.calibration_due_date IS NOT NULL AND p.calibration_due_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'Due Soon'
                        WHEN p.calibration_due_date IS NOT NULL THEN 'Current'
                        ELSE 'Not Required'
                    END as calibration_status
                FROM products p
                LEFT JOIN users u ON p.added_by = u.user_id
                ORDER BY p.asset_type, p.product_category, p.product_name
            `;
            
            const [products] = await pool.execute(productsQuery);
            
            // Stock statistics query
            const stockStatsQuery = `
                SELECT 
                    asset_type,
                    COUNT(*) as total_items,
                    SUM(quantity) as total_quantity,
                    SUM(CASE WHEN is_available = TRUE THEN quantity ELSE 0 END) as available_quantity,
                    SUM(CASE WHEN COALESCE(calibration_required, FALSE) = TRUE THEN 1 ELSE 0 END) as calibration_items,
                    SUM(CASE WHEN calibration_due_date IS NOT NULL AND calibration_due_date < CURDATE() THEN 1 ELSE 0 END) as overdue_calibrations
                FROM products
                GROUP BY asset_type
            `;
            
            const [stockStats] = await pool.execute(stockStatsQuery);
            
            res.render('monitor/stock', { 
                user: req.session.user, 
                products: products || [],
                stockStats: stockStats || []
            });
        } catch (error) {
            console.error('Monitor stock error:', error);
            res.render('monitor/stock', { 
                user: req.session.user, 
                products: [],
                stockStats: [],
                error: 'Error loading stock data'
            });
        }
    });

    // Monitor: Records Route
    router.get('/records', requireAuth, requireRole(['monitor']), async (req, res) => {
        try {
            const currentUserId = req.session.user.user_id;
            
            // Get current monitor's employee_id
            const [currentMonitor] = await pool.execute(
                'SELECT employee_id FROM employees WHERE user_id = ?', 
                [currentUserId]
            );
            
            if (currentMonitor.length === 0) {
                return res.render('monitor/records', { 
                    user: req.session.user, 
                    assignments: [],
                    productRequests: [],
                    totalProducts: 0,
                    totalAssignments: 0,
                    activeAssignments: 0,
                    pendingRequests: 0,
                    returnedItems: 0,
                    error: 'Monitor employee record not found'
                });
            }
            
            const currentMonitorEmployeeId = currentMonitor[0].employee_id;
            
            // Get assignment records
            const [records] = await pool.execute(`
                SELECT 
                    pa.*,
                    p.product_name,
                    p.asset_type,
                    u.full_name as employee_name,
                    d.department_name
                FROM product_assignments pa
                JOIN products p ON pa.product_id = p.product_id
                JOIN employees e ON pa.employee_id = e.employee_id
                JOIN users u ON e.user_id = u.user_id
                JOIN departments d ON e.department_id = d.department_id
                WHERE pa.monitor_id = ?
                ORDER BY pa.assigned_at DESC
            `, [currentUserId]);
            
            // Get product request history (all requests handled by this monitor)
            const [productRequests] = await pool.execute(`
                SELECT 
                    pr.*,
                    p.product_name,
                    p.asset_type,
                    u.full_name as employee_name,
                    d.department_name,
                    requestor.full_name as requestor_name,
                    requestor.role as requestor_role,
                    monitor_user.full_name as monitor_name
                FROM product_requests pr
                JOIN products p ON pr.product_id = p.product_id
                JOIN employees e ON pr.employee_id = e.employee_id
                JOIN users u ON e.user_id = u.user_id
                JOIN departments d ON e.department_id = d.department_id
                JOIN users requestor ON e.user_id = requestor.user_id
                LEFT JOIN employees monitor_emp ON pr.assigned_monitor_id = monitor_emp.employee_id
                LEFT JOIN users monitor_user ON monitor_emp.user_id = monitor_user.user_id
                WHERE pr.assigned_monitor_id = ? OR pr.processed_by = ?
                ORDER BY pr.requested_at DESC
            `, [currentMonitorEmployeeId, currentUserId]);
            
            // Get statistics for the template
            const [totalProducts] = await pool.execute('SELECT COUNT(*) as count FROM products');
            const [totalAssignments] = await pool.execute('SELECT COUNT(*) as count FROM product_assignments WHERE monitor_id = ?', [currentUserId]);
            const [activeAssignments] = await pool.execute('SELECT COUNT(*) as count FROM product_assignments WHERE monitor_id = ? AND is_returned = FALSE', [currentUserId]);
            const [pendingRequests] = await pool.execute('SELECT COUNT(*) as count FROM product_requests WHERE status = "pending" AND (assigned_monitor_id = ? OR assigned_monitor_id IS NULL)', [currentMonitorEmployeeId]);
            const [returnedItems] = await pool.execute('SELECT COUNT(*) as count FROM product_assignments WHERE monitor_id = ? AND is_returned = TRUE', [currentUserId]);
            
            res.render('monitor/records', { 
                user: req.session.user, 
                assignments: records,
                productRequests: productRequests,
                totalProducts: totalProducts[0].count,
                totalAssignments: totalAssignments[0].count,
                activeAssignments: activeAssignments[0].count,
                pendingRequests: pendingRequests[0].count,
                returnedItems: returnedItems[0].count
            });
        } catch (error) {
            console.error('Monitor records error:', error);
            res.render('error', { message: 'Error loading records' });
        }
    });

    // Monitor: Process Request Route
    router.post('/process-request', requireAuth, requireRole(['monitor']), async (req, res) => {
        const { request_id, action } = req.body;
        
        try {
            // Get request details for logging
            const [requestDetails] = await pool.execute(`
                SELECT pr.*, p.product_name, u.full_name as employee_name
                FROM product_requests pr
                JOIN products p ON pr.product_id = p.product_id
                JOIN employees e ON pr.employee_id = e.employee_id
                JOIN users u ON e.user_id = u.user_id
                WHERE pr.request_id = ?
            `, [request_id]);
            
            // Simple update - just change the status
            await pool.execute(
                'UPDATE product_requests SET status = ?, processed_by = ?, processed_at = NOW() WHERE request_id = ?',
                [action, req.session.user.user_id, request_id]
            );
            
            if (requestDetails.length > 0) {
                const request = requestDetails[0];
                
                // Log the approval/rejection activity
                if (action === 'approved') {
                    if (ActivityLogger && ActivityLogger.logRequestApproval) {
                        try {
                            await ActivityLogger.logRequestApproval(
                                pool,
                                req.session.user.user_id,
                                request.employee_name,
                                request.product_name,
                                request.quantity,
                                request_id
                            );
                        } catch (logError) {
                            console.error('Error logging request approval:', logError);
                        }
                    }
                    
                    // Create basic product assignment
                    const [assignmentResult] = await pool.execute(
                        'INSERT INTO product_assignments (product_id, employee_id, monitor_id, quantity) VALUES (?, ?, ?, ?)',
                        [request.product_id, request.employee_id, req.session.user.user_id, request.quantity]
                    );
                    
                    // Log the assignment activity
                    if (ActivityLogger && ActivityLogger.logProductAssignment) {
                        try {
                            await ActivityLogger.logProductAssignment(
                                pool,
                                req.session.user.user_id,
                                request.employee_name,
                                request.product_name,
                                request.quantity,
                                assignmentResult.insertId,
                                request.product_id
                            );
                        } catch (logError) {
                            console.error('Error logging product assignment:', logError);
                        }
                    }
                    
                    // Update product quantity
                    await pool.execute(
                        'UPDATE products SET quantity = quantity - ? WHERE product_id = ?',
                        [request.quantity, request.product_id]
                    );
                }
            }
            
            req.flash('success', `Request ${action} successfully`);
        } catch (error) {
            console.error('Process request error:', error);
            req.flash('error', 'Error processing request');
        }
        
        res.redirect('/monitor/approvals');
    });

    // Monitor: Process Return Request Route
    router.post('/process-return', requireAuth, requireRole(['monitor', 'admin']), async (req, res) => {
        const { assignment_id, action } = req.body;
        
        try {
            const connection = await pool.getConnection();
            await connection.beginTransaction();
            
            try {
                if (action === 'approve') {
                    // Get assignment details
                    const [assignments] = await connection.execute(
                        'SELECT * FROM product_assignments WHERE assignment_id = ? AND return_status = "requested"',
                        [assignment_id]
                    );
                    
                    if (assignments.length === 0) {
                        throw new Error('Assignment not found or not in requested status');
                    }
                    
                    const assignment = assignments[0];
                    
                    // Update assignment as returned and approved
                    await connection.execute(
                        'UPDATE product_assignments SET is_returned = 1, return_status = "approved", return_date = NOW() WHERE assignment_id = ?',
                        [assignment_id]
                    );
                    
                    // Restore product quantity
                    await connection.execute(
                        'UPDATE products SET quantity = quantity + ? WHERE product_id = ?',
                        [assignment.quantity, assignment.product_id]
                    );
                    
                    req.flash('success', 'Return approved successfully. Product is now available for request.');
                } else if (action === 'reject') {
                    // Reset return status to none
                    await connection.execute(
                        'UPDATE product_assignments SET return_status = "none" WHERE assignment_id = ?',
                        [assignment_id]
                    );
                    
                    req.flash('success', 'Return request rejected.');
                }
                
                await connection.commit();
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
            res.redirect('/monitor/approvals');
        } catch (error) {
            console.error('Process return error:', error);
            req.flash('error', 'Error processing return request');
            res.redirect('/monitor/approvals');
        }
    });

    // API endpoint to get live active assignments count
    router.get('/api/monitor/active-assignments-count', requireAuth, requireRole(['monitor']), async (req, res) => {
        try {
            const [activeAssignments] = await pool.execute(
                'SELECT COUNT(*) as count FROM product_assignments WHERE monitor_id = ? AND is_returned = FALSE',
                [req.session.user.user_id]
            );
            res.json({ count: activeAssignments[0].count });
        } catch (error) {
            console.error('Error fetching active assignments count:', error);
            res.status(500).json({ count: 0 });
        }
    });

    // API endpoint to get live total assignments count
    router.get('/api/monitor/total-assignments-count', requireAuth, requireRole(['monitor']), async (req, res) => {
        try {
            const [totalAssignments] = await pool.execute(
                'SELECT COUNT(*) as count FROM product_assignments WHERE monitor_id = ?',
                [req.session.user.user_id]
            );
            res.json({ count: totalAssignments[0].count });
        } catch (error) {
            console.error('Error fetching total assignments count:', error);
            res.status(500).json({ count: 0 });
        }
    });

    // Monitor: Add Product Route
    router.post('/add-product', requireAuth, requireRole(['monitor', 'admin']), async (req, res) => {
        const { 
            name, 
            product_category, 
            type, 
            model, 
            serial,
            purchase_date,
            pr_no,
            po_number,
            inward_date,
            inwarded_by,
            requires_calibration,
            last_calibration_date,
            calibration_frequency_months,
            calibration_frequency_years,
            next_calibration_date,
            calibration_notes,
            version_number,
            software_license_type,
            license_start_date,
            renewal_frequency_months,
            renewal_frequency_years,
            next_renewal_date
        } = req.body;
        
        try {
            console.log('Add product request body:', req.body); // Debug logging
            
            const connection = await pool.getConnection();
            await connection.beginTransaction();
            
            try {
                // Calculate calibration frequency string
                let calibrationFrequency = null;
                if (requires_calibration === 'on') {
                    const months = parseInt(calibration_frequency_months) || 0;
                    const years = parseInt(calibration_frequency_years) || 0;
                    if (months > 0 || years > 0) {
                        calibrationFrequency = `${years} years ${months} months`;
                    }
                }
                
                // Insert product with correct field mapping
                const [productResult] = await connection.execute(`
                    INSERT INTO products (
                        product_name, 
                        product_category, 
                        asset_type,
                        model_number, 
                        serial_number, 
                        quantity, 
                        added_by,
                        calibration_required, 
                        calibration_frequency, 
                        calibration_due_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    name || null, 
                    product_category || null, 
                    type || null,
                    model || null, 
                    serial || null, 
                    1, // Default quantity
                    req.session.user.user_id,
                    requires_calibration === 'on' ? 1 : 0, 
                    calibrationFrequency, 
                    next_calibration_date || null
                ]);
                
                // Add to stock history if table exists
                try {
                    await connection.execute(`
                        INSERT INTO stock_history (product_id, action, quantity, performed_by, notes) 
                        VALUES (?, 'add', ?, ?, ?)
                    `, [
                        productResult.insertId, 
                        1, // Default quantity
                        req.session.user.user_id, 
                        'Initial stock added'
                    ]);
                } catch (historyError) {
                    console.log('Stock history table not found, skipping history entry');
                }
                
                await connection.commit();
                req.flash('success', 'Product added successfully to inventory');
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
            const redirectPath = req.session.user.role === 'admin' ? '/admin/stock' : '/monitor/inventory';
            res.redirect(redirectPath);
        } catch (error) {
            console.error('Add product error:', error);
            req.flash('error', 'Error adding product to inventory');
            const redirectPath = req.session.user.role === 'admin' ? '/admin/stock' : '/monitor/inventory';
            res.redirect(redirectPath);
        }
    });

    // Monitor: Request Product Route
    router.post('/request-product', requireAuth, requireRole(['monitor']), async (req, res) => {
        try {
            const { product_id, return_date, purpose } = req.body;
            const requesterId = req.session.user.user_id;
            
            // Get the requester's employee record to get employee_id
            const [requesterEmployee] = await pool.execute(
                'SELECT employee_id FROM employees WHERE user_id = ?', 
                [requesterId]
            );
            
            if (requesterEmployee.length === 0) {
                req.flash('error', 'Employee record not found');
                return res.redirect('/monitor/stock');
            }
            
            const employeeId = requesterEmployee[0].employee_id;
            
            // Get all monitors except the requester
            const [otherMonitors] = await pool.execute(`
                SELECT e.employee_id, u.full_name, u.email 
                FROM employees e 
                JOIN users u ON e.user_id = u.user_id 
                WHERE u.role = 'monitor' AND u.user_id != ? AND u.is_active = 1
            `, [requesterId]);
            
            if (otherMonitors.length === 0) {
                req.flash('error', 'No other monitors available to handle your request');
                return res.redirect('/monitor/stock');
            }
            
            // Randomly assign to one of the other monitors
            const randomMonitor = otherMonitors[Math.floor(Math.random() * otherMonitors.length)];
            const assignedMonitorId = randomMonitor.employee_id;
            
            // Create the product request
            await pool.execute(`
                INSERT INTO product_requests 
                (employee_id, product_id, return_date, purpose, status, requested_at, assigned_monitor_id) 
                VALUES (?, ?, ?, ?, 'pending', NOW(), ?)
            `, [employeeId, product_id, return_date, purpose || null, assignedMonitorId]);
            
            // Log the activity
            if (ActivityLogger && ActivityLogger.logRequest) {
                try {
                    await ActivityLogger.logRequest(requesterId, {
                        type: 'monitor_product_request',
                        product_id: product_id,
                        assigned_monitor: randomMonitor.full_name,
                        return_date: return_date,
                        purpose: purpose
                    });
                } catch (logError) {
                    console.error('Error logging monitor request activity:', logError);
                }
            }
            
            req.flash('success', `Product request submitted successfully and assigned to monitor: ${randomMonitor.full_name}`);
            res.redirect('/monitor/records');
        } catch (error) {
            console.error('Error submitting monitor product request:', error);
            req.flash('error', 'Error submitting product request');
            res.redirect('/monitor/stock');
        }
    });

    // API Route: Pending Approvals Count
    router.get('/api/monitor/pending-approvals-count', async (req, res) => {
        try {
            const [rows] = await req.app.locals.pool.execute(
                'SELECT COUNT(*) AS count FROM approvals WHERE status = "pending"'
            );
            res.json({ count: rows[0].count });
        } catch (err) {
            res.json({ count: 0 });
        }
    });

    return router;
};
