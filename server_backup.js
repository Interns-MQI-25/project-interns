require('dotenv').config();

const express = require('express');
const session = require('express-session');
const flash = require('express-flash');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');

// Import middleware
const requireAuth = (req, res, next) => {
    console.log('requireAuth check - session user:', req.session.user);
    console.log('requireAuth check - session ID:', req.sessionID);
    if (req.session.user) {
        next();
    } else {
        console.log('No session user found, redirecting to login');
        res.redirect('/login');
    }
};

const requireRole = (roles) => {
    return (req, res, next) => {
        if (req.session.user && roles.includes(req.session.user.role)) {
            next();
        } else {
            res.status(403).render('error', { message: 'Access denied' });
        }
    };
};

// Import route modules
const commonRoutes = require('./src/routes/commonRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const employeeRoutes = require('./src/routes/employeeRoutes');
const monitorRoutes = require('./src/routes/monitorRoutes');

// Try to import ActivityLogger, fallback if not available
let ActivityLogger;
try {
    ActivityLogger = require('./src/utils/activityLogger');
} catch (err) {
    console.log('ActivityLogger not available, using fallback');
    ActivityLogger = {
        logLogin: () => Promise.resolve()
    };
}

const app = express();
const PORT = process.env.PORT || 3000;

// Process error handlers
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Database configuration for localhost
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'product_management_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
};

// Create connection pool with proper localhost configuration
const pool = mysql.createPool(dbConfig);
app.locals.pool = pool;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use('/images', express.static('images'));

app.use(session({
    secret: process.env.SESSION_SECRET || 'localhost-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Always false for localhost
        maxAge: 86400000, // 24 hours
        httpOnly: true
    }
}));
app.use(flash());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// API endpoint for live counts
app.get('/api/live-counts', requireAuth, async (req, res) => {
    try {
        const [pendingRequests] = await pool.execute(
            'SELECT COUNT(*) as count FROM product_requests WHERE status = "pending"'
        );
        
        const [pendingRegistrations] = await pool.execute(
            'SELECT COUNT(*) as count FROM registration_requests WHERE status = "pending"'
        );
        
        console.log('API Debug - Pending requests:', pendingRequests[0].count);
        console.log('API Debug - Pending registrations:', pendingRegistrations[0].count);
        
        res.json({
            pendingRequests: pendingRequests[0].count,
            pendingRegistrations: pendingRegistrations[0].count
        });
    } catch (error) {
        console.error('Live counts error:', error);
        res.status(500).json({ error: 'Failed to fetch counts' });
    }
});

// API endpoint for monitor pending approvals count
app.get('/api/monitor/pending-approvals-count', requireAuth, requireRole(['monitor']), async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT COUNT(*) AS count FROM product_requests WHERE status = "pending"'
        );
        res.json({ count: rows[0].count });
    } catch (err) {
        console.error('Pending approvals count error:', err);
        res.json({ count: 0 });
    }
});

// Routes
app.get('/', (req, res) => {
    if (req.session.user) {
        if (req.session.user.role === 'admin') {
            res.redirect('/admin/dashboard');
        } else if (req.session.user.role === 'monitor') {
            res.redirect('/monitor/dashboard');
        } else if (req.session.user.role === 'employee') {
            res.redirect('/employee/dashboard');
        } else {
            res.redirect('/login');
        }
    } else {
        res.redirect('/login');
    }
});

