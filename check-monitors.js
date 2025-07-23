const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkMonitorAssignments() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'product_management_system'
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        
        console.log('=== CURRENT USERS ===');
        const [users] = await connection.execute('SELECT user_id, username, full_name, role FROM users ORDER BY user_id');
        console.table(users);
        
        console.log('\n=== MONITOR ASSIGNMENTS ===');
        const [assignments] = await connection.execute(`
            SELECT ma.*, u.username, u.role 
            FROM monitor_assignments ma 
            JOIN users u ON ma.user_id = u.user_id 
            ORDER BY ma.assignment_id
        `);
        console.table(assignments);
        
        console.log('\n=== EMPLOYEES TABLE ===');
        const [employees] = await connection.execute(`
            SELECT e.*, u.username, u.role 
            FROM employees e 
            JOIN users u ON e.user_id = u.user_id 
            ORDER BY e.employee_id
        `);
        console.table(employees);
        
        await connection.end();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkMonitorAssignments();
