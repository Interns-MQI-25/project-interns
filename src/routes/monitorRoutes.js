const express = require('express');
const router = express.Router();

// Monitor routes module
module.exports = (pool, requireAuth, requireRole) => {
    
    // Monitor: Approvals Route
    router.get('/approvals', requireAuth, requireRole(['monitor']), async (req, res) => {
        try {
            // Check all requests first
            const [allRequests] = await pool.execute('SELECT * FROM product_requests');
            console.log('All requests in database:', allRequests.length);
            console.log('All requests:', allRequests);
            
            // Get pending product requests
            const [requests] = await pool.execute(`
                SELECT pr.*, p.product_name, u.full_name as employee_name, d.department_name
                FROM product_requests pr
                JOIN products p ON pr.product_id = p.product_id
                JOIN employees e ON pr.employee_id = e.employee_id
                JOIN users u ON e.user_id = u.user_id
                JOIN departments d ON e.department_id = d.department_id
                WHERE pr.status = 'pending'
                ORDER BY pr.requested_at ASC
            `);
            
            // Get pending return requests
            let returnRequests = [];
            try {
                const [returnResults] = await pool.execute(`
                    SELECT pa.*, p.product_name, u.full_name as employee_name, d.department_name
                    FROM product_assignments pa
                    JOIN products p ON pa.product_id = p.product_id
                    JOIN employees e ON pa.employee_id = e.employee_id
                    JOIN users u ON e.user_id = u.user_id
                    JOIN departments d ON e.department_id = d.department_id
                    WHERE pa.return_status = 'requested'
                    ORDER BY pa.assigned_at ASC
                `);
                returnRequests = returnResults || [];
            } catch (err) {
                console.log('Return requests query failed (column may not exist):', err.message);
            }
            
            console.log('Found pending requests:', requests.length);
            console.log('Found return requests:', returnRequests.length);
            
            res.render('monitor/approvals', { 
                user: req.session.user, 
                requests: requests || [], 
                returnRequests: returnRequests || [] 
            });
        } catch (error) {
            console.error('Approvals error:', error);
            res.render('monitor/approvals', { 
                user: req.session.user, 
                requests: [], 
                returnRequests: [] 
            });
        }
    });

    // Monitor: Inventory Route
    router.get('/inventory', requireAuth, requireRole(['monitor']), async (req, res) => {
        try {
            const [products] = await pool.execute('SELECT * FROM products ORDER BY product_name');
            res.render('monitor/inventory', { user: req.session.user, products });
        } catch (error) {
            console.error('Inventory error:', error);
            res.render('error', { message: 'Error loading inventory' });
        }
    });

    // Monitor: Stock Route
    router.get('/stock', requireAuth, requireRole(['monitor']), async (req, res) => {
        try {
            const productsQuery = `
                SELECT 
                    p.*,
                    u.full_name as added_by_name,
                    COALESCE((
                        SELECT COUNT(*) 
                        FROM product_assignments pa 
                        WHERE pa.product_id = p.product_id
                    ), 0) as total_assignments,
                    COALESCE((
                        SELECT SUM(pa.quantity) 
                        FROM product_assignments pa 
                        WHERE pa.product_id = p.product_id AND pa.is_returned = FALSE
                    ), 0) as currently_assigned,
                    CASE 
                        WHEN p.calibration_due_date IS NOT NULL AND p.calibration_due_date < CURDATE() THEN 'Overdue'
                        WHEN p.calibration_due_date IS NOT NULL AND p.calibration_due_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'Due Soon'
                        WHEN p.calibration_due_date IS NOT NULL THEN 'Current'
                        ELSE 'Not Required'
                    END as calibration_status
                FROM products p
                LEFT JOIN users u ON p.added_by = u.user_id
                ORDER BY p.asset_type, p.product_category, p.product_name
            `;
            
            const [products] = await pool.execute(productsQuery);
            
            // Stock statistics query
            const stockStatsQuery = `
                SELECT 
                    asset_type,
                    COUNT(*) as total_items,
                    SUM(quantity) as total_quantity,
                    SUM(CASE WHEN is_available = TRUE THEN quantity ELSE 0 END) as available_quantity,
                    SUM(CASE WHEN COALESCE(calibration_required, FALSE) = TRUE THEN 1 ELSE 0 END) as calibration_items,
                    SUM(CASE WHEN calibration_due_date IS NOT NULL AND calibration_due_date < CURDATE() THEN 1 ELSE 0 END) as overdue_calibrations
                FROM products
                GROUP BY asset_type
            `;
            
            const [stockStats] = await pool.execute(stockStatsQuery);
            
            res.render('monitor/stock', { 
                user: req.session.user, 
                products: products || [],
                stockStats: stockStats || []
            });
        } catch (error) {
            console.error('Monitor stock error:', error);
            res.render('monitor/stock', { 
                user: req.session.user, 
                products: [],
                stockStats: [],
                error: 'Error loading stock data'
            });
        }
    });

    // Monitor: Records Route
    router.get('/records', requireAuth, requireRole(['monitor']), async (req, res) => {
        try {
            const [records] = await pool.execute(`
                SELECT 
                    pa.*,
                    p.product_name,
                    u.full_name as employee_name,
                    d.department_name
                FROM product_assignments pa
                JOIN products p ON pa.product_id = p.product_id
                JOIN employees e ON pa.employee_id = e.employee_id
                JOIN users u ON e.user_id = u.user_id
                JOIN departments d ON e.department_id = d.department_id
                WHERE pa.monitor_id = ?
                ORDER BY pa.assigned_at DESC
            `, [req.session.user.user_id]);
            
            // Get statistics for the template
            const [totalProducts] = await pool.execute('SELECT COUNT(*) as count FROM products');
            const [totalAssignments] = await pool.execute('SELECT COUNT(*) as count FROM product_assignments WHERE monitor_id = ?', [req.session.user.user_id]);
            const [activeAssignments] = await pool.execute('SELECT COUNT(*) as count FROM product_assignments WHERE monitor_id = ? AND is_returned = FALSE', [req.session.user.user_id]);
            const [pendingRequests] = await pool.execute('SELECT COUNT(*) as count FROM product_requests WHERE status = "pending"');
            const [returnedItems] = await pool.execute('SELECT COUNT(*) as count FROM product_assignments WHERE monitor_id = ? AND is_returned = TRUE', [req.session.user.user_id]);
            
            res.render('monitor/records', { 
                user: req.session.user, 
                assignments: records,
                totalProducts: totalProducts[0].count,
                totalAssignments: totalAssignments[0].count,
                activeAssignments: activeAssignments[0].count,
                pendingRequests: pendingRequests[0].count,
                returnedItems: returnedItems[0].count
            });
        } catch (error) {
            console.error('Monitor records error:', error);
            res.render('error', { message: 'Error loading records' });
        }
    });

    // Monitor: Process Request Route
    router.post('/process-request', requireAuth, requireRole(['monitor']), async (req, res) => {
        const { request_id, action } = req.body;
        
        try {
            // Simple update - just change the status
            await pool.execute(
                'UPDATE product_requests SET status = ?, processed_by = ?, processed_at = NOW() WHERE request_id = ?',
                [action, req.session.user.user_id, request_id]
            );
            
            if (action === 'approved') {
                // Get request details
                const [requestDetails] = await pool.execute(
                    'SELECT * FROM product_requests WHERE request_id = ?',
                    [request_id]
                );
                
                if (requestDetails.length > 0) {
                    const request = requestDetails[0];
                    
                    // Create basic product assignment
                    await pool.execute(
                        'INSERT INTO product_assignments (product_id, employee_id, monitor_id, quantity) VALUES (?, ?, ?, ?)',
                        [request.product_id, request.employee_id, req.session.user.user_id, request.quantity]
                    );
                    
                    // Update product quantity
                    await pool.execute(
                        'UPDATE products SET quantity = quantity - ? WHERE product_id = ?',
                        [request.quantity, request.product_id]
                    );
                }
            }
            
            req.flash('success', `Request ${action} successfully`);
        } catch (error) {
            console.error('Process request error:', error);
            req.flash('error', 'Error processing request');
        }
        
        res.redirect('/monitor/approvals');
    });

    // Monitor: Process Return Request Route
    router.post('/process-return', requireAuth, requireRole(['monitor', 'admin']), async (req, res) => {
        const { assignment_id, action } = req.body;
        
        try {
            const connection = await pool.getConnection();
            await connection.beginTransaction();
            
            try {
                if (action === 'approve') {
                    // Get assignment details
                    const [assignments] = await connection.execute(
                        'SELECT * FROM product_assignments WHERE assignment_id = ? AND return_status = "requested"',
                        [assignment_id]
                    );
                    
                    if (assignments.length === 0) {
                        throw new Error('Assignment not found or not in requested status');
                    }
                    
                    const assignment = assignments[0];
                    
                    // Update assignment as returned and approved
                    await connection.execute(
                        'UPDATE product_assignments SET is_returned = 1, return_status = "approved", return_date = NOW() WHERE assignment_id = ?',
                        [assignment_id]
                    );
                    
                    // Restore product quantity
                    await connection.execute(
                        'UPDATE products SET quantity = quantity + ? WHERE product_id = ?',
                        [assignment.quantity, assignment.product_id]
                    );
                    
                    req.flash('success', 'Return approved successfully. Product is now available for request.');
                } else if (action === 'reject') {
                    // Reset return status to none
                    await connection.execute(
                        'UPDATE product_assignments SET return_status = "none" WHERE assignment_id = ?',
                        [assignment_id]
                    );
                    
                    req.flash('success', 'Return request rejected.');
                }
                
                await connection.commit();
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
            res.redirect('/monitor/approvals');
        } catch (error) {
            console.error('Process return error:', error);
            req.flash('error', 'Error processing return request');
            res.redirect('/monitor/approvals');
        }
    });

    // Monitor: Add Product Route
    router.post('/add-product', requireAuth, requireRole(['monitor', 'admin']), async (req, res) => {
        const { 
            product_name, 
            description, 
            category, 
            sub_category, 
            model_number, 
            serial_number,
            quantity,
            calibration_required,
            calibration_frequency,
            calibration_due_date
        } = req.body;
        
        try {
            const connection = await pool.getConnection();
            await connection.beginTransaction();
            
            try {
                // Insert product with all fields
                const [productResult] = await connection.execute(`
                    INSERT INTO products (
                        product_name, description, category, sub_category, 
                        model_number, serial_number, quantity, added_by,
                        calibration_required, calibration_frequency, calibration_due_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    product_name, description, category, sub_category,
                    model_number, serial_number, quantity, req.session.user.user_id,
                    calibration_required === 'on', calibration_frequency, 
                    calibration_due_date || null
                ]);
                
                // Add to stock history
                await connection.execute(`
                    INSERT INTO stock_history (product_id, action, quantity, performed_by, notes) 
                    VALUES (?, 'add', ?, ?, ?)
                `, [
                    productResult.insertId, 
                    quantity, 
                    req.session.user.user_id, 
                    'Initial stock added'
                ]);
                
                await connection.commit();
                req.flash('success', 'Product added successfully to main stock');
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
            const redirectPath = req.session.user.role === 'admin' ? '/admin/stock' : '/monitor/stock';
            res.redirect(redirectPath);
        } catch (error) {
            console.error('Add product error:', error);
            req.flash('error', 'Error adding product to stock');
            const redirectPath = req.session.user.role === 'admin' ? '/admin/stock' : '/monitor/stock';
            res.redirect(redirectPath);
        }
    });

    return router;
};
