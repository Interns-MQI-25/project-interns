const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createMonitorUser() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'product_management_system'
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.beginTransaction();

        // Check if user already exists
        const [existingUsers] = await connection.execute(
            'SELECT * FROM users WHERE username = ?', 
            ['sigma']
        );

        if (existingUsers.length > 0) {
            console.log('User "sigma" already exists');
            console.log('Current user details:', {
                username: existingUsers[0].username,
                full_name: existingUsers[0].full_name,
                email: existingUsers[0].email,
                role: existingUsers[0].role
            });

            // Update to monitor role if not already
            if (existingUsers[0].role !== 'monitor') {
                await connection.execute(
                    'UPDATE users SET role = ? WHERE username = ?',
                    ['monitor', 'sigma']
                );
                console.log('✅ Updated user role to monitor');

                // Create monitor assignment
                await connection.execute(
                    'INSERT INTO monitor_assignments (user_id, assigned_by, start_date, end_date, is_active) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 1) ON DUPLICATE KEY UPDATE is_active = 1',
                    [existingUsers[0].user_id, 1]
                );
                console.log('✅ Created monitor assignment');
            }
        } else {
            // Hash password
            const hashedPassword = await bcrypt.hash('sigma', 10);

            // Get a default department (or create one)
            let [departments] = await connection.execute('SELECT * FROM departments LIMIT 1');
            let departmentId;

            if (departments.length === 0) {
                // Create a default department
                const [deptResult] = await connection.execute(
                    'INSERT INTO departments (department_name, description) VALUES (?, ?)',
                    ['IT Department', 'Information Technology Department']
                );
                departmentId = deptResult.insertId;
                console.log('✅ Created default IT department');
            } else {
                departmentId = departments[0].department_id;
            }

            // Create user
            const [userResult] = await connection.execute(
                'INSERT INTO users (username, full_name, email, password, role, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                ['sigma', 'Sigma Monitor', 'sigma@example.com', hashedPassword, 'monitor']
            );

            const userId = userResult.insertId;
            console.log('✅ Created monitor user');

            // Create employee record first (required for the database structure)
            await connection.execute(
                'INSERT INTO employees (user_id, department_id, is_active) VALUES (?, ?, 1)',
                [userId, departmentId]
            );
            console.log('✅ Created employee record');

            // Get admin user ID for assigned_by field
            const [adminUsers] = await connection.execute(
                'SELECT user_id FROM users WHERE role = "admin" LIMIT 1'
            );
            const adminId = adminUsers[0]?.user_id || 1;

            // Create monitor assignment
            await connection.execute(
                'INSERT INTO monitor_assignments (user_id, assigned_by, start_date, end_date, is_active) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 1)',
                [userId, adminId]
            );
            console.log('✅ Created monitor assignment');
        }

        await connection.commit();
        console.log('\n🎉 Monitor user ready!');
        console.log('Login credentials:');
        console.log('Username: sigma');
        console.log('Password: sigma');
        console.log('URL: http://localhost:3000');

        await connection.end();
    } catch (error) {
        console.error('❌ Error creating monitor user:', error);
        process.exit(1);
    }
}

createMonitorUser();
