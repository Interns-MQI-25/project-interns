const mysql = require('mysql2/promise');
require('dotenv').config();

async function testFourMonitorLimit() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'product_management_system'
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.beginTransaction();
        
        console.log('🧪 Testing 4-Monitor Limit...\n');

        // Step 1: Assign alice and bob as monitors (to reach limit of 4)
        const employeesToPromote = ['alice', 'bob'];
        
        for (const username of employeesToPromote) {
            // Get user
            const [users] = await connection.execute(
                'SELECT * FROM users WHERE username = ? AND role = "employee"',
                [username]
            );
            
            if (users.length > 0) {
                const user = users[0];
                
                // Check current monitor count
                const [activeMonitors] = await connection.execute(
                    'SELECT COUNT(*) as count FROM users WHERE role = "monitor"'
                );
                
                if (activeMonitors[0].count < 4) {
                    // Assign as monitor
                    await connection.execute(
                        'UPDATE users SET role = "monitor" WHERE user_id = ?',
                        [user.user_id]
                    );
                    
                    await connection.execute(
                        'INSERT INTO monitor_assignments (user_id, assigned_by, start_date, end_date, is_active) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 1)',
                        [user.user_id, 1]
                    );
                    
                    console.log(`✅ Assigned ${username} as monitor (${activeMonitors[0].count + 1}/4)`);
                } else {
                    console.log(`❌ Cannot assign ${username} - 4 monitor limit reached`);
                }
            }
        }

        // Step 2: Try to assign a 5th monitor (should fail)
        console.log('\n🚫 Testing 5th Monitor Assignment...');
        
        const [remainingEmployees] = await connection.execute(
            'SELECT * FROM users WHERE role = "employee" LIMIT 1'
        );
        
        if (remainingEmployees.length > 0) {
            const employee = remainingEmployees[0];
            
            // Check monitor count
            const [activeMonitors] = await connection.execute(
                'SELECT COUNT(*) as count FROM users WHERE role = "monitor"'
            );
            
            console.log(`Current monitors: ${activeMonitors[0].count}`);
            
            if (activeMonitors[0].count >= 4) {
                console.log(`❌ CORRECTLY BLOCKED: Cannot assign ${employee.username} - Maximum of 4 monitors reached`);
            } else {
                console.log(`⚠️  UNEXPECTED: Should have blocked assignment at 4 monitors`);
            }
        }

        await connection.commit();
        
        // Final status
        console.log('\n📊 Final Monitor Status:');
        const [finalMonitors] = await connection.execute(`
            SELECT u.username, u.full_name, u.role, ma.start_date
            FROM users u
            LEFT JOIN monitor_assignments ma ON u.user_id = ma.user_id AND ma.is_active = 1
            WHERE u.role = 'monitor'
            ORDER BY u.full_name
        `);
        
        console.table(finalMonitors);
        console.log(`\n✅ Total Monitors: ${finalMonitors.length}/4`);
        
        await connection.end();
    } catch (error) {
        console.error('❌ Error testing monitor limit:', error);
        process.exit(1);
    }
}

testFourMonitorLimit();