// Authentication routes
app.get('/login', (req, res) => {
    res.render('auth/login', { messages: req.flash() });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // Test database connection first
        console.log('Testing database connection...');
        const connection = await pool.getConnection();
        console.log('Database connection successful!');
        connection.release();
        
        // Create test users if they don't exist
        const testHash = await bcrypt.hash('password', 10);
        const guddiHash = await bcrypt.hash('Welcome@MQI', 10);
        
        // Ensure users table exists
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS users (
                user_id INT AUTO_INCREMENT PRIMARY KEY, 
                username VARCHAR(50) UNIQUE, 
                full_name VARCHAR(100), 
                email VARCHAR(100), 
                password VARCHAR(255), 
                role VARCHAR(20) DEFAULT "employee", 
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        // Insert test users
        await pool.execute(
            'INSERT IGNORE INTO users (username, full_name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?)', 
            ['test', 'Test Admin', 'test@example.com', testHash, 'admin', 1]
        );
        await pool.execute(
            'INSERT IGNORE INTO users (username, full_name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?)', 
            ['GuddiS', 'Somling Guddi', 'Guddi.Somling@marquardt.com', guddiHash, 'admin', 1]
        );
        await pool.execute(
            'INSERT IGNORE INTO users (username, full_name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?)', 
            ['employee1', 'John Employee', 'employee@example.com', testHash, 'employee', 1]
        );
        await pool.execute(
            'INSERT IGNORE INTO users (username, full_name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?)', 
            ['monitor1', 'Jane Monitor', 'monitor@example.com', testHash, 'monitor', 1]
        );
        
        // Find user
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE username = ? AND is_active = 1', 
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
            role: user.role
        };
        
        console.log('Session created:', req.session.user);
        console.log('Session ID:', req.sessionID);
        
        // Log login activity if available
        if (ActivityLogger && ActivityLogger.logLogin) {
            try {
                await ActivityLogger.logLogin(
                    pool, 
                    user.user_id, 
                    user.full_name, 
                    req.ip || req.connection.remoteAddress,
                    req.get('User-Agent')
                );
            } catch (logError) {
                console.error('Error logging login activity:', logError);
            }
        }
        
        // Redirect based on role
        if (user.role === 'admin') {
            res.redirect('/admin/dashboard');
        } else if (user.role === 'monitor') {
            res.redirect('/monitor/dashboard');
        } else if (user.role === 'employee') {
            res.redirect('/employee/dashboard');
        } else {
            res.redirect('/login');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        req.flash('error', 'Database connection error. Please try again.');
        res.redirect('/login');
    }
});

// Monitor routes with productRequests fix
app.get('/monitor/records', requireAuth, requireRole(['monitor', 'admin']), async (req, res) => {
    try {
        // Get product assignments
        const [assignments] = await pool.execute(`
            SELECT pa.*, p.product_name, p.model_number, p.serial_number, 
                   u.full_name as employee_name, pa.assigned_date, pa.expected_return_date,
                   pa.return_date, pa.status
            FROM product_assignments pa
            LEFT JOIN products p ON pa.product_id = p.product_id
            LEFT JOIN users u ON pa.user_id = u.user_id
            ORDER BY pa.assigned_date DESC
            LIMIT 50
        `);

        // Get product requests
        const [productRequests] = await pool.execute(`
            SELECT pr.*, p.product_name, p.model_number, p.serial_number,
                   u.full_name as employee_name, pr.request_date, pr.expected_return_date,
                   pr.status, pr.approved_by, pr.approved_date
            FROM product_requests pr
            LEFT JOIN products p ON pr.product_id = p.product_id
            LEFT JOIN users u ON pr.user_id = u.user_id
            ORDER BY pr.request_date DESC
            LIMIT 50
        `);

        res.render('monitor/records', { 
            assignments: assignments || [],
            productRequests: productRequests || [],
            user: req.session.user 
        });
    } catch (error) {
        console.error('Error fetching records:', error);
        res.render('monitor/records', { 
            assignments: [],
            productRequests: [],
            user: req.session.user,
            error: 'Unable to load records data. Please check database connection.'
        });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Use route modules
app.use('/', commonRoutes(pool, requireAuth, requireRole));
app.use('/admin', adminRoutes(pool, requireAuth, requireRole));
app.use('/employee', employeeRoutes(pool, requireAuth, requireRole));
app.use('/monitor', monitorRoutes(pool, requireAuth, requireRole));

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: 'localhost'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Application error:', err);
    res.status(500).render('error', { 
        message: 'Something went wrong!', 
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', { 
        message: 'Page not found',
        error: { status: 404 }
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: localhost development`);
    console.log(`Database: ${dbConfig.host}:3306/${dbConfig.database}`);
    console.log(`Available test users:`);
    console.log(`  - test/password (admin)`);
    console.log(`  - GuddiS/Welcome@MQI (admin)`);
    console.log(`  - employee1/password (employee)`);
    console.log(`  - monitor1/password (monitor)`);
}).on('error', (err) => {
    console.error('Server failed to start:', err);
    process.exit(1);
});

// Test database connection
pool.getConnection()
    .then(connection => {
        console.log('✅ Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
        console.error('Make sure MySQL is running and credentials are correct');
        console.error('Check your .env file or update the database configuration');
    });

module.exports = app;
