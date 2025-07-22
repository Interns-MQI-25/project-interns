require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2');

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'asset_management',
    port: process.env.DB_PORT || 3306
});

async function createDefaultUsers() {
    try {
        console.log('Creating default users with hashed passwords...');
        
        // Hash passwords
        const adminPassword = await bcrypt.hash('admin123', 10);
        const managerPassword = await bcrypt.hash('manager123', 10);
        const employeePassword = await bcrypt.hash('employee123', 10);
        
        // Clear existing users (optional)
        await new Promise((resolve, reject) => {
            db.query('DELETE FROM users', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // Create users
        const users = [
            ['admin', adminPassword, 'System Administrator', 'admin'],
            ['manager1', managerPassword, 'John Manager', 'manager'],
            ['employee1', employeePassword, 'Jane Employee', 'employee']
        ];
        
        for (const user of users) {
            await new Promise((resolve, reject) => {
                db.query(
                    'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
                    user,
                    (err, result) => {
                        if (err) reject(err);
                        else {
                            console.log(`✓ Created ${user[3]}: ${user[0]}`);
                            resolve(result);
                        }
                    }
                );
            });
        }
        
        console.log('\n✅ Default users created successfully!');
        console.log('\nLogin Credentials:');
        console.log('Admin: admin / admin123');
        console.log('Manager: manager1 / manager123');
        console.log('Employee: employee1 / employee123');
        
    } catch (error) {
        console.error('❌ Error creating users:', error);
    } finally {
        db.end();
    }
}

// Connect to database and create users
db.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed:', err);
        console.log('\nPlease ensure:');
        console.log('1. MySQL server is running');
        console.log('2. Database "asset_management" exists');
        console.log('3. Database credentials in this file are correct');
        return;
    }
    console.log('✓ Connected to MySQL database');
    createDefaultUsers();
});
