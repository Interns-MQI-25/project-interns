const express = require('express');
const router = express.Router();
const liveFeed = require('../utils/liveFeed');

// SSE endpoint for live feed
router.get('/live-feed', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user_id, role } = req.session.user;
    liveFeed.addClient(user_id, role, res);
});

module.exports = router;