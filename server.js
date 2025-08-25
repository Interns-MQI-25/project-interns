/**
 * Marquardt India Pvt. Ltd. - Inventory Management System
 * Main Server Configuration and Entry Point
 * 
 * This file configures the Express.js server with database connections,
 * middleware, authentication, and routes for the inventory management system.
 * 
 * @author Marquardt India Interns 2025
 * @version 2.0.0
 */

// Load environment variables from .env file
require('dotenv').config();

// Import required dependencies
const express = require('express');
const session = require('express-session');
const flash = require('express-flash');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');

/**
 * Authentication middleware to ensure user is logged in
 * Checks if user session exists and redirects to login if not authenticated
 * 
 * @param {Object} req - Express request object containing session data
 * @param {Object} res - Express response object for redirects
 * @param {Function} next - Express next function to continue to next middleware
 */
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

/**
 * Role-based access control middleware
 * Ensures user has appropriate role permissions for accessing specific routes
 * 
 * @param {Array<string>} roles - Array of allowed roles (e.g., ['admin', 'monitor'])
 * @returns {Function} Express middleware function that checks user role
 */
const requireRole = (roles) => {
    return (req, res, next) => {
        if (req.session.user && roles.includes(req.session.user.role)) {
            next();
        } else {
            res.status(403).render('error', { message: 'Access denied' });
        }
    };
};

// Import route modules - organized by user roles and functionality
const commonRoutes = require('./src/routes/commonRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const employeeRoutes = require('./src/routes/employeeRoutes');
const monitorRoutes = require('./src/routes/monitorRoutes');
const resetPasswordRoutes = require('./src/routes/resetPassword');
const liveFeedRoutes = require('./src/routes/liveFeedRoutes');
const activityRoutes = require('./src/routes/activityRoutes');

/**
 * Activity Logger Import with Fallback
 * Attempts to import activity logger utility for tracking user actions
 * Provides fallback functionality if logger is not available
 */
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

/**
 * Global Error Handlers
 * Handles uncaught exceptions and unhandled promise rejections
 * Ensures server shuts down gracefully when critical errors occur
 */
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

/**
 * Database Configuration
 * Configures MySQL connection pool with different settings for production vs development
 * Production uses Unix socket for Google Cloud SQL, development uses TCP connection
 */
// Database configuration - different for production (App Engine) vs development
const dbConfig = process.env.NODE_ENV === 'production' ? {
    // Production: Use Unix socket for Cloud SQL
    socketPath: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5,
    waitForConnections: true,
    queueLimit: 0
} : {
    // Development: Use standard TCP connection
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Neha@012004',
    database: process.env.DB_NAME || 'product_management_system',
    port: process.env.DB_PORT || 3306,
    connectionLimit: 5,
    waitForConnections: true,
    queueLimit: 0
};

console.log('Database connection config:', process.env.NODE_ENV === 'production' ? 
    `Production mode - using socket: ${process.env.DB_HOST}` : 
    `Development mode - using host: ${dbConfig.host}:${dbConfig.port}`);

// Create MySQL connection pool for efficient database connections
const pool = mysql.createPool(dbConfig);
app.locals.pool = pool; // Make pool available to all route modules

/**
 * Express Middleware Configuration
 * Sets up parsing, static files, sessions, and template engine
 */

app.use(express.urlencoded({ extended: true })); // Parse form data
app.use(express.json()); // Parse JSON data
app.use(express.static('public')); // Serve static files (CSS, JS, images)
app.use('/images', express.static('images')); // Serve company images

// Session configuration for user authentication and state management

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to false for App Engine since it handles HTTPS termination
        maxAge: 86400000,
        httpOnly: true
    }
}));
app.use(flash()); // Enable flash messages for user feedback

// Set EJS as template engine and configure views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/**
 * Route Configuration
 * Mount route modules with appropriate middleware for each user role
 */
app.use('/', commonRoutes(pool, requireAuth, requireRole));
app.use('/admin', adminRoutes(pool, requireAuth, requireRole));
app.use('/employee', employeeRoutes(pool, requireAuth, requireRole));
app.use('/monitor', monitorRoutes(pool, requireAuth, requireRole));
app.use('/reset', resetPasswordRoutes(pool));
app.use('/', liveFeedRoutes);
app.use('/', activityRoutes(pool, requireAuth, requireRole));

/**
 * Live Counts API Endpoint
 * Provides real-time counts for pending requests, registrations, and employee updates
 * Used by dashboard components for dynamic updates
 * 
 * @route GET /api/live-counts
 * @access Protected (requireAuth)
 * @returns {JSON} Object containing counts for different pending items
 */
