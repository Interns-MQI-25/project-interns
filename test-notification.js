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

async function testNotificationSystem() {
    try {
        console.log('Testing notification system...\n');
        
        // 1. Check if there are any employees
        const [employees] = await pool.execute('SELECT user_id, full_name FROM users WHERE role = "employee"');
        console.log('Employees found:', employees.length);
        
        if (employees.length > 0) {
            const testEmployee = employees[0];
            console.log('Testing with employee:', testEmployee.full_name);
            
            // 2. Check recent processed requests for this employee
            const [recentRequests] = await pool.execute(`
                SELECT pr.*, p.product_name, pr.processed_at
                FROM product_requests pr 
                JOIN employees e ON pr.employee_id = e.employee_id 
                JOIN products p ON pr.product_id = p.product_id
                WHERE e.user_id = ? AND pr.status IN ('approved', 'rejected')
                ORDER BY pr.processed_at DESC
                LIMIT 5
            `, [testEmployee.user_id]);
            
            console.log('\nRecent processed requests:');
            recentRequests.forEach(req => {
                console.log(`- ${req.product_name}: ${req.status} on ${req.processed_at}`);
            });
            
            // 3. Test the notification count query
            const [notificationCount] = await pool.execute(`
                SELECT COUNT(*) as count FROM product_requests pr 
                JOIN employees e ON pr.employee_id = e.employee_id 
                WHERE e.user_id = ? AND pr.status IN ('approved', 'rejected') 
                AND pr.processed_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
            `, [testEmployee.user_id]);
            
            console.log(`\nNotification count for ${testEmployee.full_name}: ${notificationCount[0].count}`);
            
            // 4. Check all requests for this employee
            const [allRequests] = await pool.execute(`
                SELECT pr.*, p.product_name
                FROM product_requests pr 
                JOIN employees e ON pr.employee_id = e.employee_id 
                JOIN products p ON pr.product_id = p.product_id
                WHERE e.user_id = ?
                ORDER BY pr.requested_at DESC
            `, [testEmployee.user_id]);
            
            console.log(`\nAll requests for ${testEmployee.full_name}:`);
            allRequests.forEach(req => {
                console.log(`- ${req.product_name}: ${req.status} (requested: ${req.requested_at})`);
            });
        }
        
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await pool.end();
    }
}

testNotificationSystem();