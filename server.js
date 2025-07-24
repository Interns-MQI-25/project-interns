const express = require('express');
const session = require('express-session');
const flash = require('express-flash');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

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

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        // Set headers to prevent caching of authenticated pages
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        next();
    } else {
        res.redirect('/login');
    }
};

// Middleware to check role
const requireRole = (roles) => {
    return (req, res, next) => {
        if (req.session.user && roles.includes(req.session.user.role)) {
            next();
        } else {
            res.status(403).render('error', { message: 'Access denied' });
        }
    };
};

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

            res.render('employee/dashboard', { user: req.session.user, recentRequests });
        } else if (role === 'monitor') {
            res.render('monitor/dashboard', { user: req.session.user });
        } else if (role === 'admin') {
            res.render('admin/dashboard', { user: req.session.user });
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
    const { product_id, quantity, purpose, return_date } = req.body;

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
            'INSERT INTO product_requests (employee_id, product_id, quantity, purpose, return_date) VALUES (?, ?, ?, ?, ?)',
            [employee[0].employee_id, product_id, qty, purpose, return_date || null]
        );

        req.flash('success', 'Product request submitted successfully');
        res.redirect('/employee/requests');
    } catch (error) {
        console.error('Request product error:', error);
        req.flash('error', `Error submitting request: ${error.message}`);
        res.redirect('/employee/requests');
    }
});

app.get('/employee/stock', requireAuth, requireRole(['employee']), async (req, res) => {
    try {
        const [products] = await pool.execute('SELECT * FROM products WHERE quantity > 0');
        res.render('employee/stock', { user: req.session.user, products });
    } catch (error) {
        console.error('Stock error:', error);
        res.render('error', { message: 'Error loading stock' });
    }
});

// Add missing route for departments in register
app.get('/api/departments', async (req, res) => {
    try {
        const [departments] = await pool.execute('SELECT * FROM departments ORDER BY department_name');
        res.json(departments);
    } catch (error) {
        console.error('Departments error:', error);
        res.status(500).json({ error: 'Error loading departments' });
    }
});

// Update register route to include departments
app.get('/register', async (req, res) => {
    try {
        const [departments] = await pool.execute('SELECT * FROM departments ORDER BY department_name');
        res.render('auth/register', { messages: req.flash(), departments });
    } catch (error) {
        console.error('Register page error:', error);
        res.render('error', { message: 'Error loading registration page' });
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
        res.render('monitor/inventory', { user: req.session.user, products });
    } catch (error) {
        console.error('Inventory error:', error);
        res.render('error', { message: 'Error loading inventory' });
    }
});

app.post('/monitor/add-product', requireAuth, requireRole(['monitor']), async (req, res) => {
    const { product_name, description, quantity } = req.body;
    
    try {
        await pool.execute(
            'INSERT INTO products (product_name, description, quantity, added_by) VALUES (?, ?, ?, ?)',
            [product_name, description, quantity, req.session.user.user_id]
        );
        
        // Add to stock history
        const [productResult] = await pool.execute(
            'SELECT product_id FROM products WHERE product_name = ? ORDER BY product_id DESC LIMIT 1',
            [product_name]
        );
        
        await pool.execute(
            'INSERT INTO stock_history (product_id, action, quantity, performed_by, notes) VALUES (?, ?, ?, ?, ?)',
            [productResult[0].product_id, 'add', quantity, req.session.user.user_id, 'Initial stock added']
        );
        
        req.flash('success', 'Product added successfully');
        res.redirect('/monitor/inventory');
    } catch (error) {
        console.error('Add product error:', error);
        req.flash('error', 'Error adding product');
        res.redirect('/monitor/inventory');
    }
});

app.get('/monitor/stock', requireAuth, requireRole(['monitor']), async (req, res) => {
    try {
        const [products] = await pool.execute('SELECT * FROM products ORDER BY product_name');
        res.render('employee/stock', { user: req.session.user, products });
    } catch (error) {
        console.error('Stock error:', error);
        res.render('error', { message: 'Error loading stock' });
    }
});

