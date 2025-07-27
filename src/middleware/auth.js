const mysql = require('mysql2/promise');

// Middleware to check authentication
const requireAuth = async (req, res, next) => {
    try {
        if (req.session.user) {
            // Get complete user data from database using pool instead of db
            const [users] = await req.app.locals.pool.execute(
                'SELECT * FROM users WHERE user_id = ?', 
                [req.session.user.user_id]
            );

            if (users.length === 0) {
                req.session.destroy();
                return res.redirect('/login');
            }

            req.user = users[0];
            next();
        } else {
            res.redirect('/login');
        }
    } catch (error) {
        console.error('Auth error:', error);
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

module.exports = {
    requireAuth,
    requireRole
};
