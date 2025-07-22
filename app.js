require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const path = require('path');

const app = express();
const PORT =  8080;

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'asset_management',
    port: process.env.DB_PORT || 3306
});

// Connect to database
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'asset-management-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Health check endpoint for Docker
app.get('/health', (req, res) => {
    // Check database connection
    db.ping((err) => {
        if (err) {
            console.error('Health check failed - Database error:', err);
            return res.status(503).json({ 
                status: 'unhealthy', 
                error: 'Database connection failed',
                timestamp: new Date().toISOString()
            });
        }
        
        res.status(200).json({ 
            status: 'healthy', 
            database: 'connected',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    });
});

const requireRole = (roles) => {
    return (req, res, next) => {
        if (req.session.user && roles.includes(req.session.user.role)) {
            next();
        } else {
            res.status(403).render('error', { message: 'Access denied' });
        }
    };
};

// Routes

// Home page
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect(`/${req.session.user.role}/dashboard`);
    } else {
        res.redirect('/login');
    }
});

// Login routes
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], async (err, results) => {
        if (err) {
            console.error(err);
            return res.render('login', { error: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.render('login', { error: 'Invalid credentials' });
        }
        
        const user = results[0];
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.render('login', { error: 'Invalid credentials' });
        }
        
        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            name: user.name
        };
        
        res.redirect(`/${user.role}/dashboard`);
    });
});

// Logout
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Employee routes
app.get('/employee/dashboard', requireAuth, requireRole(['employee']), (req, res) => {
    res.render('employee/dashboard', { user: req.session.user });
});

app.get('/employee/records', requireAuth, requireRole(['employee']), (req, res) => {
    const query = `
        SELECT r.*, p.name as product_name, p.description 
        FROM requests r 
        JOIN products p ON r.product_id = p.id 
        WHERE r.employee_id = ? AND r.status = 'approved'
        ORDER BY r.created_at DESC
    `;
    
    db.query(query, [req.session.user.id], (err, results) => {
        if (err) {
            console.error(err);
            return res.render('error', { message: 'Database error' });
        }
        res.render('employee/records', { user: req.session.user, records: results });
    });
});

app.get('/employee/requests', requireAuth, requireRole(['employee']), (req, res) => {
    // Get products for dropdown
    const productQuery = 'SELECT * FROM products WHERE quantity > 0';
    // Get employee's requests
    const requestQuery = `
        SELECT r.*, p.name as product_name 
        FROM requests r 
        JOIN products p ON r.product_id = p.id 
        WHERE r.employee_id = ? 
        ORDER BY r.created_at DESC
    `;
    
    db.query(productQuery, (err, products) => {
        if (err) {
            console.error(err);
            return res.render('error', { message: 'Database error' });
        }
        
        db.query(requestQuery, [req.session.user.id], (err, requests) => {
            if (err) {
                console.error(err);
                return res.render('error', { message: 'Database error' });
            }
            res.render('employee/requests', { 
                user: req.session.user, 
                products: products,
                requests: requests 
            });
        });
    });
});

app.post('/employee/requests', requireAuth, requireRole(['employee']), (req, res) => {
    const { product_id, quantity, reason } = req.body;
    
    const query = `
        INSERT INTO requests (employee_id, product_id, quantity, reason, status, created_at) 
        VALUES (?, ?, ?, ?, 'pending', NOW())
    `;
    
    db.query(query, [req.session.user.id, product_id, quantity, reason], (err) => {
        if (err) {
            console.error(err);
            return res.render('error', { message: 'Database error' });
        }
        res.redirect('/employee/requests');
    });
});

app.get('/employee/stock', requireAuth, requireRole(['employee']), (req, res) => {
    const query = 'SELECT * FROM products WHERE quantity > 0 ORDER BY name';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.render('error', { message: 'Database error' });
        }
        res.render('employee/stock', { user: req.session.user, products: results });
    });
});

app.get('/employee/account', requireAuth, requireRole(['employee']), (req, res) => {
    res.render('employee/account', { user: req.session.user });
});

// Manager routes
app.get('/manager/dashboard', requireAuth, requireRole(['manager']), (req, res) => {
    res.render('manager/dashboard', { user: req.session.user });
});

