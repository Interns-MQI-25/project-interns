const express = require('express');
const session = require('express-session');
const flash = require('express-flash');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');

// Import middleware
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

// Import route modules
const commonRoutes = require('./src/routes/commonRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const employeeRoutes = require('./src/routes/employeeRoutes');
const monitorRoutes = require('./src/routes/monitorRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = mysql.createPool({
    host: process.env.NODE_ENV === 'production' ? undefined : 'localhost',
    socketPath: process.env.NODE_ENV === 'production' ? '/cloudsql/mqi-interns-467405:us-central1:product-management-db' : undefined,
    user: process.env.NODE_ENV === 'production' ? 'sigma' : 'root',
    password: process.env.NODE_ENV === 'production' ? 'sigma' : '',
    database: 'product_management_system',
    connectionLimit: 5
});
app.locals.pool = pool;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use('/images', express.static('images'));

app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 86400000 }
}));
app.use(flash());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => {
    res.render('auth/login', { messages: req.flash() });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const testHash = await bcrypt.hash('password', 10);
        const guddiHash = await bcrypt.hash('Welcome@MQI', 10);

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
        console.error('Login error:', error);
        req.flash('error', 'Login error');
        res.redirect('/login');
    }
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    
    if (req.session.user.role === 'admin') {
        return res.redirect('/admin/dashboard');
    } else if (req.session.user.role === 'monitor') {
        return res.redirect('/monitor/dashboard');
    } else if (req.session.user.role === 'employee') {
        return res.redirect('/employee/dashboard');
    }
    
    res.send(`<h1>Welcome ${req.session.user.full_name}!</h1><p>Role: ${req.session.user.role}</p><a href="/logout">Logout</a>`);
});

app.get('/admin/dashboard', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/login');
    }
    
    try {
        res.render('admin/dashboard', { 
            user: req.session.user,
            stats: {
                totalEmployees: 0,
                activeMonitors: 0,
                pendingRegistrations: 0,
                totalProducts: 0
            },
            recentActivity: [],
            stockStats: []
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.send(`<h1>Admin Dashboard</h1><p>Welcome ${req.session.user.full_name}!</p><p>Role: ${req.session.user.role}</p><a href="/logout">Logout</a>`);
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

// Use route modules
app.use('/', commonRoutes(pool, requireAuth, requireRole));
app.use('/admin', adminRoutes(pool, requireAuth, requireRole));
app.use('/employee', employeeRoutes(pool, requireAuth, requireRole));
app.use('/monitor', monitorRoutes(pool, requireAuth, requireRole));

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});









app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;