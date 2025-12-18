require('dotenv').config();
const mysql = require('mysql2/promise');

const config = {
    host: process.env.DB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: parseInt(process.env.DB_PORT) || 4000,
    user: process.env.DB_USER || 'yqep7Jd558B1uEm.root',
    password: process.env.DB_PASSWORD || 'xASxSG7DJSxAjSFv',
    database: process.env.DB_NAME || 'test',
    ssl: { rejectUnauthorized: false }
};

async function cleanupUsers() {
    let connection;
    try {
        console.log('🔌 Connecting to database...');
        connection = await mysql.createConnection(config);
        
        // 1. Find SharmaP
        const [users] = await connection.execute('SELECT * FROM users WHERE username = "SharmaP"');
        if (users.length === 0) {
            console.error('❌ Target user "SharmaP" not found! Aborting.');
            return;
        }
        const sharma = users[0];
        console.log(`✅ Found SharmaP (User ID: ${sharma.user_id})`);

        // Get SharmaP's employee ID
        const [employees] = await connection.execute('SELECT * FROM employees WHERE user_id = ?', [sharma.user_id]);
        let sharmaEmpId = null;
        if (employees.length > 0) {
            sharmaEmpId = employees[0].employee_id;
            console.log(`✅ Found SharmaP Employee Profile (ID: ${sharmaEmpId})`);
        } else {
            console.log('⚠️ SharmaP has no employee profile. Creating one linked to first department...');
            const [depts] = await connection.execute('SELECT department_id FROM departments LIMIT 1');
            if(depts.length > 0) {
                const [res] = await connection.execute('INSERT INTO employees (user_id, department_id, is_active) VALUES (?, ?, 1)', [sharma.user_id, depts[0].department_id]);
                sharmaEmpId = res.insertId;
                console.log(`✅ Created SharmaP Employee Profile (ID: ${sharmaEmpId})`);
            } else {
                console.error('❌ No departments found. Cannot create employee profile.');
                return;
            }
        }

        // 2. Identify users to remove
        const [usersToRemove] = await connection.execute('SELECT user_id, username FROM users WHERE user_id != ?', [sharma.user_id]);
        console.log(`found ${usersToRemove.length} users to remove.`);

        if (usersToRemove.length === 0) {
            console.log('🎉 No other users to remove.');
            return;
        }

        const idsToRemove = usersToRemove.map(u => u.user_id);
        const idsString = idsToRemove.join(','); // Careful with empty, but verified length > 0
        const placeholders = idsToRemove.map(() => '?').join(',');

        console.log('🔄 Reassigning administrative records to SharmaP...');
        
        // Reassign products (added_by, inwarded_by)
        await connection.execute(`UPDATE products SET added_by = ? WHERE added_by IN (${placeholders})`, [sharma.user_id, ...idsToRemove]);
        await connection.execute(`UPDATE products SET inwarded_by = ? WHERE inwarded_by IN (${placeholders})`, [sharma.user_id, ...idsToRemove]);
        
        // Reassign assignments (monitor_id, returned_to, extension_processed_by)
        await connection.execute(`UPDATE product_assignments SET monitor_id = ? WHERE monitor_id IN (${placeholders})`, [sharma.user_id, ...idsToRemove]);
        await connection.execute(`UPDATE product_assignments SET returned_to = ? WHERE returned_to IN (${placeholders})`, [sharma.user_id, ...idsToRemove]);
        
        // Check column existence before updating extension_processed_by
        try {
            await connection.execute(`UPDATE product_assignments SET extension_processed_by = ? WHERE extension_processed_by IN (${placeholders})`, [sharma.user_id, ...idsToRemove]);
        } catch(e) { /* ignore if column missing */ }

        // Reassign product_requests (processed_by)
        await connection.execute(`UPDATE product_requests SET processed_by = ? WHERE processed_by IN (${placeholders})`, [sharma.user_id, ...idsToRemove]);
        
        // Reassign stock_history (performed_by)
        try {
            await connection.execute(`UPDATE stock_history SET performed_by = ? WHERE performed_by IN (${placeholders})`, [sharma.user_id, ...idsToRemove]);
        } catch(e) { /* ignore if table missing */ }

        console.log('🗑️  Deleting data for users to be removed...');

        // Get employee IDs of users to remove
        const [employeesToRemove] = await connection.execute(`SELECT employee_id FROM employees WHERE user_id IN (${placeholders})`, idsToRemove);
        const empIdsToRemove = employeesToRemove.map(e => e.employee_id);

        if (empIdsToRemove.length > 0) {
            const empPlaceholders = empIdsToRemove.map(() => '?').join(',');
            
            // Delete product assignments for these employees
            await connection.execute(`DELETE FROM product_assignments WHERE employee_id IN (${empPlaceholders})`, empIdsToRemove);
            
            // Delete product requests for these employees
            await connection.execute(`DELETE FROM product_requests WHERE employee_id IN (${empPlaceholders})`, empIdsToRemove);
            
            // Delete assigned_monitor_id refs in requests?
            // If they were assigned as monitors
             await connection.execute(`UPDATE product_requests SET assigned_monitor_id = ? WHERE assigned_monitor_id IN (${empPlaceholders})`, [sharmaEmpId, ...empIdsToRemove]);
        }

        // Delete monitor_assignments and admin_assignments where user is target
        await connection.execute(`DELETE FROM monitor_assignments WHERE user_id IN (${placeholders})`, idsToRemove);
        await connection.execute(`DELETE FROM admin_assignments WHERE user_id IN (${placeholders})`, idsToRemove);

        // Delete registration requests
        await connection.execute(`DELETE FROM registration_requests WHERE email IN (SELECT email FROM users WHERE user_id IN (${placeholders}))`, idsToRemove);

        // Finally Delete Employees (will rely on manual delete if cascade doesn't work, but let's do it explicitly to be safe)
        if (empIdsToRemove.length > 0) {
            const empPlaceholders = empIdsToRemove.map(() => '?').join(',');
            await connection.execute(`DELETE FROM employees WHERE employee_id IN (${empPlaceholders})`, empIdsToRemove);
        }

        // Delete Users
        await connection.execute(`DELETE FROM users WHERE user_id IN (${placeholders})`, idsToRemove);

        console.log('🎉 Cleanup complete. All other users removed.');

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

cleanupUsers();
