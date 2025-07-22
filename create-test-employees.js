const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createTestEmployees() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'product_management_system'
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.beginTransaction();

        // Get department
        const [departments] = await connection.execute('SELECT * FROM departments LIMIT 1');
        const departmentId = departments[0].department_id;

        // Create test employees
        const testUsers = [
            { username: 'alice', full_name: 'Alice Johnson', email: 'alice@example.com', password: 'alice123' },
            { username: 'bob', full_name: 'Bob Smith', email: 'bob@example.com', password: 'bob123' },
            { username: 'charlie', full_name: 'Charlie Brown', email: 'charlie@example.com', password: 'charlie123' }
        ];

        for (const user of testUsers) {
            // Check if user already exists
            const [existing] = await connection.execute(
                'SELECT user_id FROM users WHERE username = ?',
                [user.username]
            );

            if (existing.length === 0) {
                const hashedPassword = await bcrypt.hash(user.password, 10);
                
                // Create user
                const [userResult] = await connection.execute(
                    'INSERT INTO users (username, full_name, email, password, role, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                    [user.username, user.full_name, user.email, hashedPassword, 'employee']
                );

                // Create employee record
                await connection.execute(
                    'INSERT INTO employees (user_id, department_id, is_active) VALUES (?, ?, 1)',
                    [userResult.insertId, departmentId]
                );

                console.log(`✅ Created employee: ${user.username}`);
            } else {
                console.log(`👤 Employee ${user.username} already exists`);
            }
        }

        await connection.commit();
        console.log('\n🎉 Test employees ready for monitor assignment!');
        console.log('You can now test the 4-monitor limit through the admin panel.');

        await connection.end();
    } catch (error) {
        console.error('❌ Error creating test employees:', error);
        process.exit(1);
    }
}

createTestEmployees();