app.get('/manager/approvals', requireAuth, requireRole(['manager']), (req, res) => {
    const query = `
        SELECT r.*, p.name as product_name, u.name as employee_name 
        FROM requests r 
        JOIN products p ON r.product_id = p.id 
        JOIN users u ON r.employee_id = u.id 
        WHERE r.status = 'pending'
        ORDER BY r.created_at ASC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.render('error', { message: 'Database error' });
        }
        res.render('manager/approvals', { user: req.session.user, requests: results });
    });
});

app.post('/manager/approvals/:id', requireAuth, requireRole(['manager']), (req, res) => {
    const requestId = req.params.id;
    const { action } = req.body;
    
    if (action === 'approve') {
        // First get the request details
        const getRequestQuery = 'SELECT * FROM requests WHERE id = ?';
        db.query(getRequestQuery, [requestId], (err, requestResults) => {
            if (err) {
                console.error(err);
                return res.redirect('/manager/approvals');
            }
            
            const request = requestResults[0];
            
            // Update request status
            const updateRequestQuery = 'UPDATE requests SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?';
            db.query(updateRequestQuery, ['approved', req.session.user.id, requestId], (err) => {
                if (err) {
                    console.error(err);
                    return res.redirect('/manager/approvals');
                }
                
                // Update product quantity
                const updateProductQuery = 'UPDATE products SET quantity = quantity - ? WHERE id = ?';
                db.query(updateProductQuery, [request.quantity, request.product_id], (err) => {
                    if (err) {
                        console.error(err);
                    }
                    res.redirect('/manager/approvals');
                });
            });
        });
    } else if (action === 'reject') {
        const updateQuery = 'UPDATE requests SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?';
        db.query(updateQuery, ['rejected', req.session.user.id, requestId], (err) => {
            if (err) {
                console.error(err);
            }
            res.redirect('/manager/approvals');
        });
    }
});

app.get('/manager/records', requireAuth, requireRole(['manager']), (req, res) => {
    const query = `
        SELECT r.*, p.name as product_name, u.name as employee_name 
        FROM requests r 
        JOIN products p ON r.product_id = p.id 
        JOIN users u ON r.employee_id = u.id 
        WHERE r.approved_by = ?
        ORDER BY r.approved_at DESC
    `;
    
    db.query(query, [req.session.user.id], (err, results) => {
        if (err) {
            console.error(err);
            return res.render('error', { message: 'Database error' });
        }
        res.render('manager/records', { user: req.session.user, records: results });
    });
});

app.get('/manager/stock', requireAuth, requireRole(['employee', 'manager']), (req, res) => {
    const query = 'SELECT * FROM products ORDER BY name';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.render('error', { message: 'Database error' });
        }
        res.render('manager/stock', { user: req.session.user, products: results });
    });
});

app.get('/manager/account', requireAuth, requireRole(['manager']), (req, res) => {
    res.render('manager/account', { user: req.session.user });
});

// Admin routes
app.get('/admin/dashboard', requireAuth, requireRole(['admin']), (req, res) => {
    res.render('admin/dashboard', { user: req.session.user });
});

app.get('/admin/products', requireAuth, requireRole(['admin']), (req, res) => {
    const query = 'SELECT * FROM products ORDER BY name';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.render('error', { message: 'Database error' });
        }
        res.render('admin/products', { user: req.session.user, products: results });
    });
});

app.post('/admin/products', requireAuth, requireRole(['admin']), (req, res) => {
    const { name, description, quantity } = req.body;
    
    const query = 'INSERT INTO products (name, description, quantity, created_at) VALUES (?, ?, ?, NOW())';
    
    db.query(query, [name, description, quantity], (err) => {
        if (err) {
            console.error(err);
            return res.render('error', { message: 'Database error' });
        }
        res.redirect('/admin/products');
    });
});

app.get('/admin/assign', requireAuth, requireRole(['admin']), (req, res) => {
    const productsQuery = 'SELECT * FROM products WHERE quantity > 0';
    const employeesQuery = 'SELECT * FROM users WHERE role = "employee"';
    
    db.query(productsQuery, (err, products) => {
        if (err) {
            console.error(err);
            return res.render('error', { message: 'Database error' });
        }
        
        db.query(employeesQuery, (err, employees) => {
            if (err) {
                console.error(err);
                return res.render('error', { message: 'Database error' });
            }
            res.render('admin/assign', { 
                user: req.session.user, 
                products: products,
                employees: employees 
            });
        });
    });
});

app.post('/admin/assign', requireAuth, requireRole(['admin']), (req, res) => {
    const { employee_id, product_id, quantity } = req.body;
    
    // Create a direct assignment request that's pre-approved
    const query = `
        INSERT INTO requests (employee_id, product_id, quantity, reason, status, approved_by, created_at, approved_at) 
        VALUES (?, ?, ?, 'Admin Direct Assignment', 'approved', ?, NOW(), NOW())
    `;
    
    db.query(query, [employee_id, product_id, quantity, req.session.user.id], (err) => {
        if (err) {
            console.error(err);
            return res.render('error', { message: 'Database error' });
        }
        
        // Update product quantity
        const updateQuery = 'UPDATE products SET quantity = quantity - ? WHERE id = ?';
        db.query(updateQuery, [quantity, product_id], (err) => {
            if (err) {
                console.error(err);
            }
            res.redirect('/admin/assign');
        });
    });
});

app.get('/admin/return', requireAuth, requireRole(['admin']), (req, res) => {
    const query = `
        SELECT r.*, p.name as product_name, u.name as employee_name 
        FROM requests r 
        JOIN products p ON r.product_id = p.id 
        JOIN users u ON r.employee_id = u.id 
        WHERE r.status = 'approved' AND r.returned = FALSE
        ORDER BY r.approved_at DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.render('error', { message: 'Database error' });
        }
        res.render('admin/return', { user: req.session.user, assignments: results });
    });
});