app.get('/api/live-counts', requireAuth, async (req, res) => {
    try {
        // Get count of pending product requests for monitors
        const [pendingRequests] = await pool.execute(
            'SELECT COUNT(*) as count FROM product_requests WHERE status = "pending"'
        );
        
        // Get count of pending user registration requests for admins
        const [pendingRegistrations] = await pool.execute(
            'SELECT COUNT(*) as count FROM registration_requests WHERE status = "pending"'
        );
        
        // Get employee-specific updates (approved/rejected requests in last 7 days)
        let employeeUpdates = 0;
        if (req.session.user.role === 'employee') {
            try {
                // Query for recent status updates on employee's requests
                const [updates] = await pool.execute(
                    `SELECT COUNT(*) as count FROM product_requests pr 
                     JOIN employees e ON pr.employee_id = e.employee_id 
                     WHERE e.user_id = ? AND pr.status IN ('approved', 'rejected') 
                     AND pr.processed_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`,
                    [req.session.user.user_id]
                );
                employeeUpdates = updates[0].count;
                console.log('Employee updates for user', req.session.user.user_id, ':', employeeUpdates);
            } catch (err) {
                console.error('Error fetching employee updates:', err);
                // Fallback: get all approved/rejected requests for this employee
                try {
                    const [fallback] = await pool.execute(
                        `SELECT COUNT(*) as count FROM product_requests pr 
                         JOIN employees e ON pr.employee_id = e.employee_id 
                         WHERE e.user_id = ? AND pr.status IN ('approved', 'rejected')`,
                        [req.session.user.user_id]
                    );
                    employeeUpdates = fallback[0].count;
                    console.log('Fallback employee updates:', employeeUpdates);
                } catch (fallbackErr) {
                    console.error('Fallback query also failed:', fallbackErr);
                }
            }
        }
        
        // Log counts for debugging purposes
        console.log('API Debug - Pending requests:', pendingRequests[0].count);
        console.log('API Debug - Pending registrations:', pendingRegistrations[0].count);
        console.log('API Debug - Employee updates:', employeeUpdates);
        
        // Return counts as JSON response for frontend dashboard updates
        res.json({
            pendingRequests: pendingRequests[0].count,
            pendingRegistrations: pendingRegistrations[0].count,
            employeeUpdates: employeeUpdates
        });
    } catch (error) {
        console.error('Live counts error:', error);
        res.status(500).json({ error: 'Failed to fetch counts' });
    }
});

/**
 * Monitor Pending Approvals Count API
 * Returns count of pending product requests specifically for monitor dashboard
 * 
 * @route GET /api/monitor/pending-approvals-count
 * @access Protected (requireAuth, requireRole: monitor)
 * @returns {JSON} Object containing pending approvals count
 */
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

/**
 * Root Route Handler
 * Redirects users to appropriate dashboard based on authentication status
 */
app.get('/', (req, res) => {
    // Redirect authenticated users to dashboard, unauthenticated to login
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

/**
 * Login Page Route
 * Renders login form with any flash messages
 */
app.get('/login', (req, res) => {
    res.render('auth/login', { messages: req.flash() });
});

/**
 * Login Authentication Handler
 * Processes user login credentials, validates against database,
 * creates session, logs activity, and redirects to role-appropriate dashboard
 * 
 * @route POST /login
 * @param {string} username - User's login username
 * @param {string} password - User's plain text password (will be hashed for comparison)
 */

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // Test database connection with comprehensive logging
        console.log('Attempting database connection...');
        console.log('Environment:', process.env.NODE_ENV);
        console.log('DB_HOST:', process.env.DB_HOST);
        console.log('DB_USER:', process.env.DB_USER);
        console.log('DB_NAME:', process.env.DB_NAME);
        
        const connection = await pool.getConnection();
        console.log('Database connection successful!');
        connection.release();
        
        // Create default admin users with hashed passwords
        const testHash = await bcrypt.hash('password', 10);
        const guddiHash = await bcrypt.hash('Welcome@MQI', 10);
        // const vennuHash = await bcrypt.hash('Vennu@123', 10);

        // Ensure users table exists and create default admin accounts
        await pool.execute('CREATE TABLE IF NOT EXISTS users (user_id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(50) UNIQUE, full_name VARCHAR(100), email VARCHAR(100), password VARCHAR(255), role VARCHAR(20) DEFAULT "admin", is_active BOOLEAN DEFAULT TRUE)');
        await pool.execute('INSERT IGNORE INTO users (username, full_name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?)', ['test', 'Test User', 'test@example.com', testHash, 'admin', 1]);
        await pool.execute('INSERT IGNORE INTO users (username, full_name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?)', ['GuddiS', 'Somling Guddi', 'Somling.Guddi@marquardt.com', guddiHash, 'admin', 1]);
        
        // Find user with exact username match (case sensitive)
        const [users] = await pool.execute('SELECT * FROM users WHERE BINARY username = ? AND is_active = 1', [username]);
        
        if (users.length === 0) {
            req.flash('error', 'Invalid username or password');
            return res.redirect('/login');
        }
        
        const user = users[0];
        // Verify password using bcrypt comparison
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            req.flash('error', 'Invalid username or password');
            return res.redirect('/login');
        }
        
        // Create user session with essential user data
        req.session.user = {
            user_id: user.user_id,
            username: user.username,
            full_name: user.full_name,
            role: user.role
        };
        
        console.log('Session created:', req.session.user);
        console.log('Session ID:', req.sessionID);
        
        // Log login activity for audit trail (if available)
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
        
        // Redirect user to role-appropriate dashboard
        if (user.role === 'admin') {
            res.redirect('/admin/dashboard');
        } else if (user.role === 'monitor') {
            res.redirect('/monitor/dashboard');
        } else if (user.role === 'employee') {
            res.redirect('/employee/dashboard');
        } else {
            res.redirect('/dashboard'); // Fallback for unknown roles
        }
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('error', { message: 'Error loading dashboard', error: error.message || error.toString(), stack: error.stack });
    }
});

