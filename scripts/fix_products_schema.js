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

        console.log('🛠️ Checking products table schema...');

        // Check for other required columns
        const requiredColumns = [
            { name: 'product_category', type: 'VARCHAR(100)' },
            { name: 'item_number', type: 'VARCHAR(100)' },
            { name: 'asset_type', type: 'VARCHAR(50)' },
            { name: 'model_number', type: 'VARCHAR(100)' },
            { name: 'serial_number', type: 'VARCHAR(100)' },
            { name: 'added_by', type: 'INT' },
            { name: 'calibration_required', type: 'BOOLEAN DEFAULT FALSE' },
            { name: 'calibration_frequency', type: 'VARCHAR(50)' },
            { name: 'calibration_due_date', type: 'DATE' },
            { name: 'quantity', type: 'INT DEFAULT 1' }
        ];

        for (const col of requiredColumns) {
            try {
                const [columns] = await connection.execute(`
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'products' 
                    AND COLUMN_NAME = '${col.name}' 
                    AND TABLE_SCHEMA = DATABASE()
                `);

                if (columns.length === 0) {
                    console.log(`⚠️ ${col.name} column missing. Adding it...`);
                    await connection.execute(`
                        ALTER TABLE products ADD COLUMN ${col.name} ${col.type};
                    `);
                    console.log(`✅ Added ${col.name} column.`);
                } else {
                    console.log(`✅ ${col.name} column exists.`);
                }
            } catch (e) {
                console.error(`❌ Error checking/adding ${col.name}:`, e.message);
            }
        }

        // Check if stock_history table exists
        try {
            const [tables] = await connection.execute(`
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_NAME = 'stock_history' 
                AND TABLE_SCHEMA = DATABASE()
            `);

            if (tables.length === 0) {
                console.log('⚠️ stock_history table missing. Creating it...');
                await connection.execute(`
                    CREATE TABLE stock_history (
                        history_id INT AUTO_INCREMENT PRIMARY KEY,
                        product_id INT NOT NULL,
                        action ENUM('add', 'assign', 'return', 'update') NOT NULL,
                        quantity INT NOT NULL,
                        performed_by INT NOT NULL,
                        performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        notes TEXT,
                        FOREIGN KEY (product_id) REFERENCES products(product_id),
                        FOREIGN KEY (performed_by) REFERENCES users(user_id)
                    );
                `);
                console.log('✅ Created stock_history table.');
            } else {
                console.log('✅ stock_history table exists.');
            }
        } catch (e) {
            console.error('❌ Error checking/creating stock_history table:', e.message);
        }

        // Update existing records to have a default asset_type if currently null
        console.log('🔄 Updating NULL asset_type values...');
        await connection.execute(`
            UPDATE products SET asset_type = 'Hardware' WHERE asset_type IS NULL;
        `);
        console.log('✅ Updated NULL asset_type values.');

        // Check for return_date in product_requests
        console.log('🛠️ Checking product_requests table schema...');
        try {
            const [columns] = await connection.execute(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'product_requests' 
                AND COLUMN_NAME = 'return_date' 
                AND TABLE_SCHEMA = DATABASE()
            `);

            if (columns.length === 0) {
                console.log('⚠️ return_date column missing in product_requests. Adding it...');
                await connection.execute(`
                    ALTER TABLE product_requests ADD COLUMN return_date DATE;
                `);
                console.log('✅ Added return_date column to product_requests.');
            } else {
                console.log('✅ return_date column exists in product_requests.');
            }
        } catch (e) {
            console.error('❌ Error checking/adding return_date to product_requests:', e.message);
        }

        // Check for processed_by in product_requests
        console.log('🛠️ Checking product_requests for processed_by...');
        try {
            const [columns] = await connection.execute(`
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'product_requests' AND COLUMN_NAME = 'processed_by' AND TABLE_SCHEMA = DATABASE()
            `);
            if (columns.length === 0) {
                console.log('⚠️ processed_by column missing in product_requests. Adding it...');
                await connection.execute("ALTER TABLE product_requests ADD COLUMN processed_by INT");
                console.log('✅ Added processed_by column.');
            } else {
                console.log('✅ processed_by column exists.');
            }
        } catch (e) { console.error('❌ Error checking processed_by:', e.message); }

        // Check for remarks in product_requests
        console.log('🛠️ Checking product_requests for remarks...');
        try {
            const [columns] = await connection.execute(`
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'product_requests' AND COLUMN_NAME = 'remarks' AND TABLE_SCHEMA = DATABASE()
            `);
            if (columns.length === 0) {
                console.log('⚠️ remarks column missing in product_requests. Adding it...');
                await connection.execute("ALTER TABLE product_requests ADD COLUMN remarks TEXT");
                console.log('✅ Added remarks column.');
            } else {
                console.log('✅ remarks column exists.');
            }
        } catch (e) { console.error('❌ Error checking remarks:', e.message); }

        // Check for product_assignments columns
        console.log('🛠️ Checking product_assignments schema...');
        const assignmentCols = [
            { name: 'return_date', type: 'DATE' },
            { name: 'monitor_id', type: 'INT' },
            { name: 'quantity', type: 'INT DEFAULT 1' },
            { name: 'extension_status', type: "ENUM('none', 'requested', 'approved', 'rejected') DEFAULT 'none'" },
            { name: 'extension_requested', type: 'BOOLEAN DEFAULT FALSE' },
            { name: 'extension_reason', type: 'TEXT' },
            { name: 'new_return_date', type: 'DATE' },
            { name: 'extension_requested_at', type: 'TIMESTAMP NULL' },
            { name: 'extension_processed_at', type: 'TIMESTAMP NULL' },
            { name: 'extension_processed_by', type: 'INT' },
            { name: 'extension_remarks', type: 'TEXT' },
            { name: 'return_status', type: "ENUM('none', 'requested', 'approved', 'rejected') DEFAULT 'none'" },
            { name: 'return_remarks', type: 'TEXT' },
            { name: 'remarks', type: 'TEXT' }
        ];

        for (const col of assignmentCols) {
            try {
                const [columns] = await connection.execute(`
                    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'product_assignments' AND COLUMN_NAME = '${col.name}' AND TABLE_SCHEMA = DATABASE()
                `);
                if (columns.length === 0) {
                    console.log(`⚠️ ${col.name} missing in product_assignments. Adding it...`);
                    await connection.execute(`ALTER TABLE product_assignments ADD COLUMN ${col.name} ${col.type}`);
                    console.log(`✅ Added ${col.name} column.`);
                } else {
                    console.log(`✅ ${col.name} exists in product_assignments.`);
                }
            } catch (e) {
                console.error(`❌ Error checking ${col.name} in assignments:`, e.message);
            }
        }

        console.log('🎉 Database fix complete!');
    } catch (error) {
        console.error('❌ Connection Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

fixDatabase();
