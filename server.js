const express = require('express');
const session = require('express-session');
const flash = require('express-flash');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

// Import middleware
const { requireAuth, requireRole } = require('./src/middleware/auth');

// Import route modules
const commonRoutes = require('./src/routes/commonRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const employeeRoutes = require('./src/routes/employeeRoutes');
const monitorRoutes = require('./src/routes/monitorRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'product_management_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Make pool available to middleware
app.locals.pool = pool;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));
app.use(flash());

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// Use route modules
app.use('/', commonRoutes(pool, requireAuth, requireRole));
app.use('/admin', adminRoutes(pool, requireAuth, requireRole));
app.use('/employee', employeeRoutes(pool, requireAuth, requireRole));
app.use('/monitor', monitorRoutes(pool, requireAuth, requireRole));



// Routes
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// Authentication routes
app.get('/login', (req, res) => {
    res.render('auth/login', { messages: req.flash() });
});

// Forgot Password routes
app.get('/auth/forgot-password', (req, res) => {
    res.render('auth/forgot-password', { messages: req.flash(), user: req.session.user || null });
});

// Change Password page route
app.get('/auth/change-password', requireAuth, (req, res) => {
    res.render('auth/forgot-password', { messages: req.flash(), user: req.session.user || null });
});

app.post('/auth/forgot-password', async (req, res) => {
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
app.post('/auth/change-password', requireAuth, async (req, res) => {
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

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const [users] = await pool.execute(
            'SELECT u.*, e.department_id FROM users u LEFT JOIN employees e ON u.user_id = e.user_id WHERE username = ?',
            [username]
        );
        
        if (users.length === 0) {
            req.flash('error', 'Invalid username or password');
            return res.redirect('/login');
        }
        
        const user = users[0];
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            req.flash('error', 'Invalid username or password');
            return res.redirect('/login');
        }
        
        req.session.user = {
            user_id: user.user_id,
            username: user.username,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            department_id: user.department_id
        };
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Login error:', error);
        req.flash('error', 'An error occurred during login');
        res.redirect('/login');
    }
});

app.get('/register', (req, res) => {
    res.render('auth/register', { messages: req.flash() });
});

