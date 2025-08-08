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
    
    // Monitor: Dashboard Route
    router.get('/dashboard', requireAuth, requireRole(['monitor']), async (req, res) => {
        try {
            // Get basic stats for the dashboard
            const [pendingRequests] = await pool.execute(
                'SELECT COUNT(*) as count FROM product_requests WHERE status = "pending"'
            );
            
            const [approvedToday] = await pool.execute(
                'SELECT COUNT(*) as count FROM product_requests WHERE status = "approved" AND DATE(processed_at) = CURDATE()'
            );
            
            const [totalProducts] = await pool.execute(
                'SELECT COUNT(*) as count FROM products'
            );
            
            // Get recent activity
            const [recentActivity] = await pool.execute(`
                SELECT 'request' as type, pr.requested_at as date, p.product_name,
                       u.full_name as employee_name, pr.status
                FROM product_requests pr
                JOIN products p ON pr.product_id = p.product_id
                JOIN employees e ON pr.employee_id = e.employee_id
                JOIN users u ON e.user_id = u.user_id
                ORDER BY pr.requested_at DESC
                LIMIT 10
            `);
            
            res.render('monitor/dashboard', { 
                user: req.session.user,
                stats: {
                    pendingRequests: pendingRequests[0].count,
                    approvedToday: approvedToday[0].count,
                    totalProducts: totalProducts[0].count
                },
                recentActivity: recentActivity || []
            });
        } catch (error) {
            console.error('Monitor dashboard error:', error);
            res.render('monitor/dashboard', { 
                user: req.session.user,
                stats: {
                    pendingRequests: 0,
                    approvedToday: 0,
                    totalProducts: 0
                },
                recentActivity: []
            });
        }
    });
    
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
            
            // Get all pending product requests with flag for current monitor's requests
            const [requests] = await pool.execute(`
                SELECT pr.*, p.product_name, u.full_name as employee_name, d.department_name,
                       requestor.full_name as requestor_name, requestor.role as requestor_role,
                       CASE WHEN e.employee_id = ? THEN 1 ELSE 0 END as is_own_request
                FROM product_requests pr
                JOIN products p ON pr.product_id = p.product_id
                JOIN employees e ON pr.employee_id = e.employee_id
                JOIN users u ON e.user_id = u.user_id
                JOIN departments d ON e.department_id = d.department_id
                JOIN users requestor ON e.user_id = requestor.user_id
                WHERE pr.status = 'pending'
                ORDER BY pr.requested_at ASC
            `, [currentMonitorEmployeeId]);
            
            // Get pending return requests
            let returnRequests = [];
            try {
                // First check if return_status column exists
                const [columnCheck] = await pool.execute(`
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'product_assignments' 
                    AND COLUMN_NAME = 'return_status' 
                    AND TABLE_SCHEMA = DATABASE()
                `);
                
                if (columnCheck.length > 0) {
                    // Column exists, use it - exclude current monitor's own return requests
                    const [returnResults] = await pool.execute(`
                        SELECT pa.*, p.product_name, u.full_name as employee_name, d.department_name
                        FROM product_assignments pa
                        JOIN products p ON pa.product_id = p.product_id
                        JOIN employees e ON pa.employee_id = e.employee_id
                        JOIN users u ON e.user_id = u.user_id
                        JOIN departments d ON e.department_id = d.department_id
                        WHERE pa.return_status = 'R' AND e.employee_id != ?
                        ORDER BY pa.assigned_at ASC
                    `, [currentMonitorEmployeeId]);
                    returnRequests = returnResults || [];
                } else {
                    console.log('return_status column does not exist in GCP environment. Checking for manual return requests...');
                    // Fallback: look for assignments that might need return processing
                    // This is a temporary solution - you should add the return_status column
                    const [returnResults] = await pool.execute(`
                        SELECT pa.*, p.product_name, u.full_name as employee_name, d.department_name
                        FROM product_assignments pa
                        JOIN products p ON pa.product_id = p.product_id
                        JOIN employees e ON pa.employee_id = e.employee_id
                        JOIN users u ON e.user_id = u.user_id
                        JOIN departments d ON e.department_id = d.department_id
                        WHERE pa.is_returned = 0 
                        AND e.employee_id != ?
                        AND pa.return_date IS NOT NULL 
                        AND pa.return_date <= CURDATE()
                        ORDER BY pa.assigned_at ASC
                    `, [currentMonitorEmployeeId]);
                    returnRequests = returnResults || [];
                }
            } catch (err) {
                console.log('Return requests query failed:', err.message);
                console.log('This might be due to missing return_status column in GCP database');
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
            // Get user with department information
            const [userWithDept] = await pool.execute(`
                SELECT u.*, d.department_name 
                FROM users u 
                LEFT JOIN employees e ON u.user_id = e.user_id 
                LEFT JOIN departments d ON e.department_id = d.department_id 
                WHERE u.user_id = ?
            `, [req.session.user.user_id]);
            
            const userInfo = userWithDept.length > 0 ? userWithDept[0] : req.session.user;
            
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
                        SELECT COUNT(*) 
                        FROM product_assignments pa 
                        WHERE pa.product_id = p.product_id AND pa.is_returned = FALSE
                    ), 0) as assigned_quantity,
                    (
                        SELECT GROUP_CONCAT(
                            CONCAT(emp_user.full_name, ' (Return: ', 
                                DATE_FORMAT(pa.return_date, '%d/%m/%Y'), ')')
                            SEPARATOR ', '
                        )
                        FROM product_assignments pa
                        JOIN employees e ON pa.employee_id = e.employee_id
                        JOIN users emp_user ON e.user_id = emp_user.user_id
                        WHERE pa.product_id = p.product_id AND pa.is_returned = FALSE
                        LIMIT 3
                    ) as current_users,
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
                    SUM(quantity) as total_quantity_sum,
                    SUM(CASE WHEN COALESCE(calibration_required, FALSE) = TRUE THEN 1 ELSE 0 END) as calibration_items,
                    SUM(CASE WHEN calibration_due_date IS NOT NULL AND calibration_due_date < CURDATE() THEN 1 ELSE 0 END) as overdue_calibrations
                FROM products
                GROUP BY asset_type
            `;
            
            const [stockStats] = await pool.execute(stockStatsQuery);
            
            res.render('monitor/stock', { 
                user: userInfo, 
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
            
            // Get all assignment records (all transactions)
            const [records] = await pool.execute(`
                SELECT 
                    pa.*,
                    p.product_name,
                    p.asset_type,
                    u.full_name as employee_name,
                    d.department_name,
                    monitor_user.full_name as monitor_name,
                    DATE_FORMAT(pa.assigned_at, '%d/%m/%Y %H:%i') as formatted_assigned_at,
                    DATE_FORMAT(pa.returned_at, '%d/%m/%Y %H:%i') as formatted_returned_at
                FROM product_assignments pa
                JOIN products p ON pa.product_id = p.product_id
                JOIN employees e ON pa.employee_id = e.employee_id
                JOIN users u ON e.user_id = u.user_id
                JOIN departments d ON e.department_id = d.department_id
                JOIN users monitor_user ON pa.monitor_id = monitor_user.user_id
                ORDER BY pa.assigned_at DESC
            `);
            
            // Get all product request history (all transactions)
            const [productRequests] = await pool.execute(`
                SELECT 
                    pr.*,
                    p.product_name,
                    p.asset_type,
                    u.full_name as employee_name,
                    d.department_name,
                    requestor.full_name as requestor_name,
                    requestor.role as requestor_role,
                    monitor_user.full_name as monitor_name,
                    DATE_FORMAT(pr.requested_at, '%d/%m/%Y %H:%i') as formatted_requested_at,
                    DATE_FORMAT(pr.processed_at, '%d/%m/%Y %H:%i') as formatted_processed_at
                FROM product_requests pr
                JOIN products p ON pr.product_id = p.product_id
                JOIN employees e ON pr.employee_id = e.employee_id
                JOIN users u ON e.user_id = u.user_id
                JOIN departments d ON e.department_id = d.department_id
                JOIN users requestor ON e.user_id = requestor.user_id
                LEFT JOIN users monitor_user ON pr.processed_by = monitor_user.user_id
                ORDER BY pr.requested_at DESC
            `);
            
            // Get statistics for the template
            const [totalProducts] = await pool.execute('SELECT COUNT(*) as count FROM products');
            const [totalAssignments] = await pool.execute('SELECT COUNT(*) as count FROM product_assignments');
            const [activeAssignments] = await pool.execute('SELECT COUNT(*) as count FROM product_assignments WHERE is_returned = FALSE');
            const [pendingRequests] = await pool.execute('SELECT COUNT(*) as count FROM product_requests WHERE status = "pending"');
            const [returnedItems] = await pool.execute('SELECT COUNT(*) as count FROM product_assignments WHERE is_returned = TRUE');
            
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

    router.get('/request', requireAuth, requireRole(['monitor']), async (req, res) => {
        res.render('monitor/request');
    });

    // Monitor: Reports Route
    router.get('/reports', requireAuth, requireRole(['monitor']), async (req, res) => {
        try {
            const currentUserId = req.session.user.user_id;
            
            // Get current monitor's employee_id
            const [currentMonitor] = await pool.execute(
                'SELECT employee_id FROM employees WHERE user_id = ?', 
                [currentUserId]
            );
            
            if (currentMonitor.length === 0) {
                return res.render('monitor/reports', { 
                    user: req.session.user, 
                    monthlyStats: [],
                    recentActivity: [],
                    topProducts: [],
                    error: 'Monitor employee record not found'
                });
            }
            
            // Get monthly assignment statistics
            const [monthlyStats] = await pool.execute(`
                SELECT 
                    YEAR(assigned_at) as year,
                    MONTH(assigned_at) as month,
                    MONTHNAME(assigned_at) as month_name,
                    COUNT(*) as total_assignments,
                    SUM(CASE WHEN is_returned = 1 THEN 1 ELSE 0 END) as returned_items,
                    SUM(CASE WHEN is_returned = 0 THEN 1 ELSE 0 END) as active_assignments
                FROM product_assignments 
                WHERE monitor_id = ?
                AND assigned_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                GROUP BY YEAR(assigned_at), MONTH(assigned_at)
                ORDER BY YEAR(assigned_at) DESC, MONTH(assigned_at) DESC
            `, [currentUserId]);
            
            // Get recent activity (last 20 actions)
            const [recentActivity] = await pool.execute(`
                SELECT 
                    pa.*,
                    p.product_name,
                    p.asset_type,
                    u.full_name as employee_name,
                    d.department_name,
                    CASE 
                        WHEN pa.is_returned = 1 THEN 'Returned'
                        ELSE 'Assigned'
                    END as status
                FROM product_assignments pa
                JOIN products p ON pa.product_id = p.product_id
                JOIN employees e ON pa.employee_id = e.employee_id
                JOIN users u ON e.user_id = u.user_id
                JOIN departments d ON e.department_id = d.department_id
                WHERE pa.monitor_id = ?
                ORDER BY pa.assigned_at DESC
                LIMIT 20
            `, [currentUserId]);
            
            // Get most requested products
            const [topProducts] = await pool.execute(`
                SELECT 
                    p.product_name,
                    p.asset_type,
                    p.product_category,
                    COUNT(pa.assignment_id) as assignment_count,
                    SUM(CASE WHEN pa.is_returned = 0 THEN 1 ELSE 0 END) as currently_assigned
                FROM product_assignments pa
                JOIN products p ON pa.product_id = p.product_id
                WHERE pa.monitor_id = ?
                GROUP BY pa.product_id, p.product_name, p.asset_type, p.product_category
                ORDER BY assignment_count DESC
                LIMIT 10
            `, [currentUserId]);
            
            res.render('monitor/reports', { 
                user: req.session.user, 
                monthlyStats: monthlyStats || [],
                recentActivity: recentActivity || [],
                topProducts: topProducts || []
            });
        } catch (error) {
            console.error('Monitor reports error:', error);
            res.render('monitor/reports', { 
                user: req.session.user, 
                monthlyStats: [],
                recentActivity: [],
                topProducts: [],
                error: 'Sorry for inconvenience!! still under development!!'
            });
        }
    });

    // Monitor: Process Request Route
    router.post('/process-request', requireAuth, requireRole(['monitor']), async (req, res) => {
        const { request_id, action, remarks } = req.body;
        
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
            
            // Update with remarks
            await pool.execute(
                'UPDATE product_requests SET status = ?, processed_by = ?, processed_at = NOW(), remarks = ? WHERE request_id = ?',
                [action, req.session.user.user_id, remarks || null, request_id]
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
                    
                    // Create product assignment with return date
                    await pool.execute(
                        'INSERT INTO product_assignments (product_id, employee_id, monitor_id, quantity, return_date) VALUES (?, ?, ?, ?, ?)',
                        [request.product_id, request.employee_id, req.session.user.user_id, request.quantity, request.return_date]
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
        const { assignment_id, action, remarks } = req.body;
        
        console.log('Process return request received:', { assignment_id, action, remarks });
        
        try {
            // Validate input parameters
            if (!assignment_id || !action) {
                console.error('Missing required parameters:', { assignment_id, action });
                req.flash('error', 'Missing required parameters for processing return request');
                return res.redirect('/monitor/approvals');
            }
            
            // Validate action parameter
            if (!['approve', 'reject'].includes(action)) {
                console.error('Invalid action parameter:', action);
                req.flash('error', 'Invalid action specified');
                return res.redirect('/monitor/approvals');
            }
            
            // Check if return_status column exists first
            let hasReturnStatusColumn = false;
            try {
                const [columnCheck] = await pool.execute(`
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'product_assignments' 
                    AND COLUMN_NAME = 'return_status' 
                    AND TABLE_SCHEMA = DATABASE()
                `);
                hasReturnStatusColumn = columnCheck.length > 0;
                console.log('return_status column exists:', hasReturnStatusColumn);
            } catch (schemaError) {
                console.warn('Could not check schema:', schemaError.message);
            }
            
            if (action === 'approve') {
                // For approval, get assignment details and mark as returned
                const [assignments] = await pool.execute(
                    hasReturnStatusColumn 
                        ? 'SELECT * FROM product_assignments WHERE assignment_id = ? AND return_status = "R"'
                        : 'SELECT * FROM product_assignments WHERE assignment_id = ? AND is_returned = 0',
                    [assignment_id]
                );
                
                if (assignments.length === 0) {
                    console.error('Assignment not found:', assignment_id);
                    req.flash('error', 'Assignment not found or not eligible for return');
                    return res.redirect('/monitor/approvals');
                }
                
                const assignment = assignments[0];
                
                // Update assignment as returned with remarks
                if (hasReturnStatusColumn) {
                    await pool.execute(
                        'UPDATE product_assignments SET is_returned = 1, return_status = "approved", returned_at = NOW(), remarks = ? WHERE assignment_id = ?',
                        [remarks || null, assignment_id]
                    );
                } else {
                    await pool.execute(
                        'UPDATE product_assignments SET is_returned = 1, returned_at = NOW(), remarks = ? WHERE assignment_id = ?',
                        [remarks || null, assignment_id]
                    );
                }
                
                console.log(`Return approved: Assignment ${assignment_id}, Product ${assignment.product_id}`);
                req.flash('success', 'Return approved successfully. Product is now available for request.');
                
            } else if (action === 'reject') {
                // For rejection, update status to rejected and save rejection remarks
                if (hasReturnStatusColumn) {
                    // Set return status to rejected and save rejection remarks
                    await pool.execute(
                        'UPDATE product_assignments SET return_status = ?, return_remarks = ? WHERE assignment_id = ?',
                        ['X', remarks || 'Return request rejected', assignment_id]
                    );
                } else {
                    // If no return_status column, just update remarks
                    await pool.execute(
                        'UPDATE product_assignments SET remarks = ? WHERE assignment_id = ?',
                        [remarks || 'Return request rejected', assignment_id]
                    );
                }
                
                console.log(`Return rejected: Assignment ${assignment_id}`);
                req.flash('success', 'Return request rejected.');
            }
            
            res.redirect('/monitor/approvals');
            
        } catch (error) {
            console.error('Process return error:', error);
            console.error('Error details:', {
                assignment_id,
                action,
                remarks,
                errorMessage: error.message,
                errorStack: error.stack
            });
            req.flash('error', `Error processing return request: ${error.message}`);
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
            next_renewal_date,
            new_license_key,
            new_version_number
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
                
                // Insert product with basic required fields only
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
            
            const redirectPath = req.session.user.role === 'admin' ? '/admin/stock' : '/monitor/stock';
            res.redirect(redirectPath);
        } catch (error) {
            console.error('Add product error:', error);
            req.flash('error', 'Error adding product to inventory');
            const redirectPath = req.session.user.role === 'admin' ? '/admin/stock' : '/monitor/stock';
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
            
            // Get all active monitors except the requester
            const [otherMonitors] = await pool.execute(`
                SELECT u.user_id, u.full_name, u.email, e.employee_id
                FROM users u
                JOIN employees e ON u.user_id = e.user_id 
                WHERE u.role = 'monitor' AND u.user_id != ? AND u.is_active = 1
            `, [requesterId]);
            
            if (otherMonitors.length === 0) {
                req.flash('error', 'No other monitors available to handle your request. At least 2 monitors are required for monitor-to-monitor requests.');
                return res.redirect('/monitor/stock');
            }
            
            // Randomly assign to one of the other monitors
            const randomMonitor = otherMonitors[Math.floor(Math.random() * otherMonitors.length)];
            
            // Create the product request with return date
            await pool.execute(`
                INSERT INTO product_requests 
                (employee_id, product_id, purpose, return_date, status, requested_at) 
                VALUES (?, ?, ?, ?, 'pending', NOW())
            `, [employeeId, product_id, purpose || null, return_date]);
            
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

    // Monitor: My Products Route
    router.get('/my-products', requireAuth, requireRole(['monitor']), async (req, res) => {
        try {
            const currentUserId = req.session.user.user_id;
            
            // Get current monitor's employee_id
            const [currentMonitor] = await pool.execute(
                'SELECT employee_id FROM employees WHERE user_id = ?', 
                [currentUserId]
            );
            
            if (currentMonitor.length === 0) {
                return res.render('monitor/my-products', { 
                    user: req.session.user, 
                    myProducts: [],
                    error: 'Monitor employee record not found'
                });
            }
            
            const currentMonitorEmployeeId = currentMonitor[0].employee_id;
            
            // Get only products currently in use by the monitor (not returned)
            const [myProducts] = await pool.execute(`
                SELECT pa.assignment_id, pa.assigned_at, pa.return_date, pa.is_returned, pa.return_status, pa.returned_at, pa.remarks, pa.return_remarks,
                       p.product_name, p.asset_type, p.model_number, p.serial_number,
                       u.full_name as monitor_name
                FROM product_assignments pa
                JOIN products p ON pa.product_id = p.product_id
                JOIN employees e ON pa.employee_id = e.employee_id
                JOIN users u ON pa.monitor_id = u.user_id
                WHERE e.user_id = ? AND pa.is_returned = 0
                ORDER BY pa.assigned_at DESC
            `, [currentUserId]);
            
            res.render('monitor/my-products', { 
                user: req.session.user, 
                myProducts: myProducts || []
            });
        } catch (error) {
            console.error('Monitor my-products error:', error);
            res.render('monitor/my-products', { 
                user: req.session.user, 
                myProducts: [],
                error: 'Error loading your products'
            });
        }
    });

    // Monitor: Return Product Route
    router.post('/return-product', requireAuth, requireRole(['monitor']), async (req, res) => {
        const { assignment_id } = req.body;
        
        console.log('Return product request received:', { assignment_id, user: req.session.user.user_id });
        
        try {
            // Validate input
            if (!assignment_id) {
                console.error('Missing assignment_id');
                req.flash('error', 'Missing assignment ID');
                return res.redirect('/monitor/my-products');
            }
            
            // First verify the assignment exists and belongs to the current user
            const [assignmentCheck] = await pool.execute(`
                SELECT pa.assignment_id, pa.is_returned, e.user_id
                FROM product_assignments pa
                JOIN employees e ON pa.employee_id = e.employee_id
                WHERE pa.assignment_id = ?
            `, [assignment_id]);
            
            if (assignmentCheck.length === 0) {
                console.error('Assignment not found:', assignment_id);
                req.flash('error', 'Assignment not found');
                return res.redirect('/monitor/my-products');
            }
            
            const assignment = assignmentCheck[0];
            
            // Verify the assignment belongs to the current user
            if (assignment.user_id !== req.session.user.user_id) {
                console.error('Assignment does not belong to current user');
                req.flash('error', 'You can only request return for your own products');
                return res.redirect('/monitor/my-products');
            }
            
            // Check if already returned
            if (assignment.is_returned) {
                console.error('Assignment already returned:', assignment_id);
                req.flash('error', 'This product has already been returned');
                return res.redirect('/monitor/my-products');
            }
            
            // Check if return_status column exists
            let hasReturnStatusColumn = false;
            try {
                const [columnCheck] = await pool.execute(`
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'product_assignments' 
                    AND COLUMN_NAME = 'return_status' 
                    AND TABLE_SCHEMA = DATABASE()
                `);
                hasReturnStatusColumn = columnCheck.length > 0;
                console.log('return_status column exists:', hasReturnStatusColumn);
            } catch (schemaError) {
                console.warn('Could not check schema:', schemaError.message);
            }
            
            // Update the assignment based on column availability
            if (hasReturnStatusColumn) {
                // Check if return_remarks column also exists
                let hasReturnRemarksColumn = false;
                try {
                    const [remarksColumnCheck] = await pool.execute(`
                        SELECT COLUMN_NAME 
                        FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_NAME = 'product_assignments' 
                        AND COLUMN_NAME = 'return_remarks' 
                        AND TABLE_SCHEMA = DATABASE()
                    `);
                    hasReturnRemarksColumn = remarksColumnCheck.length > 0;
                } catch (remarksSchemaError) {
                    console.warn('Could not check return_remarks column:', remarksSchemaError.message);
                }
                
                if (hasReturnRemarksColumn) {
                    // Update with both return_status and clear return_remarks
                    await pool.execute(
                        'UPDATE product_assignments SET return_status = ?, return_remarks = NULL WHERE assignment_id = ?',
                        ['R', assignment_id]
                    );
                } else {
                    // Update only return_status
                    await pool.execute(
                        'UPDATE product_assignments SET return_status = ? WHERE assignment_id = ?',
                        ['R', assignment_id]
                    );
                }
                console.log('Updated return_status to request for assignment:', assignment_id);
            } else {
                // Fallback: update remarks field
                await pool.execute(
                    'UPDATE product_assignments SET remarks = ? WHERE assignment_id = ?',
                    ['Return requested - awaiting approval', assignment_id]
                );
                console.log('Updated remarks for assignment (no return_status column):', assignment_id);
            }
            
            req.flash('success', 'Return request submitted successfully. Awaiting approval from another monitor.');
            console.log('Return request submitted successfully for assignment:', assignment_id);
            
        } catch (error) {
            console.error('Return product error:', error);
            console.error('Error details:', {
                assignment_id,
                user_id: req.session.user.user_id,
                errorMessage: error.message,
                errorStack: error.stack
            });
            req.flash('error', `Error submitting return request: ${error.message}`);
        }
        
        res.redirect('/monitor/my-products');
    });

    // Monitor: My History Route
    router.get('/my-history', requireAuth, requireRole(['monitor']), async (req, res) => {
        try {
            const currentUserId = req.session.user.user_id;
            
            // Get current monitor's employee_id
            const [currentMonitor] = await pool.execute(
                'SELECT employee_id FROM employees WHERE user_id = ?', 
                [currentUserId]
            );
            
            if (currentMonitor.length === 0) {
                return res.render('monitor/my-history', { 
                    user: req.session.user, 
                    myRequests: [],
                    myAssignments: [],
                    error: 'Monitor employee record not found'
                });
            }
            
            const currentMonitorEmployeeId = currentMonitor[0].employee_id;
            
            console.log('My History Debug - Current User ID:', currentUserId);
            console.log('My History Debug - Current Monitor Employee ID:', currentMonitorEmployeeId);
            
            // Get monitor's own product requests
            const [myRequests] = await pool.execute(`
                SELECT 
                    pr.*,
                    p.product_name,
                    p.asset_type,
                    monitor_user.full_name as processed_by_name,
                    DATE_FORMAT(pr.requested_at, '%d/%m/%Y %H:%i') as formatted_requested_at,
                    DATE_FORMAT(pr.processed_at, '%d/%m/%Y %H:%i') as formatted_processed_at
                FROM product_requests pr
                JOIN products p ON pr.product_id = p.product_id
                LEFT JOIN users monitor_user ON pr.processed_by = monitor_user.user_id
                WHERE pr.employee_id = ?
                ORDER BY pr.requested_at DESC
            `, [currentMonitorEmployeeId]);
            
            // Get monitor's own assignment history
            const [myAssignments] = await pool.execute(`
                SELECT 
                    pa.*,
                    p.product_name,
                    p.asset_type,
                    u.full_name as monitor_name,
                    DATE_FORMAT(pa.assigned_at, '%d/%m/%Y %H:%i') as formatted_assigned_at,
                    DATE_FORMAT(pa.returned_at, '%d/%m/%Y %H:%i') as formatted_returned_at
                FROM product_assignments pa
                JOIN products p ON pa.product_id = p.product_id
                JOIN users u ON pa.monitor_id = u.user_id
                WHERE pa.employee_id = ?
                ORDER BY pa.assigned_at DESC
            `, [currentMonitorEmployeeId]);
            
            res.render('monitor/my-history', { 
                user: req.session.user, 
                myRequests: myRequests || [],
                myAssignments: myAssignments || []
            });
        } catch (error) {
            console.error('Monitor my-history error:', error);
            res.render('monitor/my-history', { 
                user: req.session.user, 
                myRequests: [],
                myAssignments: [],
                error: 'Error loading your history'
            });
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