app.post('/admin/return/:id', requireAuth, requireRole(['admin']), (req, res) => {
    const requestId = req.params.id;
    
    // Get request details first
    const getRequestQuery = 'SELECT * FROM requests WHERE id = ?';
    db.query(getRequestQuery, [requestId], (err, results) => {
        if (err) {
            console.error(err);
            return res.redirect('/admin/return');
        }
        
        const request = results[0];
        
        // Mark as returned
        const updateRequestQuery = 'UPDATE requests SET returned = TRUE, returned_at = NOW() WHERE id = ?';
        db.query(updateRequestQuery, [requestId], (err) => {
            if (err) {
                console.error(err);
                return res.redirect('/admin/return');
            }
            
            // Add quantity back to product
            const updateProductQuery = 'UPDATE products SET quantity = quantity + ? WHERE id = ?';
            db.query(updateProductQuery, [request.quantity, request.product_id], (err) => {
                if (err) {
                    console.error(err);
                }
                res.redirect('/admin/return');
            });
        });
    });
});

app.get('/admin/stock', requireAuth, requireRole(['admin']), (req, res) => {
    const query = 'SELECT * FROM products ORDER BY name';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.render('error', { message: 'Database error' });
        }
        res.render('admin/stock', { user: req.session.user, products: results });
    });
});

// Change password route for all users
app.post('/change-password', requireAuth, (req, res) => {
    const { current_password, new_password } = req.body;
    
    // First verify current password
    const getUserQuery = 'SELECT password FROM users WHERE id = ?';
    db.query(getUserQuery, [req.session.user.id], async (err, results) => {
        if (err) {
            console.error(err);
            return res.redirect(`/${req.session.user.role}/account`);
        }
        
        const user = results[0];
        const isValidPassword = await bcrypt.compare(current_password, user.password);
        
        if (!isValidPassword) {
            return res.redirect(`/${req.session.user.role}/account`);
        }
        
        // Hash new password and update
        const hashedPassword = await bcrypt.hash(new_password, 10);
        const updateQuery = 'UPDATE users SET password = ? WHERE id = ?';
        
        db.query(updateQuery, [hashedPassword, req.session.user.id], (err) => {
            if (err) {
                console.error(err);
            }
            res.redirect(`/${req.session.user.role}/account`);
        });
    });
});

// Error handling
app.use((req, res) => {
    res.status(404).render('error', { message: 'Page not found' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