app.post('/register', async (req, res) => {
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

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/dashboard', requireAuth, async (req, res) => {
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
            
            res.render('monitor/dashboard', { user: req.session.user, recentActivity });
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

app.post('/employee/return-product', requireAuth, requireRole(['employee']), async (req, res) => {
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

app.get('/employee/records', requireAuth, requireRole(['employee']), async (req, res) => {
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

app.get('/employee/account', requireAuth, requireRole(['employee']), async (req, res) => {
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

app.get('/employee/requests', requireAuth, requireRole(['employee']), async (req, res) => {
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

app.post('/employee/request-product', requireAuth, requireRole(['employee']), async (req, res) => {
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

// Fixed Employee Stock Route
app.get('/employee/stock', requireAuth, requireRole('employee'), async (req, res) => {
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

// Monitor routes
app.get('/monitor/approvals', requireAuth, requireRole(['monitor']), async (req, res) => {
    try {
        const [requests] = await pool.execute(`
            SELECT pr.*, p.product_name, u.full_name as employee_name, d.department_name
            FROM product_requests pr
            JOIN products p ON pr.product_id = p.product_id
            JOIN employees e ON pr.employee_id = e.employee_id
            JOIN users u ON e.user_id = u.user_id
            JOIN departments d ON e.department_id = d.department_id
            WHERE pr.status = 'pending'
            ORDER BY pr.requested_at ASC
        `);
        
        res.render('monitor/approvals', { user: req.session.user, requests });
    } catch (error) {
        console.error('Approvals error:', error);
        res.render('error', { message: 'Error loading approvals' });
    }
});

app.post('/monitor/process-request', requireAuth, requireRole(['monitor']), async (req, res) => {
    const { request_id, action } = req.body;
    
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Update request status
            await connection.execute(
                'UPDATE product_requests SET status = ?, processed_by = ?, processed_at = NOW() WHERE request_id = ?',
                [action, req.session.user.user_id, request_id]
            );
            
            if (action === 'approved') {
                // Get request details
                const [requestDetails] = await connection.execute(`
                    SELECT pr.*, e.employee_id 
                    FROM product_requests pr 
                    JOIN employees e ON pr.employee_id = e.employee_id 
                    WHERE pr.request_id = ?
                `, [request_id]);
                
                const request = requestDetails[0];
                
                // Create product assignment
                await connection.execute(
                    'INSERT INTO product_assignments (product_id, employee_id, monitor_id, quantity) VALUES (?, ?, ?, ?)',
                    [request.product_id, request.employee_id, req.session.user.user_id, request.quantity]
                );
                
                // Update product quantity
                await connection.execute(
                    'UPDATE products SET quantity = quantity - ? WHERE product_id = ?',
                    [request.quantity, request.product_id]
                );
                
                // Add to stock history
                await connection.execute(
                    'INSERT INTO stock_history (product_id, action, quantity, performed_by, notes) VALUES (?, ?, ?, ?, ?)',
                    [request.product_id, 'assign', request.quantity, req.session.user.user_id, `Assigned to employee ID: ${request.employee_id}`]
                );
            }
            
            await connection.commit();
            req.flash('success', `Request ${action} successfully`);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        
        res.redirect('/monitor/approvals');
    } catch (error) {
        console.error('Process request error:', error);
        req.flash('error', 'Error processing request');
        res.redirect('/monitor/approvals');
    }
});

app.get('/monitor/inventory', requireAuth, requireRole(['monitor']), async (req, res) => {
    try {
        const [products] = await pool.execute('SELECT * FROM products ORDER BY product_name');
        res.render('monitor/inventory', { user: req.session.user, products: products || [] });
    } catch (error) {
        console.error('Inventory error:', error);
        res.render('error', { message: 'Error loading inventory' });
    }
});

app.get('/monitor/records', requireAuth, requireRole(['monitor']), async (req, res) => {
    try {
        // Simple query to get basic data
        let assignments = [];
        let totalProducts = 0;
        let activeAssignments = 0;
        let pendingRequests = 0;
        let returnedItems = 0;
        
        try {
            const [productCount] = await pool.execute('SELECT COUNT(*) as count FROM products');
            totalProducts = productCount[0]?.count || 0;
        } catch (e) { console.log('Product count error:', e.message); }
        
        try {
            const [pendingCount] = await pool.execute('SELECT COUNT(*) as count FROM product_requests WHERE status = "pending"');
            pendingRequests = pendingCount[0]?.count || 0;
        } catch (e) { console.log('Pending requests error:', e.message); }
        
        try {
            const [assignmentData] = await pool.execute(`
                SELECT 
                    'Sample Product' as product_name,
                    'Hardware' as asset_type,
                    'John Doe' as employee_name,
                    1 as quantity,
                    NOW() as assigned_at,
                    FALSE as is_returned
                LIMIT 1
            `);
            assignments = assignmentData || [];
        } catch (e) { 
            console.log('Assignments error:', e.message);
            assignments = [];
        }
        
        res.render('monitor/records', {
            user: req.session.user,
            assignments,
            totalProducts,
            activeAssignments,
            pendingRequests,
            returnedItems
        });
    } catch (error) {
        console.error('Monitor records error:', error);
        res.render('monitor/records', {
            user: req.session.user,
            assignments: [],
            totalProducts: 0,
            activeAssignments: 0,
            pendingRequests: 0,
            returnedItems: 0
        });
    }
});

// Fixed Monitor Stock Route
app.get('/monitor/stock', requireAuth, requireRole(['monitor']), async (req, res) => {
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

// API endpoint for real-time dashboard stats and activity
app.get('/api/admin/dashboard-stats', requireAuth, requireRole(['admin']), async (req, res) => {
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

// Admin routes
app.get('/admin/employees', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
        const [employees] = await pool.execute(`
            SELECT u.*, e.employee_id, d.department_name, e.is_active as employee_active
            FROM users u
            LEFT JOIN employees e ON u.user_id = e.user_id
            LEFT JOIN departments d ON e.department_id = d.department_id
            WHERE u.role IN ('employee', 'monitor')
            ORDER BY u.is_active DESC, u.full_name
        `);
        
        const [departments] = await pool.execute('SELECT * FROM departments');
        
        res.render('admin/employees', { user: req.session.user, employees, departments });
    } catch (error) {
        console.error('Employees error:', error);
        res.render('error', { message: 'Error loading employees' });
    }
});

app.get('/admin/monitors', requireAuth, requireRole(['admin']), async (req, res) => {
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

app.get('/admin/stock', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
        const [products] = await pool.execute('SELECT * FROM products ORDER BY product_name');
        res.render('admin/stock', { user: req.session.user, products });
    } catch (error) {
        console.error('Stock error:', error);
        res.render('error', { message: 'Error loading stock' });
    }
});

app.get('/admin/history', requireAuth, requireRole(['admin']), async (req, res) => {
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

// Admin: Assign Monitor Route
app.post('/admin/assign-monitor', requireAuth, requireRole(['admin']), async (req, res) => {
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
app.post('/admin/unassign-monitor', requireAuth, requireRole(['admin']), async (req, res) => {
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

// Add Product Route (for Monitor/Admin)
app.post('/add-product', requireAuth, requireRole(['monitor', 'admin']), async (req, res) => {
    try {
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
            calibration_notes
        } = req.body;

        await pool.execute(`
            INSERT INTO products (
                product_name, asset_type, product_category, model_number, serial_number, quantity, added_by,
                calibration_required, calibration_frequency, calibration_due_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            name,
            type || 'General',
            product_category,
            model,
            serial,
            1,
            req.session.user.user_id,
            requires_calibration === 'on' ? 1 : 0,
            calibration_frequency_months ? `${calibration_frequency_months} Months` : null,
            last_calibration_date || null
        ]);

        req.flash('success', 'Product added successfully!');
        res.redirect('/monitor/inventory');
    } catch (error) {
        console.error('Add product error:', error);
        req.flash('error', 'Error adding product');
        res.redirect('/monitor/inventory');
    }
});

app.post('/monitor/add-product', requireAuth, requireRole(['monitor', 'admin']), async (req, res) => {
    try {
        const {
            product_name,
            asset_type,
            product_category,
            model_number,
            serial_number,
            quantity,
            calibration_required,
            calibration_frequency,
            calibration_due_date,
            version_number,
            software_license_type,
            license_expiry,
            renewal_frequency,
            next_renewal_date,
            pr_no,
            po_number,
            inward_date,
            inwarded_by
        } = req.body;

        await pool.execute(`
            INSERT INTO products (
                product_name, asset_type, product_category, model_number, serial_number, quantity, added_by,
                calibration_required, calibration_frequency, calibration_due_date,
                version_number, software_license_type, license_expiry, renewal_frequency, next_renewal_date,
                pr_no, po_number, inward_date, inwarded_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            product_name,
            asset_type,
            product_category,
            model_number,
            serial_number,
            quantity || 1,
            req.session.user.user_id,
            calibration_required === 'on' ? 1 : 0,
            calibration_frequency || null,
            calibration_due_date || null,
            version_number || null,
            software_license_type || null,
            license_expiry || null,
            renewal_frequency || null,
            next_renewal_date || null,
            pr_no || null,
            po_number || null,
            inward_date || null,
            inwarded_by || null
        ]);

        req.flash('success', 'Product added successfully!');
        res.redirect('/monitor/inventory');
    } catch (error) {
        console.error('Add product error:', error);
        req.flash('error', 'Error adding product');
        res.redirect('/monitor/inventory');
    }
});

// Admin: Registration Requests Route
app.get('/admin/registration-requests', requireAuth, requireRole(['admin']), async (req, res) => {
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
            'SELECT * FROM departments ORDER BY department_name'
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

// Admin: Process Registration Request Route
app.post('/admin/process-registration', requireAuth, requireRole(['admin']), async (req, res) => {
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
                    INSERT INTO employees (user_id, department_id) 
                    VALUES (?, ?)
                `, [userId, request.department_id]);
                
                // Update request status
                await connection.execute(`
                    UPDATE registration_requests 
                    SET status = 'approved', processed_by = ?, processed_at = NOW() 
                    WHERE request_id = ?
                `, [req.session.user.user_id, request_id]);
                
                req.flash('success', `Registration approved for ${request.full_name}`);
            } else if (action === 'reject') {
                // Update request status to rejected
                await connection.execute(`
                    UPDATE registration_requests 
                    SET status = 'rejected', processed_by = ?, processed_at = NOW() 
                    WHERE request_id = ?
                `, [req.session.user.user_id, request_id]);
                
                req.flash('success', `Registration rejected for ${request.full_name}`);
            }
            
            await connection.commit();
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
app.post('/admin/create-employee', requireAuth, requireRole(['admin']), async (req, res) => {
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
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Create user account
            const [userResult] = await connection.execute(`
                INSERT INTO users (username, full_name, email, password, role) 
                VALUES (?, ?, ?, ?, ?)
            `, [username, full_name, email, hashedPassword, role || 'employee']);
            
            const userId = userResult.insertId;
            
            // Create employee record if role is employee or monitor
            if (role === 'employee' || role === 'monitor' || !role) {
                await connection.execute(`
                    INSERT INTO employees (user_id, department_id) 
                    VALUES (?, ?)
                `, [userId, department_id]);
            }
            
            await connection.commit();
            req.flash('success', `${role || 'Employee'} created successfully: ${full_name}`);
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

// Admin: Update Employee Route
app.post('/admin/update-employee/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    const employeeId = req.params.id;
    const { full_name, email, department_id, is_active, role } = req.body;
    
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Update user information
            await connection.execute(`
                UPDATE users 
                SET full_name = ?, email = ?, role = ?
                WHERE user_id = ?
            `, [full_name, email, role, employeeId]);
            
            // Update employee information if exists
            await connection.execute(`
                UPDATE employees 
                SET department_id = ?, is_active = ?
                WHERE user_id = ?
            `, [department_id, is_active === 'on' ? 1 : 0, employeeId]);
            
            await connection.commit();
            req.flash('success', 'Employee updated successfully');
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('Update employee error:', error);
        req.flash('error', 'Error updating employee');
    }
    
    res.redirect('/admin/employees');
});



// Test route to verify monitor routes are working
app.get('/test-monitor', (req, res) => {
    res.json({ message: 'Monitor routes are accessible', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).render('error', { 
        message: 'Internal server error',
        user: req.session.user || null 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', { 
        message: 'Page not found',
        user: req.session.user || null 
    });
});


// API endpoint for real-time stock data
app.get('/api/stock-data', requireAuth, async (req, res) => {
    try {
        const { asset_type, search } = req.query;
        
        let whereClause = 'WHERE 1=1';
        let params = [];
        
        if (asset_type) {
            whereClause += ' AND p.asset_type = ?';
            params.push(asset_type);
        }
        
        if (search) {
            whereClause += ' AND (p.product_name LIKE ? OR p.product_category LIKE ? OR p.model_number LIKE ? OR p.serial_number LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }
        
        const productsQuery = `
            SELECT 
                p.*,
                u.full_name as added_by_name,
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
            ${whereClause}
            ORDER BY p.asset_type, p.product_category, p.product_name
        `;
        
        const [products] = await pool.execute(productsQuery, params);
        
        // Get updated stock stats
        const stockStatsQuery = `
            SELECT 
                asset_type,
                COUNT(*) as total_items,
                SUM(quantity) as total_quantity,
                SUM(CASE WHEN is_available = TRUE THEN quantity ELSE 0 END) as available_quantity,
                SUM(CASE WHEN COALESCE(calibration_required, FALSE) = TRUE THEN 1 ELSE 0 END) as calibration_items,
                SUM(CASE WHEN calibration_due_date IS NOT NULL AND calibration_due_date < CURDATE() THEN 1 ELSE 0 END) as overdue_calibrations
            FROM products
            ${asset_type ? 'WHERE asset_type = ?' : ''}
            GROUP BY asset_type
        `;
        
        const [stockStats] = await pool.execute(stockStatsQuery, asset_type ? [asset_type] : []);
        
        res.json({
            products: products || [],
            stockStats: stockStats || [],
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('API stock data error:', error);
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Product Management System started successfully!`);
});

module.exports = app;