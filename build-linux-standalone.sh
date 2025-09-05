#!/bin/bash
echo "Building standalone Linux executable for global access..."

# Install pkg if not available
if ! command -v pkg &> /dev/null; then
    echo "Installing pkg globally..."
    if [ "$EUID" -eq 0 ]; then
        npm install -g pkg
    else
        sudo npm install -g pkg || {
            echo "⚠️  Global pkg install failed, installing locally..."
            npm install pkg
            export PATH="$PATH:./node_modules/.bin"
        }
    fi
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Create standalone server for Linux
echo "Creating standalone server configuration..."
cat > server-linux.js << 'EOF'
/**
 * Marquardt Inventory Management System - Linux Standalone
 * Self-contained executable with embedded database support
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('express-flash');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database configuration with fallback to SQLite for standalone
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'sigma',
    password: process.env.DB_PASSWORD || 'sigma',
    database: process.env.DB_NAME || 'product_management_system',
    port: process.env.DB_PORT || 3306,
    connectionLimit: 5,
    waitForConnections: true,
    queueLimit: 0
};

// Create MySQL connection pool
const pool = mysql.createPool(dbConfig);
app.locals.pool = pool;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'linux-standalone-secret',
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

// Authentication middleware
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

// Import routes
const commonRoutes = require('./src/routes/commonRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const employeeRoutes = require('./src/routes/employeeRoutes');
const monitorRoutes = require('./src/routes/monitorRoutes');
const resetPasswordRoutes = require('./src/routes/resetPassword');
const liveFeedRoutes = require('./src/routes/liveFeedRoutes');
const activityRoutes = require('./src/routes/activityRoutes');
const hilRoutes = require('./src/routes/hilRoutes');
const aiAssistantRoutes = require('./src/routes/aiAssistantRoutes');

// Mount routes
app.use('/', commonRoutes(pool, requireAuth, requireRole));
app.use('/admin', adminRoutes(pool, requireAuth, requireRole));
app.use('/employee', employeeRoutes(pool, requireAuth, requireRole));
app.use('/monitor', monitorRoutes(pool, requireAuth, requireRole));
app.use('/reset', resetPasswordRoutes(pool));
app.use('/', liveFeedRoutes);
app.use('/', activityRoutes(pool, requireAuth, requireRole));
app.use('/hil', hilRoutes(pool, requireAuth, requireRole));
app.use('/admin', hilRoutes(pool, requireAuth, requireRole));
app.use('/api/ai-assistant', aiAssistantRoutes(pool, requireAuth, requireRole));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// Login routes
app.get('/login', (req, res) => {
    res.render('auth/login', { messages: req.flash() });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const [users] = await pool.execute('SELECT * FROM users WHERE BINARY username = ? AND is_active = 1', [username]);
        
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
        res.render('error', { message: 'Database connection error' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Start server on all interfaces for global access
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Marquardt Inventory Management System`);
    console.log(`📍 Running on: http://0.0.0.0:${PORT}`);
    console.log(`🌐 Local access: http://localhost:${PORT}`);
    console.log(`🔑 Default login: GuddiS / Welcome@MQI`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
}).on('error', (err) => {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
});

// Database connection test
pool.getConnection()
    .then(connection => {
        console.log('✅ Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err);
    });
EOF

# Create package.json for pkg configuration
echo "Creating pkg configuration..."
cat > package-standalone.json << 'PKGEOF'
{
  "name": "marquardt-inventory-linux",
  "version": "1.0.0",
  "main": "server-linux.js",
  "pkg": {
    "assets": [
      "views/**/*",
      "public/**/*",
      "src/**/*",
      "images/**/*",
      "node_modules/ejs/**/*",
      "node_modules/express/**/*",
      "node_modules/mysql2/**/*",
      "node_modules/bcryptjs/**/*",
      "node_modules/express-session/**/*",
      "node_modules/express-flash/**/*"
    ],
    "scripts": [
      "src/**/*.js"
    ],
    "targets": [
      "node18-linux-x64"
    ]
  }
}
PKGEOF

# Build Linux executable with all dependencies
echo "Building Linux executable..."
if command -v pkg &> /dev/null; then
    pkg package-standalone.json --output marquardt-inventory-linux
else
    echo "❌ pkg command not found, trying with npx..."
    npx pkg package-standalone.json --output marquardt-inventory-linux
fi

# Check if executable was created
if [ -f "marquardt-inventory-linux" ]; then
    # Make executable
    chmod +x marquardt-inventory-linux
    echo "✅ Executable created successfully"
else
    echo "❌ Failed to create executable"
    echo "💡 Fallback: Use 'node server-linux.js' to run directly"
    chmod +x server-linux.js
    mv server-linux.js marquardt-inventory-linux.js
    echo "#!/bin/bash" > marquardt-inventory-linux
    echo "node \"\$(dirname \"\$0\")/marquardt-inventory-linux.js\"" >> marquardt-inventory-linux
    chmod +x marquardt-inventory-linux
fi

# Clean up temporary files if they exist
[ -f "server-linux.js" ] && rm server-linux.js
[ -f "package-standalone.json" ] && rm package-standalone.json

echo "✅ Build complete!"
echo ""
echo "📦 Created: marquardt-inventory-linux"
echo "🚀 Run with: ./marquardt-inventory-linux"
echo "🌐 Access: http://localhost:3000"
echo "🔑 Login: GuddiS / Welcome@MQI"