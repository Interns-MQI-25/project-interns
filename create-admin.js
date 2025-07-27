const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createAdmin() {
    console.log('🔧 Creating admin user...');
    
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3306,
            database: process.env.DB_NAME || 'product_management_system'
        });
        
        console.log('✅ Connected to database');
        
        // Check current admin user
        const [adminUser] = await connection.execute('SELECT * FROM users WHERE username = ?', ['admin']);
        
        if (adminUser.length > 0) {
            console.log('Current admin user found:', {
                username: adminUser[0].username,
                email: adminUser[0].email,
                role: adminUser[0].role
            });
            
            // Create new password hash
            const newPassword = 'admin';
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            // Update the admin password
            await connection.execute(
                'UPDATE users SET password = ? WHERE username = ?',
                [hashedPassword, 'admin']
            );
            
            console.log('✅ Admin password updated successfully');
            console.log('🔑 Login credentials:');
            console.log('   Username: admin');
            console.log('   Password: admin');
            
            // Test the password
            const testResult = await bcrypt.compare(newPassword, hashedPassword);
            console.log('✅ Password verification test:', testResult ? 'PASSED' : 'FAILED');
            
        } else {
            console.log('❌ Admin user not found. Creating new admin user...');
            
            const hashedPassword = await bcrypt.hash('admin', 10);
            await connection.execute(
                'INSERT INTO users (username, full_name, email, password, role) VALUES (?, ?, ?, ?, ?)',
                ['admin', 'System Administrator', 'admin@example.com', hashedPassword, 'admin']
            );
            
            console.log('✅ New admin user created');
        }
        
        await connection.end();
        console.log('🎉 Admin user creation complete!');
        
    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        process.exit(1);
    }
}

createAdmin();
