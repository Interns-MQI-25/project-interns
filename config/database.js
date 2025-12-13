const mysql = require('mysql2/promise');

// Database configuration - different for production vs development
const dbConfig = process.env.NODE_ENV === 'production' ? {
    // Production: Check if using socket path (Cloud SQL) or TCP (Windows)
    ...(process.env.DB_HOST && process.env.DB_HOST.startsWith('/') ? 
        { socketPath: process.env.DB_HOST } : 
        { 
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306
        }
    ),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5,
    waitForConnections: true,
    queueLimit: 0,
    ssl: { rejectUnauthorized: false }
} : {
    // Development: Use standard TCP connection
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'sigma',
    password: process.env.DB_PASSWORD || 'sigma',
    database: process.env.DB_NAME || 'product_management_system',
    port: process.env.DB_PORT || 3306,
    connectionLimit: 5,
    waitForConnections: true,
    queueLimit: 0,
    ssl: (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') ? { rejectUnauthorized: false } : undefined
};

const pool = mysql.createPool(dbConfig);

module.exports = pool;