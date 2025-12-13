const mysql = require('mysql2/promise');

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

async function fixDatabase() {
    console.log('🔌 Connecting to TiDB Cloud...');
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('✅ Connected!');

        console.log('🛠️ Adding missing products columns...');

        // Add is_available
        try {
            await connection.execute(`
                ALTER TABLE products ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
            `);
            console.log('✅ Column is_available ensured');
        } catch (e) {
            console.log('⚠️ is_available check:', e.message);
        }

        console.log('🎉 Database patch complete!');
    } catch (error) {
        console.error('❌ Connection Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

fixDatabase();
