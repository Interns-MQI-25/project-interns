const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkExpiredMonitors() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        });

        await connection.beginTransaction();

        try {
            // Find expired monitors
            const [expiredMonitors] = await connection.execute(`
                SELECT ma.user_id, u.full_name 
                FROM monitor_assignments ma
                JOIN users u ON ma.user_id = u.user_id
                WHERE ma.is_active = 1 AND ma.end_date < CURDATE()
            `);

            for (const monitor of expiredMonitors) {
                // Change role back to employee
                await connection.execute(
                    'UPDATE users SET role = "employee" WHERE user_id = ?',
                    [monitor.user_id]
                );

                // Deactivate monitor assignment
                await connection.execute(
                    'UPDATE monitor_assignments SET is_active = 0 WHERE user_id = ? AND is_active = 1',
                    [monitor.user_id]
                );

                console.log(`✅ Monitor ${monitor.full_name} expired and deactivated`);
            }

            await connection.commit();
            
            if (expiredMonitors.length === 0) {
                console.log('✅ No expired monitors found');
            }

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            await connection.end();
        }

    } catch (error) {
        console.error('❌ Error checking expired monitors:', error);
    }
}

module.exports = checkExpiredMonitors;

// Run if called directly
if (require.main === module) {
    checkExpiredMonitors();
}