const express = require('express');
const router = express.Router();

// Admin routes module
module.exports = (pool, requireAuth, requireRole) => {
    
    // Admin: Employees Route
    router.get('/employees', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            const [employees] = await pool.execute(`
                SELECT u.*, e.employee_id, d.department_name, e.is_active as employee_active
                FROM users u
                LEFT JOIN employees e ON u.user_id = e.user_id
                LEFT JOIN departments d ON e.department_id = d.department_id
                WHERE u.role IN ('employee', 'monitor')
                ORDER BY e.is_active DESC, u.full_name
            `);
            
            const [departments] = await pool.execute('SELECT DISTINCT department_id, department_name FROM departments ORDER BY department_name');
            
            res.render('admin/employees', { user: req.session.user, employees, departments });
        } catch (error) {
            console.error('Employees error:', error);
            res.render('error', { message: 'Error loading employees' });
        }
    });

    // Admin: Monitors Route
    router.get('/monitors', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            const [monitors] = await pool.execute(`
                SELECT u.*, ma.start_date, ma.end_date, ma.is_active as monitor_active
                FROM users u
                LEFT JOIN monitor_assignments ma ON u.user_id = ma.user_id AND ma.is_active = 1
                WHERE u.role = 'monitor'
                ORDER BY u.full_name
            `);
            
            const [employees] = await pool.execute(`
                SELECT u.user_id, u.full_name, u.username, d.department_name
                FROM users u
                JOIN employees e ON u.user_id = e.user_id
                JOIN departments d ON e.department_id = d.department_id
                WHERE u.role = 'employee' AND e.is_active = 1
                ORDER BY u.full_name
            `);
            
            res.render('admin/monitors', { user: req.session.user, monitors, employees });
        } catch (error) {
            console.error('Monitors error:', error);
            res.render('error', { message: 'Error loading monitors' });
        }
    });

    // Admin: Manage Admins Route (Read-only)
    router.get('/manage-admins', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            res.render('admin/manage-admins', { user: req.session.user });
        } catch (error) {
            console.error('Manage admins error:', error);
            res.render('error', { message: 'Error loading admin management' });
        }
    });

    // Admin: Stock Route
    router.get('/stock', requireAuth, requireRole(['admin']), async (req, res) => {
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
                    (p.quantity + COALESCE((
                        SELECT SUM(pa.quantity) 
                        FROM product_assignments pa 
                        WHERE pa.product_id = p.product_id AND pa.is_returned = FALSE
                    ), 0)) as total_quantity,
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
            
            // Get comprehensive stock analytics
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
            
            // Get recent stock activity (if stock_history table exists)
            let recentActivity = [];
            try {
                const [activity] = await pool.execute(`
                    SELECT 
                        sh.action,
                        sh.quantity,
                        sh.performed_at,
                        sh.notes,
                        p.product_name,
                        u.full_name as performed_by_name
                    FROM stock_history sh
                    JOIN products p ON sh.product_id = p.product_id
                    JOIN users u ON sh.performed_by = u.user_id
                    ORDER BY sh.performed_at DESC
                    LIMIT 20
                `);
                recentActivity = activity;
            } catch (historyError) {
                console.log('Stock history table not found, skipping recent activity');
            }
            
            res.render('admin/stock', { 
                user: req.session.user, 
                products: products || [],
                stockStats: stockStats || [],
                recentActivity: recentActivity || []
            });
        } catch (error) {
            console.error('Admin stock error:', error);
            res.render('admin/stock', { 
                user: req.session.user, 
                products: [],
                stockStats: [],
                recentActivity: [],
                error: 'Error loading stock data'
            });
        }
    });

    // Admin: History Route
    router.get('/history', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            const [history] = await pool.execute(`
                SELECT 'assignment' as type, pa.assigned_at as date, p.product_name, 
                       u1.full_name as employee_name, u2.full_name as monitor_name, pa.quantity,
                       CASE WHEN pa.is_returned THEN 'Returned' ELSE 'Assigned' END as status
                FROM product_assignments pa
                JOIN products p ON pa.product_id = p.product_id
                JOIN employees e ON pa.employee_id = e.employee_id
                JOIN users u1 ON e.user_id = u1.user_id
                JOIN users u2 ON pa.monitor_id = u2.user_id
                UNION ALL
                SELECT 'request' as type, pr.requested_at as date, p.product_name,
                       u1.full_name as employee_name, COALESCE(u2.full_name, 'Pending') as monitor_name, pr.quantity,
                       pr.status
                FROM product_requests pr
                JOIN products p ON pr.product_id = p.product_id
                JOIN employees e ON pr.employee_id = e.employee_id
                JOIN users u1 ON e.user_id = u1.user_id
                LEFT JOIN users u2 ON pr.processed_by = u2.user_id
                ORDER BY date DESC
                LIMIT 100
            `);
            
            res.render('admin/history', { user: req.session.user, history });
        } catch (error) {
            console.error('History error:', error);
            res.render('error', { message: 'Error loading history' });
        }
    });

    // Admin: Registration Requests Route
    router.get('/registration-requests', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            // Get all pending registration requests with department information
            const [requests] = await pool.execute(`
                SELECT 
                    rr.*,
                    d.department_name
                FROM registration_requests rr
                LEFT JOIN departments d ON rr.department_id = d.department_id
                ORDER BY rr.requested_at DESC
            `);

            // Get departments for the form
            const [departments] = await pool.execute(
                'SELECT DISTINCT department_id, department_name FROM departments ORDER BY department_name'
            );

            res.render('admin/registration-requests', {
                user: req.session.user,
                requests: requests || [],
                departments: departments || [],
                messages: req.flash()
            });
        } catch (error) {
            console.error('Registration requests error:', error);
            req.flash('error', 'Error loading registration requests');
            res.redirect('/admin/dashboard');
        }
    });

    // Admin: Dashboard Stats API
    router.get('/dashboard-stats', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            const [totalEmployees] = await pool.execute(
                'SELECT COUNT(*) as count FROM users WHERE role IN ("employee", "monitor")'
            );
            
            const [activeMonitors] = await pool.execute(
                'SELECT COUNT(*) as count FROM users WHERE role = "monitor"'
            );
            
            const [pendingRegistrations] = await pool.execute(
                'SELECT COUNT(*) as count FROM registration_requests WHERE status = "pending"'
            );
            
            const [totalProducts] = await pool.execute(
                'SELECT COUNT(*) as count FROM products'
            );
            
            // Fetch recent system activity
            const [recentActivity] = await pool.execute(`
                SELECT 'request' as type, pr.requested_at as date, p.product_name, 
                       u.full_name as employee_name, pr.status, pr.quantity
                FROM product_requests pr
                JOIN products p ON pr.product_id = p.product_id
                JOIN employees e ON pr.employee_id = e.employee_id
                JOIN users u ON e.user_id = u.user_id
                WHERE pr.requested_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                UNION ALL
                SELECT 'assignment' as type, pa.assigned_at as date, p.product_name,
                       u.full_name as employee_name, 
                       CASE WHEN pa.is_returned THEN 'returned' ELSE 'assigned' END as status,
                       pa.quantity
                FROM product_assignments pa
                JOIN products p ON pa.product_id = p.product_id
                JOIN employees e ON pa.employee_id = e.employee_id
                JOIN users u ON e.user_id = u.user_id
                WHERE pa.assigned_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                UNION ALL
                SELECT 'registration' as type, rr.requested_at as date, 'User Registration' as product_name,
                       rr.full_name as employee_name, rr.status, 1 as quantity
                FROM registration_requests rr
                WHERE rr.requested_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                ORDER BY date DESC
                LIMIT 10
            `);
            
            // Fetch stock analytics
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
            
            res.json({
                totalEmployees: totalEmployees[0].count,
                activeMonitors: activeMonitors[0].count,
                pendingRegistrations: pendingRegistrations[0].count,
                totalProducts: totalProducts[0].count,
                recentActivity: recentActivity || [],
                stockStats: stockStats || []
            });
        } catch (error) {
            console.error('Dashboard stats error:', error);
            res.status(500).json({ error: 'Failed to fetch dashboard stats' });
        }
    });

    // Admin: Assign Monitor Route
    router.post('/assign-monitor', requireAuth, requireRole(['admin']), async (req, res) => {
        const { employee_id, end_date } = req.body;
        
        try {
            const connection = await pool.getConnection();
            await connection.beginTransaction();
            
            try {
                // Check if user exists and is an employee
                const [users] = await connection.execute(
                    'SELECT * FROM users WHERE user_id = ? AND role = "employee"',
                    [employee_id]
                );
                
                if (users.length === 0) {
                    req.flash('error', 'Invalid employee selected');
                    res.redirect('/admin/monitors');
                    return;
                }
                
                // Check if there are already 4 active monitors
                const [activeMonitors] = await connection.execute(
                    'SELECT COUNT(*) as count FROM users WHERE role = "monitor"'
                );
                
                if (activeMonitors[0].count >= 4) {
                    req.flash('error', 'Maximum of 4 monitors allowed');
                    res.redirect('/admin/monitors');
                    return;
                }
                
                // Update user role to monitor
                await connection.execute(
                    'UPDATE users SET role = "monitor" WHERE user_id = ?',
                    [employee_id]
                );
                
                // Create monitor assignment record
                await connection.execute(
                    'INSERT INTO monitor_assignments (user_id, assigned_by, start_date, end_date, is_active) VALUES (?, ?, NOW(), ?, 1)',
                    [employee_id, req.session.user.user_id, end_date]
                );
                
                await connection.commit();
                req.flash('success', 'Monitor assigned successfully');
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
            res.redirect('/admin/monitors');
        } catch (error) {
            console.error('Assign monitor error:', error);
            req.flash('error', 'Error assigning monitor');
            res.redirect('/admin/monitors');
        }
    });

    // Admin: Unassign Monitor Route
    router.post('/unassign-monitor', requireAuth, requireRole(['admin']), async (req, res) => {
        const { user_id } = req.body;
        
        try {
            const connection = await pool.getConnection();
            await connection.beginTransaction();
            
            try {
                // Check if user is currently a monitor
                const [users] = await connection.execute(
                    'SELECT * FROM users WHERE user_id = ? AND role = "monitor"',
                    [user_id]
                );
                
                if (users.length === 0) {
                    req.flash('error', 'User is not currently a monitor');
                    res.redirect('/admin/monitors');
                    return;
                }
                
                // Update user role back to employee
                await connection.execute(
                    'UPDATE users SET role = "employee" WHERE user_id = ?',
                    [user_id]
                );
                
                // Deactivate monitor assignment
                await connection.execute(
                    'UPDATE monitor_assignments SET is_active = 0, end_date = NOW() WHERE user_id = ? AND is_active = 1',
                    [user_id]
                );
                
                await connection.commit();
                req.flash('success', 'Monitor unassigned successfully');
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
            res.redirect('/admin/monitors');
        } catch (error) {
            console.error('Unassign monitor error:', error);
            req.flash('error', 'Error unassigning monitor');
            res.redirect('/admin/monitors');
        }
    });

    // Admin: Process Registration Request Route
    router.post('/process-registration', requireAuth, requireRole(['admin']), async (req, res) => {
        const { request_id, action } = req.body;
        
        try {
            const connection = await pool.getConnection();
            await connection.beginTransaction();
            
            try {
                // Get the registration request
                const [requests] = await connection.execute(
                    'SELECT * FROM registration_requests WHERE request_id = ?',
                    [request_id]
                );
                
                if (requests.length === 0) {
                    throw new Error('Registration request not found');
                }
                
                const request = requests[0];
                
                if (action === 'approve') {
                    // Create user account
                    const [result] = await connection.execute(`
                        INSERT INTO users (username, full_name, email, password, role) 
                        VALUES (?, ?, ?, ?, 'employee')
                    `, [request.username, request.full_name, request.email, request.password]);
                    
                    const userId = result.insertId;
                    
                    // Create employee record
                    await connection.execute(`
                        INSERT INTO employees (user_id, department_id, is_active) 
                        VALUES (?, ?, 1)
                    `, [userId, request.department_id]);
                }
                
                // Update request status
                await connection.execute(
                    'UPDATE registration_requests SET status = ?, processed_at = NOW() WHERE request_id = ?',
                    [action === 'approve' ? 'approved' : 'rejected', request_id]
                );
                
                await connection.commit();
                req.flash('success', `Registration request ${action}d successfully`);
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
        } catch (error) {
            console.error('Process registration error:', error);
            req.flash('error', 'Error processing registration request');
        }
        
        res.redirect('/admin/registration-requests');
    });

    // Admin: Create Employee Route
    router.post('/create-employee', requireAuth, requireRole(['admin']), async (req, res) => {
        const { full_name, username, email, password, department_id, role } = req.body;
        
        try {
            const connection = await pool.getConnection();
            await connection.beginTransaction();
            
            try {
                // Check if username or email already exists
                const [existingUsers] = await connection.execute(
                    'SELECT * FROM users WHERE username = ? OR email = ?',
                    [username, email]
                );
                
                if (existingUsers.length > 0) {
                    req.flash('error', 'Username or email already exists');
                    res.redirect('/admin/employees');
                    return;
                }
                
                // Hash password
                const bcrypt = require('bcryptjs');
                const hashedPassword = await bcrypt.hash(password, 10);
                
                // Create user
                const [result] = await connection.execute(`
                    INSERT INTO users (username, full_name, email, password, role) 
                    VALUES (?, ?, ?, ?, ?)
                `, [username, full_name, email, hashedPassword, role]);
                
                const userId = result.insertId;
                
                // Create employee record
                await connection.execute(`
                    INSERT INTO employees (user_id, department_id, is_active) 
                    VALUES (?, ?, 1)
                `, [userId, department_id]);
                
                await connection.commit();
                req.flash('success', 'Employee created successfully');
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
        } catch (error) {
            console.error('Create employee error:', error);
            req.flash('error', 'Error creating employee');
        }
        
        res.redirect('/admin/employees');
    });

    // Admin: Toggle Employee Status Route (Deactivate/Activate)
    router.post('/toggle-employee-status/:id', requireAuth, requireRole(['admin']), async (req, res) => {
        const employeeId = req.params.id;
        
        try {
            const connection = await pool.getConnection();
            await connection.beginTransaction();
            
            try {
                // Get current status
                const [employees] = await connection.execute(
                    'SELECT u.is_active FROM users u WHERE u.user_id = ?',
                    [employeeId]
                );
                
                if (employees.length === 0) {
                    req.flash('error', 'Employee not found');
                    res.redirect('/admin/employees');
                    return;
                }
                
                const currentStatus = employees[0].is_active;
                const newStatus = !currentStatus;
                
                // Update user status
                await connection.execute(
                    'UPDATE users SET is_active = ? WHERE user_id = ?',
                    [newStatus, employeeId]
                );
                
                // Update employee status
                await connection.execute(
                    'UPDATE employees SET is_active = ? WHERE user_id = ?',
                    [newStatus, employeeId]
                );
                
                await connection.commit();
                req.flash('success', `Employee ${newStatus ? 'activated' : 'deactivated'} successfully`);
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
        } catch (error) {
            console.error('Toggle employee status error:', error);
            req.flash('error', 'Error updating employee status');
        }
        
        res.redirect('/admin/employees');
    });

    // Admin: Bulk Deactivate Employees Route
    router.post('/bulk-deactivate-employees', requireAuth, requireRole(['admin']), async (req, res) => {
        const { employee_ids } = req.body;
        
        if (!employee_ids || employee_ids.length === 0) {
            req.flash('error', 'No employees selected');
            return res.redirect('/admin/employees');
        }
        
        try {
            const connection = await pool.getConnection();
            await connection.beginTransaction();
            
            try {
                const employeeIdArray = Array.isArray(employee_ids) ? employee_ids : [employee_ids];
                const placeholders = employeeIdArray.map(() => '?').join(',');
                
                // Update user status
                await connection.execute(
                    `UPDATE users SET is_active = 0 WHERE user_id IN (${placeholders})`,
                    employeeIdArray
                );
                
                // Update employee status
                await connection.execute(
                    `UPDATE employees SET is_active = 0 WHERE user_id IN (${placeholders})`,
                    employeeIdArray
                );
                
                await connection.commit();
                req.flash('success', `${employeeIdArray.length} employee(s) deactivated successfully`);
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
        } catch (error) {
            console.error('Bulk deactivate error:', error);
            req.flash('error', 'Error deactivating employees');
        }
        
        res.redirect('/admin/employees');
    });

    // Admin: Bulk Activate Employees Route
    router.post('/bulk-activate-employees', requireAuth, requireRole(['admin']), async (req, res) => {
        const { employee_ids } = req.body;
        
        if (!employee_ids || employee_ids.length === 0) {
            req.flash('error', 'No employees selected');
            return res.redirect('/admin/employees');
        }
        
        try {
            const connection = await pool.getConnection();
            await connection.beginTransaction();
            
            try {
                const employeeIdArray = Array.isArray(employee_ids) ? employee_ids : [employee_ids];
                const placeholders = employeeIdArray.map(() => '?').join(',');
                
                // Update user status
                await connection.execute(
                    `UPDATE users SET is_active = 1 WHERE user_id IN (${placeholders})`,
                    employeeIdArray
                );
                
                // Update employee status
                await connection.execute(
                    `UPDATE employees SET is_active = 1 WHERE user_id IN (${placeholders})`,
                    employeeIdArray
                );
                
                await connection.commit();
                req.flash('success', `${employeeIdArray.length} employee(s) activated successfully`);
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
        } catch (error) {
            console.error('Bulk activate error:', error);
            req.flash('error', 'Error activating employees');
        }
        
        res.redirect('/admin/employees');
    });

    return router;
};