/**
 * Employee Dashboard Route
 * Renders employee dashboard with user data and activity summaries
 * Includes error handling with fallback HTML rendering
 */
app.get('/employee/dashboard', (req, res) => {
    // Check authentication and role authorization
    if (!req.session.user || req.session.user.role !== 'employee') {
        return res.redirect('/login');
    }
    
    try {
        // Render employee dashboard with user data and empty arrays for requests/activity
        res.render('employee/dashboard', { 
            user: req.session.user,
            recentRequests: [], // Populated by frontend AJAX calls
            recentActivity: []  // Populated by frontend AJAX calls
        });
    } catch (error) {
        console.error('Employee dashboard error:', error);
        // Fallback: render basic HTML response if EJS template fails
        res.send(`<h1>Employee Dashboard</h1><p>Welcome ${req.session.user.full_name}!</p><p>Role: ${req.session.user.role}</p><a href="/logout">Logout</a>`);
    }
});

/**
 * Logout Route Handler
 * Destroys user session and redirects to login page
 */
app.get('/logout', (req, res) => {
    req.session.destroy(); // Clear user session data
    res.redirect('/login');  // Redirect to login page
});

/**
 * Admin All Logs API Route
 * Comprehensive logging endpoint that aggregates all system activities
 * including assignments, requests, and registrations for admin dashboard
 * 
 * @route GET /admin/all-logs
 * @access Protected (requireAuth, requireRole: admin)
 * @returns {JSON} Object containing aggregated system logs
 */
app.get('/admin/all-logs', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
        let history = [];
        
        // Get comprehensive history of assignments and product requests
        const [basicHistory] = await pool.execute(`
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
        `);
        
        history = basicHistory;
        
        // Attempt to include registration requests if table exists
        try {
            // Query registration requests and merge with existing history
            const [registrations] = await pool.execute(`
                SELECT 'registration' as type, requested_at as date, 'User Registration' as product_name,
                       full_name as employee_name, COALESCE(u.full_name, 'Admin') as monitor_name, 1 as quantity,
                       COALESCE(status, 'pending') as status
                FROM registration_requests rr
                LEFT JOIN users u ON rr.processed_by = u.user_id
            `);
            
            // Merge all records and sort by date (newest first)
            history = [...basicHistory, ...registrations].sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (regError) {
            console.log('Registration requests table not found:', regError.message);
            // Continue with basic history if registration table doesn't exist
        }
        
        // Return aggregated logs for admin dashboard
        res.json({ logs: history });
    } catch (error) {
        console.error('All logs error:', error);
        res.status(500).json({ error: 'Failed to fetch logs', logs: [] });
    }
});

/**
 * Health Check Endpoint
 * Provides basic server health status and timestamp for monitoring
 * Used by load balancers and monitoring systems
 * 
 * @route GET /health
 * @access Public
 * @returns {JSON} Health status and timestamp
 */
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

/**
 * Server Startup and Database Connection
 * Starts the Express server on specified port and tests database connectivity
 * Includes comprehensive error handling and logging
 */

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`DB Host: ${process.env.DB_HOST}`);
}).on('error', (err) => {
    console.error('Server failed to start:', err);
    process.exit(1); // Exit if server cannot start
});

/**
 * Database Connection Test
 * Tests the MySQL connection pool on server startup
 * Provides detailed error logging for debugging connection issues
 */
pool.getConnection()
    .then(connection => {
        console.log('Database connected successfully');
        connection.release(); // Release connection back to pool
    })
    .catch(err => {
        console.error('Database connection failed:', err);
        console.error('Error details:', {
            code: err.code,           // Error code (e.g., ECONNREFUSED)
            errno: err.errno,         // Error number
            sqlMessage: err.sqlMessage, // SQL-specific error message
            sqlState: err.sqlState,   // SQL state code
            message: err.message      // General error message
        });
    });

// Export app for testing purposes
module.exports = app;