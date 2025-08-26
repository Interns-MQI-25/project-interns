const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const router = express.Router();
const emailService = require('../utils/emailService');

module.exports = (pool) => {
    // Admin password reset (existing)
    router.get('/reset-admin-password', async (req, res) => {
        try {
            const newHash = await bcrypt.hash('admin123', 10);
            await pool.execute('UPDATE users SET password = ? WHERE BINARY username = ?', [newHash, 'GuddiS']);
            res.json({ success: true, message: 'Password reset to: admin123' });
        } catch (error) {
            res.json({ success: false, error: error.message });
        }
    });

    // Forgot password: request reset link
    router.post('/forgot-password', async (req, res) => {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email required' });
        try {
            // Find user by email
            const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
            if (users.length === 0) {
                return res.status(404).json({ success: false, message: 'No user found with that email' });
            }
            const user = users[0];
            // Generate token
            const token = crypto.randomBytes(32).toString('hex');
            const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 min expiry
            // Store token and expiry in DB (add columns if needed)
            await pool.execute('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE user_id = ?', [token, expires, user.user_id]);
            // Send email
            const resetLink = `${process.env.APP_BASE_URL || 'https://mqi-ims.uc.r.appspot.com'}/reset-password/${token}`;
            await emailService.sendPasswordResetEmail(email, user.full_name, resetLink);
            // Respond
            res.json({ success: true, message: 'Password reset email sent' });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Error sending reset email', error: err.message });
        }
    });

    // Reset password: show form (GET)
    router.get('/reset-password/:token', async (req, res) => {
        const { token } = req.params;
        try {
            const [users] = await pool.execute('SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()', [token]);
            if (users.length === 0) {
                return res.status(400).send('Invalid or expired reset link.');
            }
            res.render('auth/reset-password', { token });
        } catch (err) {
            res.status(500).send('Server error.');
        }
    });

    // Reset password: handle form (POST)
    router.post('/reset-password/:token', async (req, res) => {
        const { token } = req.params;
        const { password } = req.body;
        if (!password) return res.status(400).send('Password required.');
        try {
            const [users] = await pool.execute('SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()', [token]);
            if (users.length === 0) {
                return res.status(400).send('Invalid or expired reset link.');
            }
            const user = users[0];
            const hash = await bcrypt.hash(password, 10);
            await pool.execute('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE user_id = ?', [hash, user.user_id]);
            res.send('Password reset successful. You can now <a href="/login">login</a>.');
        } catch (err) {
            res.status(500).send('Server error.');
        }
    });

    return router;
};