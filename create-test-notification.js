const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'product_management_system',
    port: process.env.DB_PORT || 3306,
    connectionLimit: 5
});

async function createTestNotification() {
    try {
        console.log('Creating test notification scenario...\n');
        
        // 1. Get an employee
        const [employees] = await pool.execute(`
            SELECT e.employee_id, u.user_id, u.full_name 
            FROM employees e 
            JOIN users u ON e.user_id = u.user_id 
            WHERE u.role = 'employee' 
            LIMIT 1
        `);
        
        if (employees.length === 0) {
            console.log('No employees found');
            return;
        }
        
        const employee = employees[0];
        console.log('Using employee:', employee.full_name);
        
        // 2. Get a product
        const [products] = await pool.execute('SELECT product_id, product_name FROM products LIMIT 1');
        
        if (products.length === 0) {
            console.log('No products found');
            return;
        }
        
        const product = products[0];
        console.log('Using product:', product.product_name);
        
        // 3. Get a monitor
        const [monitors] = await pool.execute('SELECT user_id, full_name FROM users WHERE role = "monitor" LIMIT 1');
        
        if (monitors.length === 0) {
            console.log('No monitors found');
            return;
        }
        
        const monitor = monitors[0];
        console.log('Using monitor:', monitor.full_name);
        
        // 4. Create a product request
        const [requestResult] = await pool.execute(`
            INSERT INTO product_requests (employee_id, product_id, quantity, purpose, return_date) 
            VALUES (?, ?, 1, 'Testing notification system', DATE_ADD(NOW(), INTERVAL 30 DAY))
        `, [employee.employee_id, product.product_id]);
        
        const requestId = requestResult.insertId;
        console.log('Created request ID:', requestId);
        
        // 5. Approve the request (simulate monitor approval)
        await pool.execute(`
            UPDATE product_requests 
            SET status = 'approved', processed_by = ?, processed_at = NOW() 
            WHERE request_id = ?
        `, [monitor.user_id, requestId]);
        
        console.log('Request approved by monitor');
        
        // 6. Test the notification count
        const [notificationCount] = await pool.execute(`
            SELECT COUNT(*) as count FROM product_requests pr 
            JOIN employees e ON pr.employee_id = e.employee_id 
            WHERE e.user_id = ? AND pr.status IN ('approved', 'rejected') 
            AND pr.processed_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
        `, [employee.user_id]);
        
        console.log(`\nNotification count for ${employee.full_name}: ${notificationCount[0].count}`);
        
        if (notificationCount[0].count > 0) {
            console.log('✅ Notification system is working! The employee should see a notification badge.');
        } else {
            console.log('❌ Notification system may have an issue.');
        }
        
        // 7. Show the request details
        const [requestDetails] = await pool.execute(`
            SELECT pr.*, p.product_name, u.full_name as processed_by_name
            FROM product_requests pr
            JOIN products p ON pr.product_id = p.product_id
            LEFT JOIN users u ON pr.processed_by = u.user_id
            WHERE pr.request_id = ?
        `, [requestId]);
        
        console.log('\nRequest details:');
        console.log('Product:', requestDetails[0].product_name);
        console.log('Status:', requestDetails[0].status);
        console.log('Processed by:', requestDetails[0].processed_by_name);
        console.log('Processed at:', requestDetails[0].processed_at);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

createTestNotification();