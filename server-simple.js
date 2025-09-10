/**
 * Simple Portable Inventory Management System
 * Uses in-memory storage for true portability
 */

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory database
let users = [];
let products = [];
let requests = [];
let assignments = [];

// Initialize with default admin
bcrypt.hash('admin123', 10).then(hash => {
    users.push({
        user_id: 1,
        username: 'admin',
        full_name: 'Administrator',
        email: 'admin@company.com',
        password: hash,
        role: 'admin',
        is_active: 1
    });
});

const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.use(session({
    secret: 'portable-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 86400000 }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    res.render('auth/login', { messages: [] });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    const user = users.find(u => u.username === username && u.is_active);
    
    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.render('auth/login', { messages: [{ type: 'error', text: 'Invalid credentials' }] });
    }
    
    req.session.user = {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        role: user.role
    };
    
    res.redirect(user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
});

app.get('/dashboard', requireAuth, (req, res) => {
    res.send(`
        <h1>Dashboard</h1>
        <p>Welcome ${req.session.user.full_name}!</p>
        <p>Role: ${req.session.user.role}</p>
        <a href="/logout">Logout</a>
    `);
});

app.get('/admin/dashboard', requireAuth, (req, res) => {
    if (req.session.user.role !== 'admin') {
        return res.status(403).send('Access denied');
    }
    
    res.send(`
        <h1>Admin Dashboard</h1>
        <p>Welcome ${req.session.user.full_name}!</p>
        <p>Users: ${users.length}</p>
        <p>Products: ${products.length}</p>
        <a href="/logout">Logout</a>
    `);
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.listen(PORT, () => {
    console.log(`🚀 Portable Inventory System running on port ${PORT}`);
    console.log(`🌐 Access: http://localhost:${PORT}`);
    console.log(`👤 Login: admin / admin123`);
});

module.exports = app;