const mysql = require('mysql2/promise');

// Database configuration - different for production vs development
const dbConfig = process.env.NODE_ENV === 'production' ? {
    // Production: Use Unix socket for Cloud SQL
    socketPath: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5,
    waitForConnections: true,
    queueLimit: 0
} : {
    // Development: Use standard TCP connection
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Neha@012004',
    database: process.env.DB_NAME || 'product_management_system',
    port: process.env.DB_PORT || 3306,
    connectionLimit: 5,
    waitForConnections: true,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

module.exports = pool;