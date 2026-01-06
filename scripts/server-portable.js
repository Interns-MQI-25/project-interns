/**
 * Portable Inventory Management System - Standalone Executable
 * Uses embedded SQLite database instead of MySQL for portability
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('express-flash');
const bcrypt = require('bcryptjs');
const path = require('path');

// Use SQLite instead of MySQL
const db = require('./setup-sqlite');

const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
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

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use('/images', express.static('images'));

app.use(session({
    secret: process.env.SESSION_SECRET || 'portable-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 86400000,
        httpOnly: true
    }
}));
app.use(flash());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Create SQLite adapter for routes
const sqlitePool = {
    execute: (query, params = []) => {
        return new Promise((resolve, reject) => {
            try {
                const stmt = db.prepare(query.replace(/\?/g, '?'));
                if (query.trim().toUpperCase().startsWith('SELECT')) {
                    const rows = stmt.all(...params);
                    resolve([rows]);
                } else {
                    const result = stmt.run(...params);
                    resolve([{ insertId: result.lastInsertRowid, affectedRows: result.changes }]);
                }
            } catch (error) {
                reject(error);
            }
        });
    },
    getConnection: () => Promise.resolve({ release: () => {} })
};

// Import routes with SQLite adapter
const commonRoutes = require('./src/routes/commonRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const employeeRoutes = require('./src/routes/employeeRoutes');
const monitorRoutes = require('./src/routes/monitorRoutes');

// Mount routes
app.use('/', commonRoutes(sqlitePool, requireAuth, requireRole));
app.use('/admin', adminRoutes(sqlitePool, requireAuth, requireRole));
app.use('/employee', employeeRoutes(sqlitePool, requireAuth, requireRole));
app.use('/monitor', monitorRoutes(sqlitePool, requireAuth, requireRole));

// Basic routes
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    res.render('auth/login', { messages: req.flash() });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // Create default admin user
        const adminHash = await bcrypt.hash('admin123', 10);
        const stmt = db.prepare('INSERT OR IGNORE INTO users (username, full_name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?)');
        stmt.run('admin', 'Administrator', 'admin@company.com', adminHash, 'admin', 1);
        
        // Find user
        const userStmt = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1');
        const user = userStmt.get(username);
        
        if (!user) {
            req.flash('error', 'Invalid username or password');
            return res.redirect('/login');
        }
        
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
        
        if (user.role === 'admin') {
            res.redirect('/admin/dashboard');
        } else if (user.role === 'monitor') {
            res.redirect('/monitor/dashboard');
        } else {
            res.redirect('/employee/dashboard');
        }
    } catch (error) {
        console.error('Login error:', error);
        req.flash('error', 'Login failed');
        res.redirect('/login');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Portable Inventory Management System running on port ${PORT}`);
    console.log(`📊 Database: SQLite (embedded)`);
    console.log(`🌐 Access: http://localhost:${PORT}`);
    console.log(`👤 Default login: admin / admin123`);
});

module.exports = app;