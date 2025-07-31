const express = require('express');
const session = require('express-session');
const flash = require('express-flash');
const MySQLStore = require('express-mysql-session')(session);
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
const PORT = process.env.PORT || 3002;

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'product_management_system',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// For Cloud SQL Unix socket connection in App Engine
if (process.env.DB_HOST && process.env.DB_HOST.startsWith('/cloudsql/')) {
    dbConfig.socketPath = process.env.DB_HOST;
    delete dbConfig.host; // Remove host when using socketPath
}

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Make pool available to middleware
app.locals.pool = pool;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use('/images', express.static('images'));

// Session store configuration
const sessionStore = new MySQLStore({
    clearExpired: true,
    checkExpirationInterval: 900000, // 15 minutes
    expiration: 86400000, // 24 hours
    createDatabaseTable: true,
    schema: {
        tableName: 'sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    }
}, pool);

app.use(session({
    name: 'pms.sid', // A more specific session ID name
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production-very-long-and-secure',
    store: sessionStore,
    resave: true, // Force session save on each request
    saveUninitialized: false,
    rolling: false, // Don't reset expiration on each request
    cookie: { 
        secure: false, // Set to false for HTTP (true only for HTTPS)
        httpOnly: true, // Prevent client-side JS from accessing the cookie
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        sameSite: 'lax' // Help with session persistence across redirects
    }
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

// Setup endpoint for initializing database
app.get('/setup-database', async (req, res) => {
    try {
        console.log('🔧 Starting database setup...');
        
        // Check if tables exist
        const [tables] = await pool.execute("SHOW TABLES");
        const tableNames = tables.map(row => Object.values(row)[0]);
        console.log('📋 Existing tables:', tableNames);
        
        // If main tables don't exist, create them
        const hasUsersTable = tableNames.includes('users');
        if (!hasUsersTable) {
            console.log('📝 Creating database schema...');
            
            // Drop existing tables in correct order to handle foreign key constraints
            console.log('🗑️ Dropping existing tables...');
            const dropTables = [
                'product_assignments',
                'product_requests', 
                'stock_history',
                'registration_requests',
                'admin_assignments',
                'monitor_assignments',
                'employees',
                'products',
                'departments',
                'users'
            ];
            
            for (const table of dropTables) {
                try {
                    await pool.execute(`DROP TABLE IF EXISTS ${table}`);
                } catch (error) {
                    console.log(`Note: Could not drop table ${table} (may not exist)`);
                }
            }
            
            // Create users table
            await pool.execute(`
                CREATE TABLE users (
                    user_id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    full_name VARCHAR(100) NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    role ENUM('employee', 'monitor', 'admin') NOT NULL DEFAULT 'employee',
                    is_super_admin BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE
                )
            `);
            
            // Create departments table
            await pool.execute(`
                CREATE TABLE departments (
                    department_id INT AUTO_INCREMENT PRIMARY KEY,
                    department_name VARCHAR(100) NOT NULL,
                    description TEXT
                )
            `);
            
            // Create employees table
            await pool.execute(`
                CREATE TABLE employees (
                    employee_id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT UNIQUE NOT NULL,
                    department_id INT NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE,
                    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                    FOREIGN KEY (department_id) REFERENCES departments(department_id)
                )
            `);
            
            // Create monitor_assignments table
            await pool.execute(`
                CREATE TABLE monitor_assignments (
                    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    assigned_by INT NOT NULL,
                    start_date DATETIME NOT NULL,
                    end_date DATETIME NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE,
                    FOREIGN KEY (user_id) REFERENCES users(user_id),
                    FOREIGN KEY (assigned_by) REFERENCES users(user_id)
                )
            `);
            
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

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Product Management System started successfully!`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;