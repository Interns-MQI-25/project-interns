const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function resetPassword() {
    const connection = await mysql.createConnection({
        socketPath: '/cloudsql/mqi-ims:us-central1:product-management-db',
        user: 'sigma',
        password: 'sigma',
        database: 'product_management_system'
    });

    const newHash = await bcrypt.hash('Welcome@MQI', 10);
    await connection.execute('UPDATE users SET password = ? WHERE username = ?', [newHash, 'GuddiS']);
    
    console.log('Password updated successfully');
    await connection.end();
}

resetPassword().catch(console.error);