app.get('/monitor/records', requireAuth, requireRole(['monitor']), async (req, res) => {
    try {
        const [records] = await pool.execute(`
            SELECT pa.*, p.product_name, u.full_name as employee_name, d.department_name
            FROM product_assignments pa
            JOIN products p ON pa.product_id = p.product_id
            JOIN employees e ON pa.employee_id = e.employee_id
            JOIN users u ON e.user_id = u.user_id
            JOIN departments d ON e.department_id = d.department_id
            WHERE pa.monitor_id = ?
            ORDER BY pa.assigned_at DESC
        `, [req.session.user.user_id]);
        
        res.render('monitor/records', { user: req.session.user, records });
    } catch (error) {
        console.error('Records error:', error);
        res.render('error', { message: 'Error loading records' });
    }
});

app.post('/admin/create-employee', requireAuth, requireRole(['admin']), async (req, res) => {
    const { full_name, username, email, password, department_id, role } = req.body;
    
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Create user
            const [userResult] = await connection.execute(
                'INSERT INTO users (username, full_name, email, password, role) VALUES (?, ?, ?, ?, ?)',
                [username, full_name, email, hashedPassword, role]
            );
            
            // Create employee record
            await connection.execute(
                'INSERT INTO employees (user_id, department_id) VALUES (?, ?)',
                [userResult.insertId, department_id]
            );
            
            await connection.commit();
            req.flash('success', 'Employee created successfully');
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        
        res.redirect('/admin/employees');
    } catch (error) {
        console.error('Create employee error:', error);
        req.flash('error', 'Error creating employee');
        res.redirect('/admin/employees');
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
        const [products] = await pool.execute(`
            SELECT p.*, u.full_name as added_by_name,
                   COUNT(pa.assignment_id) as total_assignments,
                   COALESCE(SUM(CASE WHEN pa.is_returned = 0 THEN pa.quantity ELSE 0 END), 0) as currently_assigned
            FROM products p
            LEFT JOIN users u ON p.added_by = u.user_id
            LEFT JOIN product_assignments pa ON p.product_id = pa.product_id
            GROUP BY p.product_id
            ORDER BY p.product_name
        `);
        
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

// Admin routes
app.get('/admin/employees', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
        const [employees] = await pool.execute(`
            SELECT u.*, e.employee_id, d.department_name, e.is_active
            FROM users u
            LEFT JOIN employees e ON u.user_id = e.user_id
            LEFT JOIN departments d ON e.department_id = d.department_id
            WHERE u.role IN ('employee', 'monitor')
            ORDER BY u.full_name
        `);
        
        const [departments] = await pool.execute('SELECT * FROM departments');
        
        res.render('admin/employees', { user: req.session.user, employees, departments });
    } catch (error) {
        console.error('Employees error:', error);
        res.render('error', { message: 'Error loading employees' });
    }
});

app.get('/admin/registration-requests', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
        const [requests] = await pool.execute(`
            SELECT rr.*, d.department_name
            FROM registration_requests rr
            JOIN departments d ON rr.department_id = d.department_id
            WHERE rr.status = 'pending'
            ORDER BY rr.requested_at ASC
        `);
        
        res.render('admin/registration-requests', { user: req.session.user, requests });
    } catch (error) {
        console.error('Registration requests error:', error);
        res.render('error', { message: 'Error loading registration requests' });
    }
});

app.post('/admin/process-registration', requireAuth, requireRole(['admin']), async (req, res) => {
    const { request_id, action } = req.body;
    
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            if (action === 'approve') {
                // Get request details
                const [requests] = await connection.execute(
                    'SELECT * FROM registration_requests WHERE request_id = ?',
                    [request_id]
                );
                
                const request = requests[0];
                
                // Create user
                const [userResult] = await connection.execute(
                    'INSERT INTO users (username, full_name, email, password, role) VALUES (?, ?, ?, ?, ?)',
                    [request.username, request.full_name, request.email, request.password, 'employee']
                );
                
                // Create employee record
                await connection.execute(
                    'INSERT INTO employees (user_id, department_id) VALUES (?, ?)',
                    [userResult.insertId, request.department_id]
                );
            }
            
            // Update request status
            await connection.execute(
                'UPDATE registration_requests SET status = ?, processed_by = ?, processed_at = NOW() WHERE request_id = ?',
                [action === 'approve' ? 'approved' : 'rejected', req.session.user.user_id, request_id]
            );
            
            await connection.commit();
            req.flash('success', `Registration ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        
        res.redirect('/admin/registration-requests');
    } catch (error) {
        console.error('Process registration error:', error);
        req.flash('error', 'Error processing registration');
        res.redirect('/admin/registration-requests');
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
