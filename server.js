const express = require('express');
const session = require('express-session');
const flash = require('express-flash');
const MySQLStore = require('express-mysql-session')(session);
const mysql = require('mysql2/promise');
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

// Test route to verify monitor routes are working
app.get('/test-monitor', (req, res) => {
    res.json({ message: 'Monitor routes are accessible', timestamp: new Date() });
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
            
            // Create admin_assignments table
            await pool.execute(`
                CREATE TABLE admin_assignments (
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
            
            // Create registration_requests table
            await pool.execute(`
                CREATE TABLE registration_requests (
                    request_id INT AUTO_INCREMENT PRIMARY KEY,
                    full_name VARCHAR(100) NOT NULL,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    department_id INT NOT NULL,
                    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    processed_by INT,
                    processed_at TIMESTAMP NULL,
                    FOREIGN KEY (department_id) REFERENCES departments(department_id),
                    FOREIGN KEY (processed_by) REFERENCES users(user_id)
                )
            `);
            
            // Create products table
            await pool.execute(`
                CREATE TABLE products (
                    product_id INT AUTO_INCREMENT PRIMARY KEY,
                    item_number INT,
                    asset_type VARCHAR(50) NOT NULL,
                    product_category VARCHAR(100) NOT NULL,
                    product_name VARCHAR(500) NOT NULL,
                    model_number VARCHAR(100),
                    serial_number VARCHAR(100),
                    is_available BOOLEAN DEFAULT TRUE,
                    quantity INT NOT NULL DEFAULT 1,
                    added_by INT NOT NULL,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    calibration_required BOOLEAN DEFAULT FALSE,
                    calibration_frequency VARCHAR(50),
                    calibration_due_date DATE,
                    FOREIGN KEY (added_by) REFERENCES users(user_id)
                )
            `);
            
            // Create stock_history table
            await pool.execute(`
                CREATE TABLE stock_history (
                    history_id INT AUTO_INCREMENT PRIMARY KEY,
                    product_id INT NOT NULL,
                    action ENUM('add', 'assign', 'return', 'update') NOT NULL,
                    quantity INT NOT NULL,
                    performed_by INT NOT NULL,
                    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    notes TEXT,
                    FOREIGN KEY (product_id) REFERENCES products(product_id),
                    FOREIGN KEY (performed_by) REFERENCES users(user_id)
                )
            `);
            
            // Create product_requests table
            await pool.execute(`
                CREATE TABLE product_requests (
                    request_id INT AUTO_INCREMENT PRIMARY KEY,
                    employee_id INT NOT NULL,
                    product_id INT NOT NULL,
                    quantity INT NOT NULL DEFAULT 1,
                    purpose TEXT NOT NULL,
                    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    processed_by INT,
                    processed_at TIMESTAMP NULL,
                    return_date TIMESTAMP NULL,
                    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
                    FOREIGN KEY (product_id) REFERENCES products(product_id),
                    FOREIGN KEY (processed_by) REFERENCES users(user_id)
                )
            `);
            
            // Create product_assignments table
            await pool.execute(`
                CREATE TABLE product_assignments (
                    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
                    product_id INT NOT NULL,
                    employee_id INT NOT NULL,
                    monitor_id INT NOT NULL,
                    quantity INT NOT NULL DEFAULT 1,
                    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    return_date TIMESTAMP NULL,
                    is_returned BOOLEAN DEFAULT FALSE,
                    returned_at TIMESTAMP NULL,
                    returned_to INT,
                    FOREIGN KEY (product_id) REFERENCES products(product_id),
                    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
                    FOREIGN KEY (monitor_id) REFERENCES users(user_id),
                    FOREIGN KEY (returned_to) REFERENCES users(user_id)
                )
            `);
            
            // Create indexes for performance
            await pool.execute(`CREATE INDEX idx_products_asset_type ON products(asset_type)`);
            await pool.execute(`CREATE INDEX idx_products_category ON products(product_category)`);
            await pool.execute(`CREATE INDEX idx_product_assignments_employee ON product_assignments(employee_id)`);
            await pool.execute(`CREATE INDEX idx_product_assignments_returned ON product_assignments(is_returned)`);

            console.log('✅ Database schema created');
        }
        
        // Insert sample departments first (needed for admin employee record)
        const [depts] = await pool.execute("SELECT COUNT(*) as count FROM departments");
        if (depts[0].count === 0) {
            await pool.execute(`
                INSERT INTO departments (department_name, description) VALUES 
                ('IT', 'Information Technology Department'),
                ('HR', 'Human Resources Department'),
                ('Finance', 'Finance and Accounting Department'),
                ('Marketing', 'Marketing and Sales Department'),
                ('Operations', 'Operations and Logistics Department')
            `);
            console.log('✅ Sample departments created');
        }
        
        // Create admin users if they don't exist
        const [adminUsers] = await pool.execute(
            "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
        );
        
        if (adminUsers[0].count === 0) {
            const bcrypt = require('bcryptjs');
            // Password is 'password' - matches the hash in your database.sql
            const hashedPassword = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
            
            // Create main admin user
            await pool.execute(
                `INSERT INTO users (username, full_name, email, password, role, is_super_admin, is_active) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['admin', 'System Administrator', 'admin@example.com', hashedPassword, 'admin', false, true]
            );
            
            // Create additional admin users as in your database.sql
            await pool.execute(
                `INSERT INTO users (username, full_name, email, password, role, is_super_admin, is_active) VALUES
                ('admin1', 'Admin One', 'admin1@example.com', ?, 'admin', TRUE, TRUE),
                ('admin2', 'Admin Two', 'admin2@example.com', ?, 'admin', FALSE, TRUE),
                ('admin3', 'Admin Three', 'admin3@example.com', ?, 'admin', FALSE, TRUE)`,
                [hashedPassword, hashedPassword, hashedPassword]
            );
            
            console.log('✅ Admin users created');
            
            // Create employee records for admin users
            const [allAdmins] = await pool.execute(
                'SELECT user_id FROM users WHERE role = ?',
                ['admin']
            );
            
            // Get IT department ID
            const [itDept] = await pool.execute(
                'SELECT department_id FROM departments WHERE department_name = ?',
                ['IT']
            );
            
            if (allAdmins.length > 0 && itDept.length > 0) {
                for (const admin of allAdmins) {
                    await pool.execute(
                        'INSERT INTO employees (user_id, department_id, is_active) VALUES (?, ?, ?)',
                        [admin.user_id, itDept[0].department_id, true]
                    );
                }
                console.log('✅ Admin employee records created');
            }
        }
        
        // Add sample products if they don't exist (first 10 products from your database.sql)
        const [existingProducts] = await pool.execute("SELECT COUNT(*) as count FROM products");
        if (existingProducts[0].count === 0) {
            // Get admin user ID
            const [adminUser] = await pool.execute('SELECT user_id FROM users WHERE username = ? LIMIT 1', ['admin']);
            const adminUserId = adminUser[0]?.user_id;
            
            if (adminUserId) {
                await pool.execute(`
                    INSERT INTO products (
                        item_number, asset_type, product_category, product_name, model_number, 
                        serial_number, is_available, quantity, added_by, calibration_required, 
                        calibration_frequency, calibration_due_date
                    ) VALUES
                    (1, 'Hardware', 'Power Supply', 'Scientific 30V, 5A Power supply', 'PSD3005', '45583213', TRUE, 1, ?, TRUE, '1 Year', '2026-07-24'),
                    (2, 'Hardware', 'Power Supply', 'Scientific 30V, 5A Power supply', 'PSD3005', 'AEF093', TRUE, 1, ?, TRUE, '2 Year', NULL),
                    (3, 'Hardware', 'Power Supply', 'Scientific 30V, 5A Power supply', 'PSD3005', NULL, TRUE, 1, ?, TRUE, '3 Year', NULL),
                    (4, 'Hardware', 'Power Supply', 'Scientific 30V, 5A Power supply', 'PSD3005', 'AQRTV893048', TRUE, 1, ?, TRUE, '4 Year', NULL),
                    (5, 'Hardware', 'Power Supply', 'Programmable Linear D.C. Power supply', 'GPD-2303S', '45583214', TRUE, 1, ?, TRUE, '5 Year', NULL),
                    (6, 'Hardware', 'Power Supply', 'Programmable Linear D.C. Power supply', 'GPD-2303S', 'AEF094', TRUE, 1, ?, TRUE, '6 Year', NULL),
                    (7, 'Hardware', 'Power Supply', 'D.C. Power Supply', 'GPS-3030D', NULL, TRUE, 1, ?, TRUE, '7 Year', NULL),
                    (8, 'Hardware', 'Power Supply', 'D.C. Power Supply', 'GPS-3030D', 'AQRTV893049', TRUE, 1, ?, TRUE, '8 Year', NULL),
                    (9, 'Hardware', 'Power Supply', 'D.C. Power Supply', 'GPS-3030D', '45583215', TRUE, 1, ?, TRUE, '9 Year', NULL),
                    (10, 'Hardware', 'Power Supply', 'D.C. Power Supply', 'GPS-30300', 'AEF095', TRUE, 1, ?, TRUE, '10 Year', NULL)
                `, Array(10).fill(adminUserId));
                console.log('✅ Sample products created');
            }
        }
        
        res.json({
            success: true,
            message: 'Database setup completed successfully! Using exact schema from database.sql',
            data: {
                tables: tableNames,
                adminUsers: [
                    { username: 'admin', password: 'password' },
                    { username: 'admin1', password: 'password' },
                    { username: 'admin2', password: 'password' },
                    { username: 'admin3', password: 'password' }
                ],
                note: 'All admin passwords are: password'
            }
        });
        
    } catch (error) {
        console.error('❌ Database setup error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check endpoint for deployment
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
    });
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