const express = require('express');
const session = require('express-session');
const flash = require('express-flash');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

const pool = mysql.createPool({
    user: process.env.DB_USER || 'sigma',
    password: process.env.DB_PASSWORD || 'sigma',
    database: process.env.DB_NAME || 'product_management_system',
    socketPath: process.env.DB_HOST || '/cloudsql/mqi-interns-467405:us-central1:product-management-db',
    waitForConnections: true,
    connectionLimit: 5
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use('/images', express.static('images'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
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
        // Create user if doesn't exist
        const testHash = await bcrypt.hash('password', 10);
        await pool.execute('CREATE TABLE IF NOT EXISTS users (user_id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(50) UNIQUE, full_name VARCHAR(100), email VARCHAR(100), password VARCHAR(255), role VARCHAR(20) DEFAULT "admin", is_active BOOLEAN DEFAULT TRUE)');
        await pool.execute('INSERT IGNORE INTO users (username, full_name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?)', ['test', 'Test User', 'test@example.com', testHash, 'admin', 1]);
        
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
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Login error:', error);
        req.flash('error', 'Login error');
        res.redirect('/login');
    }
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.send(`<h1>Welcome ${req.session.user.full_name}!</h1><p>Role: ${req.session.user.role}</p><a href="/logout">Logout</a>`);
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;