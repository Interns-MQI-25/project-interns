const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Common routes module (auth, dashboard, etc.)
module.exports = (pool, requireAuth, requireRole) => {

    // Home Route
    router.get('/', (req, res) => {
        if (req.session.user) {
            res.redirect('/dashboard');
        } else {
            res.redirect('/login');
        }
    });

    // Authentication routes
    router.get('/login', (req, res) => {
        res.render('auth/login', { messages: req.flash() });
    });

    // Forgot Password routes
    router.get('/auth/forgot-password', (req, res) => {
        res.render('auth/forgot-password', { messages: req.flash(), user: req.session.user || null });
    });

    // Change Password page route
    router.get('/auth/change-password', requireAuth, (req, res) => {
        res.render('auth/forgot-password', { messages: req.flash(), user: req.session.user || null });
    });

    router.post('/auth/forgot-password', async (req, res) => {
        const { email } = req.body;

        if (!email) {
            req.flash('error', 'Email is required.');
            return res.redirect('/auth/forgot-password');
        }

        try {
            // Check if user exists with the email
            const [users] = await pool.execute(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );

            if (users.length === 0) {
                req.flash('error', 'No account found with that email.');
                return res.redirect('/auth/forgot-password');
            }

            // TODO: Implement sending password reset email with token
            // For now, just flash success message
            req.flash('success', 'If an account with that email exists, a password reset link has been sent.');
            res.redirect('/login');
        } catch (error) {
            console.error('Forgot password error:', error);
            req.flash('error', 'An error occurred while processing your request.');
            res.redirect('/auth/forgot-password');
        }
    });

    // Change Password routes
    router.post('/auth/change-password', requireAuth, async (req, res) => {
        const { current_password, new_password, confirm_new_password } = req.body;

        if (!current_password || !new_password || !confirm_new_password) {
            req.flash('error', 'All password fields are required.');
            return res.redirect('/auth/forgot-password');
        }

        if (new_password !== confirm_new_password) {
            req.flash('error', 'New password and confirmation do not match.');
            return res.redirect('/auth/forgot-password');
        }

        try {
            // Get user from session
            const userId = req.session.user.user_id;

            // Fetch current password hash from DB
            const [users] = await pool.execute(
                'SELECT password FROM users WHERE user_id = ?',
                [userId]
            );

            if (users.length === 0) {
                req.flash('error', 'User not found.');
                return res.redirect('/auth/forgot-password');
            }

            const user = users[0];

            // Verify current password
            const isMatch = await bcrypt.compare(current_password, user.password);
            if (!isMatch) {
                req.flash('error', 'Current password is incorrect.');
                return res.redirect('/auth/forgot-password');
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(new_password, 10);

            // Update password in DB
            await pool.execute(
                'UPDATE users SET password = ? WHERE user_id = ?',
                [hashedPassword, userId]
            );

            req.flash('success', 'Password changed successfully.');
            res.redirect('/employee/account');
        } catch (error) {
            console.error('Change password error:', error);
            req.flash('error', 'An error occurred while changing password.');
            res.redirect('/auth/forgot-password');
        }
    });

    router.post('/login', async (req, res) => {
        const { username, password } = req.body;
        
        console.log('🔐 Login attempt for username:', username);
        
        try {
            const [users] = await pool.execute(
                'SELECT u.*, e.department_id FROM users u LEFT JOIN employees e ON u.user_id = e.user_id WHERE username = ? AND u.is_active = TRUE',
                [username]
            );
            
            console.log('👤 Users found:', users.length);
            
            if (users.length === 0) {
                console.log('❌ No user found or user inactive');
                req.flash('error', 'Invalid username or password');
                return res.redirect('/login');
            }
            
            const user = users[0];
            console.log('🔐 Starting password verification for user:', user.user_id);
            const startTime = Date.now();
            const isValid = await bcrypt.compare(password, user.password);
            const endTime = Date.now();
            console.log(`⏱️ Password verification took: ${endTime - startTime}ms, Result: ${isValid}`);
            
            if (!isValid) {
                console.log('❌ Password verification failed');
                req.flash('error', 'Invalid username or password');
                return res.redirect('/login');
            }
            
            console.log('✅ Login successful, creating session...');
            
            req.session.user = {
                user_id: user.user_id,
                username: user.username,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                is_super_admin: user.is_super_admin || false,
                department_id: user.department_id
            };
            
            console.log('📝 Session user object created:', req.session.user);
            
            // Save session explicitly
            req.session.save((err) => {
                if (err) {
                    console.error('❌ Session save error:', err);
                    req.flash('error', 'Login failed. Please try again.');
                    return res.redirect('/login');
                }
                
                console.log('✅ Session saved successfully, redirecting to dashboard...');
                res.redirect('/dashboard');
            });
            
        } catch (error) {
            console.error('❌ Login error:', error);
            req.flash('error', 'An error occurred during login');
            res.redirect('/login');
        }
    });

    router.get('/register', (req, res) => {
        res.render('auth/register', { messages: req.flash() });
    });

    router.post('/register', async (req, res) => {
        const { full_name, username, email, password, department_id } = req.body;
        
        try {
            // Check if username or email already exists
            const [existingUsers] = await pool.execute(
                'SELECT * FROM users WHERE username = ? OR email = ?',
                [username, email]
            );
            
            if (existingUsers.length > 0) {
                req.flash('error', 'Username or email already exists');
                return res.redirect('/register');
            }
            
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Insert registration request
            await pool.execute(
                'INSERT INTO registration_requests (full_name, username, email, password, department_id) VALUES (?, ?, ?, ?, ?)',
                [full_name, username, email, hashedPassword, department_id]
            );
            
            req.flash('success', 'Registration request submitted. Please wait for admin approval.');
            res.redirect('/login');
        } catch (error) {
            console.error('Registration error:', error);
            req.flash('error', 'An error occurred during registration');
            res.redirect('/register');
        }
    });

    router.get('/logout', (req, res) => {
        req.session.destroy();
        res.redirect('/login');
    });

    // Dashboard Route
    router.get('/dashboard', requireAuth, async (req, res) => {
        try {
            const role = req.session.user.role;

            if (role === 'employee') {
                // Fetch recent approved product requests for the employee
                const [recentRequests] = await pool.execute(`
                    SELECT pr.request_id, p.product_name, pr.quantity, pr.status, pr.requested_at
                    FROM product_requests pr
                    JOIN products p ON pr.product_id = p.product_id
                    JOIN employees e ON pr.employee_id = e.employee_id
                    WHERE e.user_id = ? AND pr.status IN ('approved', 'rejected', 'pending')
                    ORDER BY pr.requested_at DESC
                    LIMIT 5
                `, [req.session.user.user_id]);

                // Fetch recent activity for employee
                const [recentActivity] = await pool.execute(`
                    SELECT 'assignment' as action, pa.assigned_at as performed_at, p.product_name,
                           u.full_name as performed_by_name, pa.quantity, 'Product assigned to you' as notes
                    FROM product_assignments pa
                    JOIN products p ON pa.product_id = p.product_id
                    JOIN employees e ON pa.employee_id = e.employee_id
                    JOIN users u ON pa.monitor_id = u.user_id
                    WHERE e.user_id = ? AND pa.assigned_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                    ORDER BY pa.assigned_at DESC
                    LIMIT 5
                `, [req.session.user.user_id]);
                
                res.render('employee/dashboard', { user: req.session.user, recentRequests, recentActivity });
            } else if (role === 'monitor') {
                // Fetch statistics for monitor
                const [pendingRequests] = await pool.execute(
                    'SELECT COUNT(*) as count FROM product_requests WHERE status = "pending"'
                );
                
                const [approvedToday] = await pool.execute(
                    'SELECT COUNT(*) as count FROM product_requests WHERE status = "approved" AND DATE(processed_at) = CURDATE()'
                );
                
                const [totalProducts] = await pool.execute(
                    'SELECT COUNT(*) as count FROM products'
                );
                
                // Fetch recent activity for monitor
                const [recentActivity] = await pool.execute(`
                    SELECT sh.action, sh.performed_at, p.product_name,
                           u.full_name as performed_by_name, sh.quantity, sh.notes
                    FROM stock_history sh
                    JOIN products p ON sh.product_id = p.product_id
                    JOIN users u ON sh.performed_by = u.user_id
                    WHERE sh.performed_by = ? AND sh.performed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                    ORDER BY sh.performed_at DESC
                    LIMIT 5
                `, [req.session.user.user_id]);
                
                const monitorStats = {
                    pendingRequests: pendingRequests[0].count,
                    approvedToday: approvedToday[0].count,
                    totalProducts: totalProducts[0].count
                };
                
                res.render('monitor/dashboard', { 
                    user: req.session.user, 
                    recentActivity,
                    stats: monitorStats
                });
            } else if (role === 'admin') {
                // Fetch dashboard statistics for admin
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
                
                const dashboardStats = {
                    totalEmployees: totalEmployees[0].count,
                    activeMonitors: activeMonitors[0].count,
                    pendingRegistrations: pendingRegistrations[0].count,
                    totalProducts: totalProducts[0].count
                };
                
                res.render('admin/dashboard', { 
                    user: req.session.user, 
                    stats: dashboardStats,
                    recentActivity: recentActivity || [],
                    stockStats: stockStats || []
                });
            }
        } catch (error) {
            console.error('Dashboard error:', error);
            res.render('error', { message: 'Error loading dashboard' });
        }
    });

    // API endpoint for stock search/filter
    router.get('/api/stock/search', requireAuth, async (req, res) => {
        try {
            const { asset_type, search, available_only } = req.query;
            
            let query = `
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
                    COALESCE(calibration_required, FALSE) as calibration_required
                FROM products 
                WHERE 1=1
            `;
            
            const params = [];
            
            if (available_only === 'true') {
                query += ' AND is_available = TRUE AND quantity > 0';
            }
            
            if (asset_type && asset_type !== '') {
                query += ' AND asset_type = ?';
                params.push(asset_type);
            }
            
            if (search && search !== '') {
                query += ' AND (product_name LIKE ? OR product_category LIKE ? OR model_number LIKE ?)';
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }
            
            query += ' ORDER BY asset_type, product_category, product_name';
            
            const [products] = await pool.execute(query, params);
            res.json(products || []);
        } catch (error) {
            console.error('Stock search error:', error);
            res.status(500).json({ error: 'Failed to search products' });
        }
    });

    // API endpoint for live counts for sidebar notifications
    router.get('/api/live-counts', requireAuth, async (req, res) => {
        try {
            let pendingRequests = 0;
            let pendingRegistrations = 0;

            // For monitors and admins, get pending product requests
            if (req.session.user.role === 'monitor' || req.session.user.role === 'admin') {
                const [requests] = await pool.execute(
                    'SELECT COUNT(*) as count FROM product_requests WHERE status = "pending"'
                );
                pendingRequests = requests[0].count;
            }

            // For admins, get pending registration requests
            if (req.session.user.role === 'admin') {
                const [registrations] = await pool.execute(
                    'SELECT COUNT(*) as count FROM registration_requests WHERE status = "pending"'
                );
                pendingRegistrations = registrations[0].count;
            }

            res.json({
                pendingRequests,
                pendingRegistrations
            });
        } catch (error) {
            console.error('Error fetching live counts:', error);
            res.status(500).json({ error: 'Failed to fetch live counts' });
        }
    });

    return router;
};
