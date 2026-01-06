const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const config = {
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: 'yqep7Jd558B1uEm.root',
    password: 'xASxSG7DJSxAjSFv',
    database: 'test',
    ssl: {
        rejectUnauthorized: false
    }
};

async function fixUsers() {
    console.log('🔌 Connecting to TiDB Cloud...');
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('✅ Connected!');

        // Check for existing users
        const [existing] = await connection.execute('SELECT username, is_active FROM users');
        console.log('👥 Current users in DB:', existing);

        const passwordHash = await bcrypt.hash('Welcome@123', 10);
        
        // Define users to ensure exist
        const usersToFix = [
            {
                username: 'GuddiS',
                full_name: 'Somling Guddi',
                email: 'guddi.somling@marquardt.com',
                role: 'admin'
            },
            {
                username: 'KatragaddaV',
                full_name: 'Venubabu Katragadda',
                email: 'venubabu.katragadda@marquardt.com',
                role: 'admin'
            },
            {
                username: 'admin',
                full_name: 'System Administrator',
                email: 'admin@company.com',
                role: 'admin'
            }
        ];

        for (const user of usersToFix) {
            console.log(`🔍 Checking user ${user.username}...`);
            const [rows] = await connection.execute('SELECT * FROM users WHERE username = ?', [user.username]);
            
            if (rows.length === 0) {
                console.log(`➕ Creating user ${user.username}...`);
                await connection.execute(
                    'INSERT INTO users (username, full_name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, TRUE)',
                    [user.username, user.full_name, user.email, passwordHash, user.role]
                );
                console.log('✅ Created!');
            } else {
                console.log(`✅ User ${user.username} already exists. Updating to ensure active...`);
                await connection.execute('UPDATE users SET is_active = TRUE WHERE username = ?', [user.username]);
            }
        }

        console.log('🎉 User check/fix completed!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

fixUsers();
