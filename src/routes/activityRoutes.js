const express = require('express');
const router = express.Router();

module.exports = (pool, requireAuth, requireRole) => {
    
    // Get recent activity for dashboard
    router.get('/api/recent-activity', requireAuth, async (req, res) => {
        try {
            const userRole = req.session.user.role;
            let activities = [];

            if (userRole === 'admin') {
                // Admin sees all activity
                const [results] = await pool.execute(`
                    SELECT 'product_added' as type, p.added_at as timestamp, 
                           CONCAT(u.full_name, ' added "', p.product_name, '" to inventory') as message
                    FROM products p
                    JOIN users u ON p.added_by = u.user_id
                    WHERE p.added_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                    
                    UNION ALL
                    
                    SELECT 'product_assigned' as type, pa.assigned_at as timestamp,
                           CONCAT(u1.full_name, ' assigned "', p.product_name, '" to ', u2.full_name) as message
                    FROM product_assignments pa
                    JOIN products p ON pa.product_id = p.product_id
                    JOIN employees e ON pa.employee_id = e.employee_id
                    JOIN users u1 ON pa.monitor_id = u1.user_id
                    JOIN users u2 ON e.user_id = u2.user_id
                    WHERE pa.assigned_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                    
                    UNION ALL
                    
                    SELECT 'product_returned' as type, pa.returned_at as timestamp,
                           CONCAT(u.full_name, ' returned "', p.product_name, '"') as message
                    FROM product_assignments pa
                    JOIN products p ON pa.product_id = p.product_id
                    JOIN employees e ON pa.employee_id = e.employee_id
                    JOIN users u ON e.user_id = u.user_id
                    WHERE pa.is_returned = 1 AND pa.returned_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                    
                    UNION ALL
                    
                    SELECT 'request_submitted' as type, pr.requested_at as timestamp,
                           CONCAT(u.full_name, ' requested "', p.product_name, '"') as message
                    FROM product_requests pr
                    JOIN products p ON pr.product_id = p.product_id
                    JOIN employees e ON pr.employee_id = e.employee_id
                    JOIN users u ON e.user_id = u.user_id
                    WHERE pr.requested_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                    
                    ORDER BY timestamp DESC
                    LIMIT 10
                `);
                activities = results;
            } else if (userRole === 'monitor') {
                // Monitor sees product and request activity
                const [results] = await pool.execute(`
                    SELECT 'request_submitted' as type, pr.requested_at as timestamp,
                           CONCAT('Request for "', p.product_name, '" submitted by ', u.full_name) as message
                    FROM product_requests pr
                    JOIN products p ON pr.product_id = p.product_id
                    JOIN employees e ON pr.employee_id = e.employee_id
                    JOIN users u ON e.user_id = u.user_id
                    WHERE pr.requested_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                    
                    UNION ALL
                    
                    SELECT 'product_assigned' as type, pa.assigned_at as timestamp,
                           CONCAT('Product "', p.product_name, '" assigned to ', u.full_name) as message
                    FROM product_assignments pa
                    JOIN products p ON pa.product_id = p.product_id
                    JOIN employees e ON pa.employee_id = e.employee_id
                    JOIN users u ON e.user_id = u.user_id
                    WHERE pa.assigned_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                    
                    ORDER BY timestamp DESC
                    LIMIT 10
                `);
                activities = results;
            } else if (userRole === 'employee') {
                // Employee sees their own activity
                const [results] = await pool.execute(`
                    SELECT 'request_approved' as type, pr.processed_at as timestamp,
                           CONCAT('Your request for "', p.product_name, '" was approved') as message
                    FROM product_requests pr
                    JOIN products p ON pr.product_id = p.product_id
                    JOIN employees e ON pr.employee_id = e.employee_id
                    WHERE e.user_id = ? AND pr.status = 'approved' AND pr.processed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                    
                    UNION ALL
                    
                    SELECT 'product_assigned' as type, pa.assigned_at as timestamp,
                           CONCAT('Product "', p.product_name, '" assigned to you') as message
                    FROM product_assignments pa
                    JOIN products p ON pa.product_id = p.product_id
                    JOIN employees e ON pa.employee_id = e.employee_id
                    WHERE e.user_id = ? AND pa.assigned_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                    
                    ORDER BY timestamp DESC
                    LIMIT 10
                `, [req.session.user.user_id, req.session.user.user_id]);
                activities = results;
            }

            res.json(activities);
        } catch (error) {
            console.error('Recent activity error:', error);
            res.json([]);
        }
    });

    return router;
};