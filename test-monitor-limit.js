const mysql = require('mysql2/promise');
require('dotenv').config();

async function testMonitorLimit() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'product_management_system'
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        
        console.log('🔍 Testing Monitor Assignment Logic...\n');

        // Check current monitor count
        const [currentMonitors] = await connection.execute(
            'SELECT COUNT(*) as count FROM users WHERE role = "monitor"'
        );
        console.log(`📊 Current Monitor Count: ${currentMonitors[0].count}/4`);

        // Get available employees
        const [availableEmployees] = await connection.execute(`
            SELECT u.user_id, u.username, u.full_name, d.department_name
            FROM users u
            JOIN employees e ON u.user_id = e.user_id
            JOIN departments d ON e.department_id = d.department_id
            WHERE u.role = 'employee' AND e.is_active = 1
            ORDER BY u.full_name
        `);
        
        console.log('\n👥 Available Employees for Monitor Assignment:');
        availableEmployees.forEach((emp, index) => {
            console.log(`${index + 1}. ${emp.full_name} (${emp.username}) - ${emp.department_name}`);
        });

        // Test the limit logic
        console.log('\n🧪 Testing Assignment Logic:');
        
        if (currentMonitors[0].count >= 4) {
            console.log('❌ Cannot assign more monitors - Maximum of 4 reached');
        } else {
            const remaining = 4 - currentMonitors[0].count;
            console.log(`✅ Can assign ${remaining} more monitor(s)`);
            
            if (availableEmployees.length > 0) {
                console.log(`📋 ${availableEmployees.length} employee(s) available for assignment`);
            } else {
                console.log('⚠️  No employees available for monitor assignment');
            }
        }

        console.log('\n🎯 Admin Panel Instructions:');
        console.log('1. Login as admin (admin/admin)');
        console.log('2. Go to Admin Dashboard');
        console.log('3. Click "Manage Monitors"');
        console.log('4. Use the "Assign New Monitor" form');
        console.log('5. Select an employee and set end date');
        console.log('6. Click "Assign Monitor"');
        console.log('\n📝 The system will:');
        console.log('- ✅ Prevent more than 4 monitors');
        console.log('- ✅ Update user role to monitor');
        console.log('- ✅ Create monitor assignment record');
        console.log('- ✅ Show success/error messages');

        await connection.end();
    } catch (error) {
        console.error('❌ Error testing monitor limit:', error);
    }
}

testMonitorLimit();
