const express = require('express');
const router = express.Router();

// Admin routes module
module.exports = (pool, requireAuth, requireRole) => {
    
    // Admin: Dashboard Route (add this before other routes)
    router.get('/dashboard', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            // Get dashboard statistics
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

            const [lowStockProducts] = await pool.execute(
                'SELECT COUNT(*) as count FROM products WHERE quantity <= 5'
            );

            // Get recent activity
            const [recentActivity] = await pool.execute(`
                SELECT 'request' as type, pr.requested_at as date, p.product_name, 
                       u.full_name as employee_name, pr.status, pr.quantity
                FROM product_requests pr
                JOIN products p ON pr.product_id = p.product_id
                JOIN employees e ON pr.employee_id = e.employee_id
                JOIN users u ON e.user_id = u.user_id
                UNION ALL
                SELECT 'assignment' as type, pa.assigned_at as date, p.product_name,
                       u.full_name as employee_name, 
                       CASE WHEN pa.is_returned THEN 'returned' ELSE 'assigned' END as status,
                       pa.quantity
                FROM product_assignments pa
                JOIN products p ON pa.product_id = p.product_id
                JOIN employees e ON pa.employee_id = e.employee_id
                JOIN users u ON e.user_id = u.user_id
                ORDER BY date DESC
                LIMIT 10
            `);

            res.render('admin/dashboard', {
                user: req.session.user,
                stats: {
                    totalEmployees: totalEmployees[0].count,
                    activeMonitors: activeMonitors[0].count,
                    pendingRegistrations: pendingRegistrations[0].count,
                    totalProducts: totalProducts[0].count,
                    lowStockProducts: lowStockProducts[0].count
                },
                recentActivity: recentActivity || [],
                messages: req.flash()
            });
        } catch (error) {
            console.error('Admin dashboard error:', error);
            res.render('error', { 
                message: 'Error loading admin dashboard',
                user: req.session.user 
            });
        }
    });

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


    // Inventory
    router.get('/inventory', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            const [products] = await pool.execute(`
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
                    END as calibration_status,
                    CASE 
                        WHEN p.calibration_required = 1 AND p.calibration_frequency IS NOT NULL 
                        THEN DATE_ADD(p.added_at, INTERVAL CAST(p.calibration_frequency AS UNSIGNED) YEAR)
                        ELSE NULL
                    END as next_calibration_date,
                    GROUP_CONCAT(
                        CONCAT(emp_user.full_name, ' (', dept.department_name, ')')
                        ORDER BY pa.assigned_at DESC 
                        SEPARATOR '; '
                    ) as assigned_to_details
                FROM products p
                LEFT JOIN users u ON p.added_by = u.user_id
                LEFT JOIN product_assignments pa ON p.product_id = pa.product_id AND pa.is_returned = FALSE
                LEFT JOIN employees emp ON pa.employee_id = emp.employee_id
                LEFT JOIN users emp_user ON emp.user_id = emp_user.user_id
                LEFT JOIN departments dept ON emp.department_id = dept.department_id
                GROUP BY p.product_id
                ORDER BY p.asset_type, p.product_category, p.product_name
            `);
            
            res.render('admin/inventory', { 
                user: req.session.user, 
                products 
            });
        } catch (error) {
            console.error('Inventory error:', error);
            res.render('error', { message: 'Error loading inventory' });
        }
    });

    // Admin: History Route with Fallback
    router.get('/history', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            // Check if system_activity_log table exists
            const [tableExists] = await pool.execute(`
                SELECT COUNT(*) as count FROM information_schema.tables 
                WHERE table_schema = DATABASE() AND table_name = 'system_activity_log'
            `);
            
            if (tableExists[0].count === 0) {
                // Fallback to old history system - get both assignments and requests
                const [assignments] = await pool.execute(`
                    SELECT 'assignment' as type, pa.assigned_at as date, p.product_name, 
                           u1.full_name as employee_name, u2.full_name as monitor_name, 
                           pa.quantity, 'Assigned' as status
                    FROM product_assignments pa
                    JOIN products p ON pa.product_id = p.product_id
                    JOIN employees e ON pa.employee_id = e.employee_id
                    JOIN users u1 ON e.user_id = u1.user_id
                    JOIN users u2 ON pa.monitor_id = u2.user_id
                    ORDER BY pa.assigned_at DESC
                    LIMIT 25
                `);

                const [requests] = await pool.execute(`
                    SELECT 'request' as type, pr.request_date as date, p.product_name,
                           u1.full_name as employee_name, u2.full_name as monitor_name,
                           pr.quantity, pr.status
                    FROM product_requests pr
                    JOIN products p ON pr.product_id = p.product_id
                    JOIN employees e ON pr.employee_id = e.employee_id
                    JOIN users u1 ON e.user_id = u1.user_id
                    LEFT JOIN users u2 ON pr.monitor_id = u2.user_id
                    ORDER BY pr.request_date DESC
                    LIMIT 25
                `);

                // Combine and sort by date
                const history = [...assignments, ...requests].sort((a, b) => new Date(b.date) - new Date(a.date));
                
                return res.render('admin/history', { 
                    user: req.session.user, 
                    history,
                    currentPage: 1,
                    totalPages: 1,
                    totalRecords: history.length
                });
            }
            
            // Use unified system if table exists
            const page = parseInt(req.query.page) || 1;
            const limit = 50;
            const offset = (page - 1) * limit;
            
            const [countResult] = await pool.execute(`
                SELECT COUNT(*) as total FROM system_activity_log
                WHERE activity_type IS NOT NULL AND description IS NOT NULL
            `);
            
            const totalRecords = countResult[0].total;
            const totalPages = Math.ceil(totalRecords / limit);
            
            const [history] = await pool.execute(`
                SELECT 
                    sal.activity_type as type,
                    sal.created_at as date,
                    u1.full_name as employee_name,
                    u2.full_name as monitor_name,
                    p.product_name,
                    1 as quantity,
                    CASE 
                        WHEN sal.activity_type = 'assignment' THEN 'Assigned'
                        WHEN sal.activity_type = 'request' THEN 'Requested'
                        ELSE 'Unknown'
                    END as status
                FROM system_activity_log sal
                JOIN users u1 ON sal.user_id = u1.user_id
                LEFT JOIN users u2 ON sal.target_user_id = u2.user_id
                LEFT JOIN products p ON sal.product_id = p.product_id
                WHERE sal.activity_type IS NOT NULL AND sal.description IS NOT NULL
                ORDER BY sal.created_at DESC
                LIMIT ? OFFSET ?
            `, [limit, offset]);
            
            res.render('admin/history', { 
                user: req.session.user, 
                history,
                currentPage: page,
                totalPages,
                totalRecords
            });
        } catch (error) {
            console.error('History error:', error);
            // Render history page with empty data instead of error page
            res.render('admin/history', { 
                user: req.session.user, 
                history: [],
                currentPage: 1,
                totalPages: 1,
                totalRecords: 0,
                error: 'Unable to load history data. Please check database connection.'
            });
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


    // Admin: Account Route
    router.get('/account', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            const [adminDetails] = await pool.execute(`
                SELECT u.user_id, u.username, u.full_name, u.email, u.role, u.created_at,
                       COALESCE(e.is_active, 1) as is_active, 
                       COALESCE(d.department_name, 'Administration') as department_name
                FROM users u
                LEFT JOIN employees e ON u.user_id = e.user_id
                LEFT JOIN departments d ON e.department_id = d.department_id
                WHERE u.user_id = ?
            `, [req.session.user.user_id]);

            if (!adminDetails || adminDetails.length === 0) {
                req.flash('error', 'Admin details not found.');
                return res.redirect('/admin/dashboard');
            }

            res.render('admin/account', { 
                user: req.session.user, 
                admin: adminDetails[0],
                messages: req.flash()
            });
        } catch (error) {
            console.error('Account error:', error);
            res.render('error', { message: 'Error loading account details' });
        }
    });

    // Admin: Change Password Route
    router.post('/change-password', requireAuth, requireRole(['admin']), async (req, res) => {
        const { current_password, new_password, confirm_password } = req.body;
        
        try {
            // Validate input
            if (!current_password || !new_password || !confirm_password) {
                req.flash('error', 'All password fields are required');
                return res.redirect('/admin/account');
            }
            
            if (new_password !== confirm_password) {
                req.flash('error', 'New password and confirmation do not match');
                return res.redirect('/admin/account');
            }
            
            if (new_password.length < 6) {
                req.flash('error', 'New password must be at least 6 characters long');
                return res.redirect('/admin/account');
            }
            
            // Get current user details
            const [users] = await pool.execute(
                'SELECT password FROM users WHERE user_id = ?',
                [req.session.user.user_id]
            );
            
            if (users.length === 0) {
                req.flash('error', 'User not found');
                return res.redirect('/admin/account');
            }
            
            // Verify current password
            const bcrypt = require('bcryptjs');
            const isValidPassword = await bcrypt.compare(current_password, users[0].password);
            
            if (!isValidPassword) {
                req.flash('error', 'Current password is incorrect');
                return res.redirect('/admin/account');
            }
            
            // Hash new password
            const hashedNewPassword = await bcrypt.hash(new_password, 10);
            
            // Update password in database
            await pool.execute(
                'UPDATE users SET password = ?, updated_at = NOW() WHERE user_id = ?',
                [hashedNewPassword, req.session.user.user_id]
            );
            
            req.flash('success', 'Password changed successfully');
            res.redirect('/admin/account');
            
        } catch (error) {
            console.error('Change password error:', error);
            req.flash('error', 'Error changing password. Please try again.');
            res.redirect('/admin/account');
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
                UNION ALL
                SELECT 'assignment' as type, pa.assigned_at as date, p.product_name,
                       u.full_name as employee_name, 
                       CASE WHEN pa.is_returned THEN 'returned' ELSE 'assigned' END as status,
                       pa.quantity
                FROM product_assignments pa
                JOIN products p ON pa.product_id = p.product_id
                JOIN employees e ON pa.employee_id = e.employee_id
                JOIN users u ON e.user_id = u.user_id
                UNION ALL
                SELECT 'registration' as type, rr.requested_at as date, 'User Registration' as product_name,
                       rr.full_name as employee_name, rr.status, 1 as quantity
                FROM registration_requests rr
                ORDER BY date DESC
                LIMIT 50
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
        const { full_name, username, email, password, department_id, role, end_date } = req.body;
        
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
                
                // Validate end date for monitor role
                if (role === 'monitor') {
                    if (!end_date) {
                        req.flash('error', 'End date is required for monitor role');
                        res.redirect('/admin/employees');
                        return;
                    }
                    
                    const endDate = new Date(end_date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    if (endDate <= today) {
                        req.flash('error', 'End date must be in the future');
                        res.redirect('/admin/employees');
                        return;
                    }
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
                
                // If monitor role, create monitor assignment with end date
                if (role === 'monitor') {
                    const [employee] = await connection.execute(
                        'SELECT employee_id FROM employees WHERE user_id = ?',
                        [userId]
                    );
                    
                    if (employee.length > 0) {
                        await connection.execute(`
                            INSERT INTO monitor_assignments (employee_id, assigned_by, start_date, end_date) 
                            VALUES (?, ?, CURDATE(), ?)
                        `, [employee[0].employee_id, req.session.user.user_id, end_date]);
                    }
                }
                
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
                    'SELECT is_active FROM users WHERE user_id = ?',
                    [employeeId]
                );
                
                if (employees.length === 0) {
                    req.flash('error', 'Employee not found');
                    res.redirect('/admin/employees');
                    return;
                }
                
                const currentStatus = employees[0].is_active;
                const newStatus = !currentStatus;
                
                // If deactivating, check for unreturned products
                if (!newStatus) {
                    const [assignments] = await connection.execute(`
                        SELECT COUNT(*) as count 
                        FROM product_assignments pa
                        JOIN employees e ON pa.employee_id = e.employee_id
                        WHERE e.user_id = ? AND pa.is_returned = FALSE
                    `, [employeeId]);
                    
                    if (assignments[0].count > 0) {
                        req.flash('error', `Cannot deactivate employee with ${assignments[0].count} unreturned product(s). Please check Employee Clearance page.`);
                        await connection.rollback();
                        res.redirect('/admin/employees');
                        return;
                    }
                }
                
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
        console.log('Bulk deactivate request received');
        console.log('Request body:', req.body);
        console.log('Content-Type:', req.get('Content-Type'));
        
        const { employee_ids } = req.body;
        
        console.log('Extracted employee_ids:', employee_ids);
        console.log('Type of employee_ids:', typeof employee_ids);
        console.log('Is array:', Array.isArray(employee_ids));
        
        if (!employee_ids || employee_ids.length === 0) {
            const message = 'No employees selected';
            console.log('Error: No employee_ids found');
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(400).json({ error: message });
            }
            req.flash('error', message);
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
                const successMessage = `${employeeIdArray.length} employee(s) deactivated successfully`;
                
                if (req.headers.accept && req.headers.accept.includes('application/json')) {
                    return res.json({ success: true, message: successMessage });
                }
                req.flash('success', successMessage);
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
        } catch (error) {
            console.error('Bulk deactivate error:', error);
            const errorMessage = 'Error deactivating employees';
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(500).json({ error: errorMessage });
            }
            req.flash('error', errorMessage);
        }
        
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.json({ success: true });
        }
        res.redirect('/admin/employees');
    });

    // Admin: Bulk Activate Employees Route
    router.post('/bulk-activate-employees', requireAuth, requireRole(['admin']), async (req, res) => {
        console.log('Bulk activate request received');
        console.log('Request body:', req.body);
        console.log('Content-Type:', req.get('Content-Type'));
        
        const { employee_ids } = req.body;
        
        console.log('Extracted employee_ids:', employee_ids);
        console.log('Type of employee_ids:', typeof employee_ids);
        console.log('Is array:', Array.isArray(employee_ids));
        
        if (!employee_ids || employee_ids.length === 0) {
            const message = 'No employees selected';
            console.log('Error: No employee_ids found');
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(400).json({ error: message });
            }
            req.flash('error', message);
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
                const successMessage = `${employeeIdArray.length} employee(s) activated successfully`;
                
                if (req.headers.accept && req.headers.accept.includes('application/json')) {
                    return res.json({ success: true, message: successMessage });
                }
                req.flash('success', successMessage);
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
        } catch (error) {
            console.error('Bulk activate error:', error);
            const errorMessage = 'Error activating employees';
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(500).json({ error: errorMessage });
            }
            req.flash('error', errorMessage);
        }
        
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.json({ success: true });
        }
        res.redirect('/admin/employees');
    });

    // Admin: Employee Clearance Route
    router.get('/clearance', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            const { employee_id } = req.query;
            
            // Get all employees
            const [employees] = await pool.execute(`
                SELECT u.user_id, u.full_name, u.username, u.is_active, d.department_name
                FROM users u
                JOIN employees e ON u.user_id = e.user_id
                JOIN departments d ON e.department_id = d.department_id
                WHERE u.role IN ('employee', 'monitor')
                ORDER BY u.full_name
            `);
            
            let selectedEmployee = null;
            let assignments = [];
            let clearanceStatus = {
                totalAssigned: 0,
                totalReturned: 0,
                pendingReturns: 0,
                clearancePercentage: 0,
                canDeactivate: false
            };
            
            if (employee_id) {
                // Get selected employee details
                const [empDetails] = await pool.execute(`
                    SELECT u.user_id, u.full_name, u.username, u.is_active, d.department_name
                    FROM users u
                    JOIN employees e ON u.user_id = e.user_id
                    JOIN departments d ON e.department_id = d.department_id
                    WHERE u.user_id = ?
                `, [employee_id]);
                
                if (empDetails.length > 0) {
                    selectedEmployee = empDetails[0];
                    
                    // Get all product assignments for this employee
                    const [assignmentData] = await pool.execute(`
                        SELECT pa.*, p.product_name, u.full_name as monitor_name
                        FROM product_assignments pa
                        JOIN products p ON pa.product_id = p.product_id
                        JOIN users u ON pa.monitor_id = u.user_id
                        JOIN employees e ON pa.employee_id = e.employee_id
                        WHERE e.user_id = ?
                        ORDER BY pa.assigned_at DESC
                    `, [employee_id]);
                    
                    assignments = assignmentData;
                    
                    // Calculate clearance status
                    clearanceStatus.totalAssigned = assignments.length;
                    clearanceStatus.totalReturned = assignments.filter(a => a.is_returned).length;
                    clearanceStatus.pendingReturns = clearanceStatus.totalAssigned - clearanceStatus.totalReturned;
                    clearanceStatus.clearancePercentage = clearanceStatus.totalAssigned > 0 
                        ? Math.round((clearanceStatus.totalReturned / clearanceStatus.totalAssigned) * 100) 
                        : 100;
                    clearanceStatus.canDeactivate = clearanceStatus.pendingReturns === 0;
                }
            }
            
            res.render('admin/clearance', {
                user: req.session.user,
                employees,
                selectedEmployee,
                assignments,
                clearanceStatus
            });
        } catch (error) {
            console.error('Clearance page error:', error);
            req.flash('error', 'Error loading clearance page');
            res.redirect('/admin/employees');
        }
    });

    // Admin: Process Return Request Route (same as monitor)
    router.post('/process-return', requireAuth, requireRole(['admin']), async (req, res) => {
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
            
            res.redirect('/monitor/approvals'); // Redirect to monitor approvals since admin uses same page
        } catch (error) {
            console.error('Admin process return error:', error);
            req.flash('error', 'Error processing return request');
            res.redirect('/monitor/approvals');
        }
    });

    return router;
};