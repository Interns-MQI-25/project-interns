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

const pool = mysql.createPool({
    socketPath: process.env.NODE_ENV === 'production' ? process.env.DB_HOST : undefined,
    host: process.env.NODE_ENV === 'production' ? undefined : 'localhost',
    user: process.env.NODE_ENV === 'production' ? process.env.DB_USER : 'root',
    password: process.env.NODE_ENV === 'production' ? process.env.DB_PASSWORD : '',
    database: process.env.NODE_ENV === 'production' ? process.env.DB_NAME : 'product_management_system',
    connectionLimit: 5,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
});
app.locals.pool = pool;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use('/images', express.static('images'));

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
app.use(flash());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// Use route modules
app.use('/', commonRoutes(pool, requireAuth, requireRole));
app.use('/admin', adminRoutes(pool, requireAuth, requireRole));
app.use('/employee', employeeRoutes(pool, requireAuth, requireRole));
app.use(monitorRoutes(pool, requireAuth, requireRole));

// Middleware to check authentication
// const { requireAuth, requireRole } = require('./src/middleware/auth'); {
//     try {
//         if (req.session.user) {
//             // Get complete user data from database using pool instead of db
//             const [users] = await pool.execute(
//                 'SELECT * FROM users WHERE user_id = ?', 
//                 [req.session.user.user_id]
//             );

//             if (users.length === 0) {
//                 req.session.destroy();
//                 return res.redirect('/login');
//             }

//             req.user = users[0];
//             next();
//         } else {
//             res.redirect('/login');
//         }
//     } catch (error) {
//         console.error('Auth error:', error);
//         req.session.destroy();
//         res.redirect('/login');
//     }
// };

// // Middleware to check role
// const requireRole = (roles) => {
//     return (req, res, next) => {
//         if (req.session.user && roles.includes(req.session.user.role)) {
//             next();
//         } else {
//             res.status(403).render('error', { message: 'Access denied' });
//         }
//     };
// };



// API endpoint for live counts
app.get('/api/live-counts', requireAuth, async (req, res) => {
    try {
        const [pendingRequests] = await pool.execute(
            'SELECT COUNT(*) as count FROM product_requests WHERE status = "pending"'
        );
        
        const [pendingRegistrations] = await pool.execute(
            'SELECT COUNT(*) as count FROM registration_requests WHERE status = "pending"'
        );
        
        let employeeUpdates = 0;
        if (req.session.user.role === 'employee') {
            try {
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
        
        console.log('API Debug - Pending requests:', pendingRequests[0].count);
        console.log('API Debug - Pending registrations:', pendingRegistrations[0].count);
        console.log('API Debug - Employee updates:', employeeUpdates);
        
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

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // Test database connection first with detailed logging
        console.log('Attempting database connection...');
        console.log('Environment:', process.env.NODE_ENV);
        console.log('DB_HOST:', process.env.DB_HOST);
        console.log('DB_USER:', process.env.DB_USER);
        console.log('DB_NAME:', process.env.DB_NAME);
        
        const connection = await pool.getConnection();
        console.log('Database connection successful!');
        connection.release();
        
        const testHash = await bcrypt.hash('password', 10);
        const guddiHash = await bcrypt.hash('Welcome@MQI', 10);
        const vennuHash = await bcrypt.hash('Vennu@123', 10);

        await pool.execute('CREATE TABLE IF NOT EXISTS users (user_id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(50) UNIQUE, full_name VARCHAR(100), email VARCHAR(100), password VARCHAR(255), role VARCHAR(20) DEFAULT "admin", is_active BOOLEAN DEFAULT TRUE)');
        await pool.execute('INSERT IGNORE INTO users (username, full_name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?)', ['test', 'Test User', 'test@example.com', testHash, 'admin', 1]);
        await pool.execute('INSERT IGNORE INTO users (username, full_name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?)', ['GuddiS', 'Somling Guddi', 'Guddi.Somling@marquardt.com', guddiHash, 'admin', 1]);
        
        const [users] = await pool.execute('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
        
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
        
        if (user.role === 'admin') {
            res.redirect('/admin/dashboard');
        } else if (user.role === 'monitor') {
            res.redirect('/monitor/dashboard');
        } else if (user.role === 'employee') {
            res.redirect('/employee/dashboard');
        } else {
            res.redirect('/dashboard');
        }
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('error', { message: 'Error loading dashboard', error: error.message || error.toString(), stack: error.stack });
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
        
        res.render('monitor/approvals', { title: 'Approvals', user: req.session.user, requests });
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

app.get('/monitor/dashboard', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'monitor') {
        return res.redirect('/login');
    }
    
    try {
        res.render('monitor/dashboard', { 
            user: req.session.user,
            stats: {
                pendingRequests: 0,
                approvedToday: 0,
                totalProducts: 0
            },
            recentActivity: []
        });
    } catch (error) {
        console.error('Monitor dashboard error:', error);
        res.send(`<h1>Monitor Dashboard</h1><p>Welcome ${req.session.user.full_name}!</p><p>Role: ${req.session.user.role}</p><a href="/logout">Logout</a>`);
    }
});

app.get('/employee/dashboard', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'employee') {
        return res.redirect('/login');
    }
    
    try {
        res.render('employee/dashboard', { 
            user: req.session.user,
            recentRequests: [],
            recentActivity: []
        });
    } catch (error) {
        console.error('Employee dashboard error:', error);
        res.send(`<h1>Employee Dashboard</h1><p>Welcome ${req.session.user.full_name}!</p><p>Role: ${req.session.user.role}</p><a href="/logout">Logout</a>`);
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Admin: All Logs API Route for GCloud
app.get('/admin/all-logs', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
        let history = [];
        
        // Get assignments and requests
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
        
        // Try to add registration requests if table exists
        try {
            const [registrations] = await pool.execute(`
                SELECT 'registration' as type, requested_at as date, 'User Registration' as product_name,
                       full_name as employee_name, COALESCE(u.full_name, 'Admin') as monitor_name, 1 as quantity,
                       COALESCE(status, 'pending') as status
                FROM registration_requests rr
                LEFT JOIN users u ON rr.processed_by = u.user_id
            `);
            
            // Merge and sort all records
            history = [...basicHistory, ...registrations].sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (regError) {
            console.log('Registration requests table not found:', regError.message);
        }
        
        res.json({ logs: history });
    } catch (error) {
        console.error('All logs error:', error);
        res.status(500).json({ error: 'Failed to fetch logs', logs: [] });
    }
});

// Use route modules
app.use('/', commonRoutes(pool, requireAuth, requireRole));
app.use('/admin', adminRoutes(pool, requireAuth, requireRole));
app.use('/employee', employeeRoutes(pool, requireAuth, requireRole));
app.use('/monitor', monitorRoutes(pool, requireAuth, requireRole));

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});



app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`DB Host: ${process.env.DB_HOST}`);
}).on('error', (err) => {
    console.error('Server failed to start:', err);
    process.exit(1);
});

// Test database connection
pool.getConnection()
    .then(connection => {
        console.log('Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('Database connection failed:', err);
        console.error('Error details:', {
            code: err.code,
            errno: err.errno,
            sqlMessage: err.sqlMessage,
            sqlState: err.sqlState,
            message: err.message
        });
    });

module.exports = app;