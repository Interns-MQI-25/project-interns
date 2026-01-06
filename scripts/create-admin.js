const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createAdmins() {
    console.log('🔧 Creating admin users...');
    
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'sigma',
            password: process.env.DB_PASSWORD || 'sigma',
            port: process.env.DB_PORT || 3306,
            database: process.env.DB_NAME || 'product_management_system',
            connectTimeout: 60000  // 60 seconds
        });
        
        console.log('✅ Connected to database');
        
        // Remove ALL existing users to start fresh
        // console.log('🗑️ Removing all existing users...');
        // Disable foreign key checks to allow deletion
        // await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        // await connection.execute('DELETE FROM users');
        // await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        // console.log('✅ All existing users removed');
        
        // Remove any existing superadmin users
        // console.log('🗑️ Removing superadmin users...');
        // await connection.execute('DELETE FROM users WHERE role = ?', ['superadmin']);
        // console.log('✅ Superadmin users removed');
        // Define the 2 admin users only


        const adminUsers = [
            {
                username: 'GuddiS',
                full_name: 'Somling Guddi',
                email: 'Somling.Guddi@marquardt.com ',
                password: 'Welcome@MQI'
            },
            {
                username: 'KatragaddaV',
                full_name: 'Venubabu Katragadda',
                email: 'Venubabu.Katragadda@marquardt.com',
                password: 'Welcome@MQI'
            }
        ];
        
        console.log('👥 Creating 2 admin users...');
        
        for (const adminData of adminUsers) {
            // Check if admin user already exists
            const [existingUser] = await connection.execute(
                'SELECT * FROM users WHERE BINARY username = ?', 
                [adminData.username]
            );
            
            const hashedPassword = await bcrypt.hash(adminData.password, 10);
            
            if (existingUser.length > 0) {
                console.log(`📝 Updating existing admin: ${adminData.username}`);
                
                // Update existing admin
                await connection.execute(`
                    UPDATE users 
                    SET full_name = ?, email = ?, password = ?, role = ?, is_active = 1 
                    WHERE BINARY username = ?
                `, [
                    adminData.full_name,
                    adminData.email,
                    hashedPassword,
                    'admin',
                    adminData.username
                ]);
            } else {
                console.log(`➕ Creating new admin: ${adminData.username}`);
                
                // Create new admin user
                await connection.execute(`
                    INSERT INTO users (username, full_name, email, password, role, is_active) 
                    VALUES (?, ?, ?, ?, ?, 1)
                `, [
                    adminData.username,
                    adminData.full_name,
                    adminData.email,
                    hashedPassword,
                    'admin'
                ]);
            }
            
            // Test password verification
            const testResult = await bcrypt.compare(adminData.password, hashedPassword);
            console.log(`   ✅ Password verification for ${adminData.username}:`, testResult ? 'PASSED' : 'FAILED');
        }
        
        // Create admin_assignments table if it doesn't exist
        console.log('📋 Creating admin assignments table...');
        
        // Drop table if exists to recreate with correct schema
        await connection.execute('DROP TABLE IF EXISTS admin_assignments');
        
        await connection.execute(`
            CREATE TABLE admin_assignments (
                assignment_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                assigned_by INT NOT NULL,
                start_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                end_date DATETIME NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                FOREIGN KEY (assigned_by) REFERENCES users(user_id) ON DELETE CASCADE
            )
        `);
        
        // Create admin assignment records
        const [adminIds] = await connection.execute(
            'SELECT user_id, username FROM users WHERE role = ? ORDER BY user_id', 
            ['admin']
        );
        
        if (adminIds.length > 0) {
            const firstAdminId = adminIds[0].user_id;
            
            for (const admin of adminIds) {
                // Check if assignment already exists
                const [existingAssignment] = await connection.execute(
                    'SELECT * FROM admin_assignments WHERE user_id = ? AND is_active = 1',
                    [admin.user_id]
                );
                
                if (existingAssignment.length === 0) {
                    await connection.execute(`
                        INSERT INTO admin_assignments (user_id, assigned_by, start_date, end_date, is_active) 
                        VALUES (?, ?, NOW(), NULL, 1)
                    `, [admin.user_id, firstAdminId]);
                    
                    console.log(`   📋 Created admin assignment for: ${admin.username}`);
                }
            }
        }
        
        await connection.end();
        
        console.log('🎉 Admin users creation complete!');
        console.log('🔑 Login credentials:');
        adminUsers.forEach(admin => {
            console.log(`   Username: ${admin.username} | Password: ${admin.password}`);
        });
        console.log('\n📝 All admins have equal access level and can:');
        console.log('   - Manage employees and monitors');
        console.log('   - Process registration requests');
        console.log('   - Manage inventory and stock');
        console.log('   - View system history and reports');
        console.log('   - Assign/unassign other admins (peer-to-peer)');
        
    } catch (error) {
        console.error('❌ Error creating admin users:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    }
}

createAdmins();