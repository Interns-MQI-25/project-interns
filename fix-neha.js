const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixNehaMonitor() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'product_management_system'
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.beginTransaction();

        // Update neha's role to monitor
        await connection.execute(
            'UPDATE users SET role = ? WHERE username = ?',
            ['monitor', 'neha']
        );
        console.log('✅ Updated neha role to monitor');

        // Create monitor assignment for neha
        await connection.execute(
            'INSERT INTO monitor_assignments (user_id, assigned_by, start_date, end_date, is_active) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 1)',
            [4, 1] // neha's user_id is 4, admin's user_id is 1
        );
        console.log('✅ Created monitor assignment for neha');

        await connection.commit();
        console.log('\n🎉 Neha is now a monitor!');
        console.log('Login credentials:');
        console.log('Username: neha');
        console.log('Password: (her existing password)');
        console.log('URL: http://localhost:3000');

        await connection.end();
    } catch (error) {
        console.error('❌ Error fixing neha monitor status:', error);
        process.exit(1);
    }
}

fixNehaMonitor();
