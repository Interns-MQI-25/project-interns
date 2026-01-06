const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: 'yqep7Jd558B1uEm.root',
    password: 'xASxSG7DJSxAjSFv',
    database: 'test',
    ssl: { rejectUnauthorized: false }
};

async function debugMyProducts() {
    let connection;
    try {
        console.log('Connecting...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        console.log('1. Checking Total Assignments...');
        const [allAssignments] = await connection.execute('SELECT * FROM product_assignments');
        console.log(`Total assignments: ${allAssignments.length}`);
        if (allAssignments.length > 0) {
            console.log('Sample assignment:', allAssignments[0]);
        }

        console.log('\n2. Testing Route Query (INNER JOIN)...');
        // This resembles the query in employeeRoutes.js
        const queryInner = `
            SELECT pa.assignment_id, p.product_name, u.full_name as monitor_name
            FROM product_assignments pa
            JOIN products p ON pa.product_id = p.product_id
            JOIN employees e ON pa.employee_id = e.employee_id
            JOIN users u ON pa.monitor_id = u.user_id
            WHERE pa.is_returned = 0
            LIMIT 5
        `;
        const [rowsInner] = await connection.execute(queryInner);
        console.log(`Rows returned with INNER JOIN: ${rowsInner.length}`);

        console.log('\n3. Testing Extension Approval UPDATE...');
        
        // Find an assignment to update
        const [assignments] = await connection.execute('SELECT assignment_id FROM product_assignments LIMIT 1');
        if (assignments.length === 0) {
             console.log('No assignments found to test update.');
             return;
        }
        const assignmentId = assignments[0].assignment_id;
        const userId = 1; // Mock user ID

        // This matches the query in monitorRoutes.js
        const queryUpdate = `
            UPDATE product_assignments 
            SET extension_status = "approved", 
                extension_processed_by = ?, 
                extension_processed_at = NOW(), 
                extension_remarks = ?, 
                return_date = new_return_date 
            WHERE assignment_id = ?
        `;
        
        console.log('Running UPDATE:', queryUpdate);
        await connection.execute(queryUpdate, [userId, 'Debug Approval', assignmentId]);
        console.log('✅ Extension UPDATE successful!');
        
    } catch (error) {
        console.error('❌ FAILURE:', error.code, error.message);
    } finally {
        if (connection) await connection.end();
    }
}

debugMyProducts();
