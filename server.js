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
const PORT = process.env.PORT || 3000;

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
                    asset_type VARCHAR(50),
                    product_category VARCHAR(100),
                    product_name VARCHAR(500),
                    model_number VARCHAR(100),
                    serial_number VARCHAR(100),
                    is_available BOOLEAN DEFAULT TRUE,
                    quantity INT DEFAULT 1,
                    added_by INT,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    calibration_required BOOLEAN DEFAULT FALSE,
                    calibration_frequency VARCHAR(50),
                    calibration_due_date DATE,
                    pr_no INT,
                    po_number VARCHAR(50),
                    inward_date DATE,
                    inwarded_by INT,
                    version_number VARCHAR(50),
                    software_license_type VARCHAR(50),
                    license_expiry DATE,
                    renewal_frequency VARCHAR(50),
                    next_renewal_date DATE,
                    FOREIGN KEY (added_by) REFERENCES users(user_id),
                    FOREIGN KEY (inwarded_by) REFERENCES users(user_id)
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
            await pool.execute(`CREATE INDEX idx_registration_requests_status ON registration_requests(status)`);
            await pool.execute(`CREATE INDEX idx_monitor_assignments_active ON monitor_assignments(is_active)`);

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
        
        // Add ALL 72 products from database.sql if they don't exist
        const [existingProducts] = await pool.execute("SELECT COUNT(*) as count FROM products");
        console.log(`📦 Current product count: ${existingProducts[0].count}`);
        
        if (existingProducts[0].count < 72) {
            console.log('🔄 Clearing existing products and inserting all 72 products...');
            
            // Clear existing data in correct order to handle foreign key constraints
            await pool.execute('DELETE FROM product_assignments');
            await pool.execute('DELETE FROM product_requests');
            await pool.execute('DELETE FROM stock_history');
            await pool.execute('DELETE FROM products');
            
            // Get admin user ID
            const [adminUser] = await pool.execute('SELECT user_id FROM users WHERE username = ? LIMIT 1', ['admin']);
            const adminUserId = adminUser[0]?.user_id;
            
            if (adminUserId) {
                // Insert ALL 72 products from your database.sql with updated data
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
                    (10, 'Hardware', 'Power Supply', 'D.C. Power Supply', 'GPS-30300', 'AEF095', TRUE, 1, ?, TRUE, '10 Year', NULL),
                    (11, 'Hardware', 'Power Supply', 'TDK lamda Power supply', NULL, NULL, TRUE, 1, ?, TRUE, '11 Year', NULL),
                    (12, 'Hardware', 'Multimeter', 'Fluke True RMS Multimeter', '179', 'AQRTV893050', TRUE, 1, ?, TRUE, '12 Year', NULL),
                    (13, 'Hardware', 'Multimeter', 'Fluke True RMS Multimeter', '179', '45583216', TRUE, 1, ?, TRUE, '13 Year', NULL),
                    (14, 'Hardware', 'HD Oscilloscope', '200 MHz, 10 GS/s, 4 Ch, 12.5 Mpts/Ch 12-bit HD Oscilloscope with 12.1" WXGA Color Display', NULL, 'AEF096', TRUE, 1, ?, TRUE, '14 Year', NULL),
                    (15, 'Hardware', 'Oscilloscope', '200 MHz, 4 Input Channels, Oscilloscope 2 GS/s interleaved, 140 Mpts interleaved DSO with 8" display', NULL, NULL, TRUE, 1, ?, TRUE, '15 Year', NULL),
                    (16, 'Hardware', 'Picoscope', '3406D MSO', 'NA', 'AQRTV893051', TRUE, 1, ?, TRUE, '16 Year', NULL),
                    (17, 'Hardware', 'Oscilloscope Probe', 'TA386 200MHz Oscilloscope Probe TA386 Max 600Volts PK', 'NA', '45583217', TRUE, 1, ?, TRUE, '17 Year', NULL),
                    (18, 'Hardware', 'Passive Probe', 'T3PP350 Passive Probe SP2035 350MHz', 'NA', 'AEF097', TRUE, 1, ?, TRUE, '18 Year', NULL),
                    (19, 'Hardware', 'Passive Probe', 'T3PP350 Passive Probe T3PP300 MHz,300Vrms CAT II', 'NA', NULL, TRUE, 1, ?, TRUE, '19 Year', NULL),
                    (20, 'Hardware', 'Function Generator', '40MHz; 2 independent channels; 1.2GS/s; 16-bit vertical resolution; 8Mpts/ch memory Arbitary Function/Waveform Generator with 4.3 inch Touch Screen TFT LCD', NULL, 'AQRTV893052', TRUE, 1, ?, TRUE, '20 Year', NULL),
                    (21, 'Hardware', 'CAN Hardware', 'CAN Disturbance Hardware-CANStress Tool', 'VH6501', '45583218', TRUE, 1, ?, TRUE, '21 Year', NULL),
                    (22, 'Misc', 'USB Cable', 'USB Cable for CANStress Hardware', 'NA', 'AEF098', TRUE, 1, ?, TRUE, '22 Year', NULL),
                    (23, 'Hardware', 'Test Hardware', 'Conformance Test Hardware', 'VH1150', NULL, TRUE, 1, ?, TRUE, '23 Year', NULL),
                    (24, 'Hardware', 'USB Cable', 'USB Cable for Conformance Test Hardware', 'NA', 'AQRTV893053', TRUE, 1, ?, TRUE, '24 Year', NULL),
                    (25, 'Hardware', 'Power Supply', 'Desktop Power Supply for Conformance Hardware', 'NA', '45583219', TRUE, 1, ?, TRUE, '25 Year', NULL),
                    (26, 'Hardware', 'Cable', 'Y Cable for Conformance Test Hardware', 'NA', 'AEF099', TRUE, 1, ?, TRUE, '26 Year', NULL),
                    (27, 'Hardware', 'Terminator', 'CAN Terminator with Conformance Test Hardware', 'NA', NULL, TRUE, 1, ?, TRUE, '27 Year', NULL),
                    (28, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN/Diva/XCP', 'VN1630A', 'AQRTV893054', TRUE, 1, ?, TRUE, '28 Year', NULL),
                    (29, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN(J1939) NL', 'VN1630A', '45583220', TRUE, 1, ?, TRUE, '29 Year', NULL),
                    (30, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN(J1939) NL', 'VN1630A', 'AEF100', TRUE, 1, ?, TRUE, '30 Year', NULL),
                    (31, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN 12.0', 'VN1630A', NULL, TRUE, 1, ?, TRUE, '31 Year', NULL),
                    (32, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN NL', 'VN1630A', 'AQRTV893055', TRUE, 1, ?, TRUE, '32 Year', NULL),
                    (33, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN 11.0', 'VN1630A', '45583221', TRUE, 1, ?, TRUE, '33 Year', NULL),
                    (34, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN', 'VN1630A', 'AEF101', TRUE, 1, ?, TRUE, '34 Year', NULL),
                    (35, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN 12.0', 'VN1630A', NULL, TRUE, 1, ?, TRUE, '35 Year', NULL),
                    (36, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN 17.0', 'VN1640A', 'AQRTV893056', TRUE, 1, ?, TRUE, '36 Year', NULL),
                    (37, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN 17.0', 'VN1640A', '45583222', TRUE, 1, ?, TRUE, '37 Year', NULL),
                    (38, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN 17 & 18', 'VN1640A', 'AEF102', TRUE, 1, ?, TRUE, '38 Year', NULL),
                    (39, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN NL Canoe 18 License Vector ID: 55000324146, 55004052271', 'VN1640A', NULL, TRUE, 1, ?, TRUE, '39 Year', NULL),
                    (40, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN NL Canoe 18 License Vector ID: 55000324145, 55004052270', 'VN1640A', 'AQRTV893057', TRUE, 1, ?, TRUE, '40 Year', NULL),
                    (41, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN', 'VN1640A', '45583223', TRUE, 1, ?, TRUE, '41 Year', NULL),
                    (42, 'Hardware', 'Vector Keyman', 'Vector Keyman / Dongle', 'NA', 'AEF103', TRUE, 1, ?, TRUE, '42 Year', NULL),
                    (43, 'Hardware', 'Digit Multimeter', 'Digit multimeter model 2100 6 1/2', NULL, NULL, TRUE, 1, ?, TRUE, '43 Year', NULL),
                    (44, 'Misc', 'Debug Interface', 'Lauterbach Power Debug Interface - Power Debug Module USB 3.0', 'NA', 'AQRTV893058', TRUE, 1, ?, TRUE, '44 Year', NULL),
                    (45, 'Misc', 'Debug Interface', 'Lauterbach Power Debug Interface - Power Debug Module USB 3.0', 'NA', '45583224', TRUE, 1, ?, TRUE, '45 Year', NULL),
                    (46, 'Misc', 'Debugger', 'Debugger for Cortex-M-JTAG Cable', 'NA', 'AEF104', TRUE, 1, ?, TRUE, '46 Year', NULL),
                    (47, 'Misc', 'Debugger', 'Debugger for Cortex-M-A-JTAG Cable (Tricore)', 'NA', NULL, TRUE, 1, ?, TRUE, '47 Year', NULL),
                    (48, 'Misc', 'USB Cable', 'USB Cable for Lauterbach - USB 3.0', 'NA', 'AQRTV893059', TRUE, 1, ?, TRUE, '48 Year', NULL),
                    (49, 'Misc', 'USB Cable', 'USB Cable for Lauterbach - USB 2.0', 'NA', '45583225', TRUE, 1, ?, TRUE, '49 Year', NULL),
                    (50, 'Misc', 'USB Cable', 'USB Cable for Canoe', 'NA', 'AEF105', TRUE, 1, ?, TRUE, '50 Year', NULL),
                    (51, 'Misc', 'USB Cable', 'USB Cable for Canoe', 'NA', NULL, TRUE, 1, ?, TRUE, '51 Year', NULL),
                    (52, 'Misc', 'USB Cable', 'USB Cable for Canoe', 'NA', 'AQRTV893060', TRUE, 1, ?, TRUE, '52 Year', NULL),
                    (53, 'Misc', 'USB Cable', 'USB Cable for Canoe', 'NA', '45583226', TRUE, 1, ?, TRUE, '53 Year', NULL),
                    (54, 'Misc', 'Connectors', 'Crocodile Pin Connectors', 'NA', 'AEF106', TRUE, 1, ?, TRUE, '54 Year', NULL),
                    (55, 'Software', 'Canoe Software', 'Canoe Software with CAN/LIN', 'Version 11.0', NULL, TRUE, 1, ?, TRUE, '55 Year', NULL),
                    (56, 'Software', 'Canoe Software', 'Canoe Software with CAN/LIN', 'Version 12.0', 'AQRTV893061', TRUE, 1, ?, TRUE, '56 Year', NULL),
                    (57, 'Software', 'Canoe Software', 'Canoe Software with CAN/LIN', 'Version 12.0', '45583227', TRUE, 1, ?, TRUE, '57 Year', NULL),
                    (58, 'Software', 'Canoe Software', 'Canoe Software with LIN', 'Version 12.0', 'AEF107', TRUE, 1, ?, TRUE, '58 Year', NULL),
                    (59, 'Software', 'Canoe Software', 'Canoe Software with LIN', 'Version 12.0', NULL, TRUE, 1, ?, TRUE, '59 Year', NULL),
                    (60, 'Software', 'Canoe Software', 'Canoe Software with LIN,DIVA,AMD/XCP', 'Version 11.0', 'AQRTV893062', TRUE, 1, ?, TRUE, '60 Year', NULL),
                    (61, 'Software', 'Canoe Software', 'Canoe Software with CAN/LIN', 'Version 11.0', '45583228', TRUE, 1, ?, TRUE, '61 Year', NULL),
                    (62, 'Software', 'vFlash Software', 'vFlash Software', 'Version 7.0', 'AEF108', TRUE, 1, ?, TRUE, '62 Year', NULL),
                    (63, 'Software', 'Vector Driver CD', 'Driver & Documentation for Vector Bus Interfaces', 'Version 11.0', NULL, TRUE, 1, ?, TRUE, '63 Year', NULL),
                    (64, 'Software', 'Canoe Software CD', 'Probe,Test, Kleps 30, 4mm, 4A, RED', 'NA', 'AQRTV893063', TRUE, 1, ?, TRUE, '64 Year', NULL),
                    (65, 'Software', 'vFlash Software CD', 'vFlash Software CD', 'NA', '45583229', TRUE, 1, ?, FALSE, NULL, NULL),
                    (66, 'License', 'VAG License', 'Yearly Subscription for Porsche Projects', '5.1', 'AEF109', TRUE, 1, ?, FALSE, NULL, NULL),
                    (67, 'License', 'AMTS License', 'Yearly Subscription for BMW Projects', 'NA', NULL, TRUE, 1, ?, FALSE, NULL, NULL),
                    (68, 'Laptop', 'Hardware', 'Dell Laptop', '5580', 'AQRTV893064', TRUE, 1, ?, FALSE, NULL, NULL),
                    (69, 'Hardware', 'Programmer', 'Multi Standard Programmer for laboratory usage-Desktop version High performance universal, dual channel programming tool for flash devices', NULL, '45583230', TRUE, 1, ?, FALSE, NULL, NULL),
                    (70, 'Misc', 'Target cable', 'Target cable for MSP2100NET/2100NET-MQ customized,twisted pair,0.1m lengths with MDR36 connector on both ends', NULL, 'AEF110', TRUE, 1, ?, FALSE, NULL, NULL),
                    (71, 'Misc', 'Power cable', 'Power supply target cable for MSP2100NET/2150NET-Standard open end, 4-wire power supply cable with connector for MSP2100NET and open end on other side,2m length', NULL, NULL, TRUE, 1, ?, FALSE, NULL, NULL),
                    (72, 'Misc', 'USB Cable', 'Amazonbasics USB 2.0 Cable A-Male to Mini B - 6Ft and 1.8M', NULL, 'AQRTV893065', TRUE, 1, ?, FALSE, NULL, NULL)
                `, Array(72).fill(adminUserId));
                
                console.log('✅ ALL 72 products from database.sql inserted successfully!');
                
                // Verify the count
                const [finalCount] = await pool.execute("SELECT COUNT(*) as count FROM products");
                console.log(`📦 Final product count: ${finalCount[0].count}/72`);
            }
        } else {
            console.log('✅ All 72 products already exist in database');
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