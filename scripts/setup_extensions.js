const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupExtensions() {
    let connection;
    
    try {
        // Create connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'product_management_system'
        });

        console.log('Connected to database...');

        // Check if extension columns exist
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'product_assignments' 
            AND COLUMN_NAME IN ('extension_requested', 'extension_reason', 'new_return_date', 'extension_status', 'extension_requested_at', 'extension_processed_by', 'extension_processed_at', 'extension_remarks')
            AND TABLE_SCHEMA = DATABASE()
        `);

        const existingColumns = columns.map(col => col.COLUMN_NAME);
        console.log('Existing extension columns:', existingColumns);

        const requiredColumns = [
            'extension_requested',
            'extension_reason', 
            'new_return_date',
            'extension_status',
            'extension_requested_at',
            'extension_processed_by',
            'extension_processed_at',
            'extension_remarks'
        ];

        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

        if (missingColumns.length === 0) {
            console.log('All extension columns already exist!');
            return;
        }

        console.log('Missing columns:', missingColumns);
        console.log('Adding extension columns...');

        // Add missing columns
        const alterStatements = [];
        
        if (!existingColumns.includes('extension_requested')) {
            alterStatements.push('ADD COLUMN extension_requested BOOLEAN DEFAULT FALSE');
        }
        if (!existingColumns.includes('extension_reason')) {
            alterStatements.push('ADD COLUMN extension_reason TEXT NULL');
        }
        if (!existingColumns.includes('new_return_date')) {
            alterStatements.push('ADD COLUMN new_return_date DATE NULL');
        }
        if (!existingColumns.includes('extension_status')) {
            alterStatements.push("ADD COLUMN extension_status ENUM('none', 'requested', 'approved', 'rejected') DEFAULT 'none'");
        }
        if (!existingColumns.includes('extension_requested_at')) {
            alterStatements.push('ADD COLUMN extension_requested_at TIMESTAMP NULL');
        }
        if (!existingColumns.includes('extension_processed_by')) {
            alterStatements.push('ADD COLUMN extension_processed_by INT NULL');
        }
        if (!existingColumns.includes('extension_processed_at')) {
            alterStatements.push('ADD COLUMN extension_processed_at TIMESTAMP NULL');
        }
        if (!existingColumns.includes('extension_remarks')) {
            alterStatements.push('ADD COLUMN extension_remarks TEXT NULL');
        }

        if (alterStatements.length > 0) {
            const alterQuery = `ALTER TABLE product_assignments ${alterStatements.join(', ')}`;
            await connection.execute(alterQuery);
            console.log('Extension columns added successfully!');
        }

        // Add foreign key constraint if extension_processed_by was added
        if (!existingColumns.includes('extension_processed_by')) {
            try {
                await connection.execute(`
                    ALTER TABLE product_assignments 
                    ADD CONSTRAINT fk_extension_processed_by 
                    FOREIGN KEY (extension_processed_by) REFERENCES users(user_id)
                `);
                console.log('Foreign key constraint added successfully!');
            } catch (fkError) {
                console.log('Foreign key constraint may already exist or failed:', fkError.message);
            }
        }

        console.log('Extension setup completed successfully!');

    } catch (error) {
        console.error('Error setting up extensions:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the setup
setupExtensions();