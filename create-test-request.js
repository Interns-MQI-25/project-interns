const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTestRequest() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        });

        // Get first employee and product
        const [employees] = await connection.execute('SELECT employee_id FROM employees LIMIT 1');
        const [products] = await connection.execute('SELECT product_id FROM products LIMIT 1');

        if (employees.length > 0 && products.length > 0) {
            await connection.execute(
                'INSERT INTO product_requests (employee_id, product_id, quantity, purpose, status) VALUES (?, ?, ?, ?, ?)',
                [employees[0].employee_id, products[0].product_id, 1, 'Test request', 'pending']
            );
            console.log('✅ Test request created');
        } else {
            console.log('❌ No employees or products found');
        }

        await connection.end();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

createTestRequest();