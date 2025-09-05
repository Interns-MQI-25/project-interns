const db = require('./config/sqlite');
const fs = require('fs');

// Read and execute SQL schema
const schema = fs.readFileSync('./sql/database.sql', 'utf8');

// Convert MySQL syntax to SQLite
const sqliteSchema = schema
    .replace(/AUTO_INCREMENT/g, 'AUTOINCREMENT')
    .replace(/INT AUTO_INCREMENT/g, 'INTEGER')
    .replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/g, 'DATETIME DEFAULT CURRENT_TIMESTAMP')
    .replace(/ON UPDATE CURRENT_TIMESTAMP/g, '')
    .replace(/ENGINE=InnoDB/g, '')
    .replace(/DEFAULT CHARSET=utf8mb4/g, '');

// Execute schema
try {
    db.exec(sqliteSchema);
    console.log('SQLite database initialized successfully');
} catch (error) {
    console.log('Database already exists or error:', error.message);
}

module.exports = db;