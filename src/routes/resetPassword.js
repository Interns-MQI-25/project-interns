const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

module.exports = (pool) => {
    router.get('/reset-admin-password', async (req, res) => {
        try {
            const newHash = await bcrypt.hash('admin123', 10);
            await pool.execute('UPDATE users SET password = ? WHERE username = ?', [newHash, 'GuddiS']);
            res.json({ success: true, message: 'Password reset to: admin123' });
        } catch (error) {
            res.json({ success: false, error: error.message });
        }
    });
    
    return router;
};