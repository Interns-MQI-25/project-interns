const mysql = require('mysql2/promise');

// Middleware to check authentication
const requireAuth = async (req, res, next) => {
    try {
        console.log('🔍 Auth middleware - checking session...');
        console.log('📋 Session user:', req.session.user ? 'EXISTS' : 'NOT FOUND');
        console.log('📋 Session ID:', req.sessionID);
        
        if (req.session.user) {
            console.log('✅ Session user found:', req.session.user.username);
            // Get complete user data from database using pool instead of db
            const [users] = await req.app.locals.pool.execute(
                'SELECT * FROM users WHERE user_id = ?', 
                [req.session.user.user_id]
            );

            if (users.length === 0) {
                console.log('❌ User not found in database, destroying session');
                req.session.destroy();
                return res.redirect('/login');
            }

            console.log('✅ User verified from database');
            req.user = users[0];
            next();
        } else {
            console.log('❌ No session user, redirecting to login');
            res.redirect('/login');
        }
    } catch (error) {
        console.error('❌ Auth error:', error);
        req.session.destroy();
        res.redirect('/login');
    }
};

// Middleware to check role
const requireRole = (roles) => {
    return (req, res, next) => {
        if (req.session.user && roles.includes(req.session.user.role)) {
            next();
        } else {
            res.status(403).render('error', { message: 'Access denied' });
        }
    };
};

// Helper function to check if user has admin privileges (admin role)
const hasAdminAccess = (userRole) => {
    return userRole === 'admin';
};

// Helper function to check if user has super admin privileges
const hasSuperAdminAccess = (user) => {
    return user.role === 'admin' && user.is_super_admin === true;
};

// Middleware specifically for admin access
const requireAdmin = (req, res, next) => {
    if (req.session.user && hasAdminAccess(req.session.user.role)) {
        next();
    } else {
        res.status(403).render('error', { message: 'Admin access required' });
    }
};

// Middleware specifically for super admin access
const requireSuperAdmin = (req, res, next) => {
    if (req.session.user && hasSuperAdminAccess(req.session.user)) {
        next();
    } else {
        res.status(403).render('error', { message: 'Super Admin access required' });
    }
};

module.exports = {
    requireAuth,
    requireRole,
    hasAdminAccess,
    hasSuperAdminAccess,
    requireAdmin,
    requireSuperAdmin
};
