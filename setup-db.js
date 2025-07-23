const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function setupDatabase() {
    console.log('🔧 Setting up database...');
    
    try {
        // First connect without specifying database
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3306
        });
        
        console.log('✅ Connected to MySQL server');
        
        // Create database if it doesn't exist
        await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'product_management_system'}`);
        console.log('✅ Database created/verified');
        
        await connection.end();
        
        // Now connect to the specific database
        const dbConnection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3306,
            database: process.env.DB_NAME || 'product_management_system'
        });
        
        // Create tables
        console.log('📋 Creating tables...');
        
        // Users table
        await dbConnection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                user_id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('employee', 'monitor', 'admin') NOT NULL DEFAULT 'employee',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        // Departments table
        await dbConnection.execute(`
            CREATE TABLE IF NOT EXISTS departments (
                department_id INT AUTO_INCREMENT PRIMARY KEY,
                department_name VARCHAR(100) NOT NULL,
                description TEXT
            )
        `);
        
        // Employee details
        await dbConnection.execute(`
            CREATE TABLE IF NOT EXISTS employees (
                employee_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNIQUE NOT NULL,
                department_id INT NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                FOREIGN KEY (department_id) REFERENCES departments(department_id)
            )
        `);
        
        // Products table
        await dbConnection.execute(`
            CREATE TABLE IF NOT EXISTS products (
                product_id INT AUTO_INCREMENT PRIMARY KEY,
                product_name VARCHAR(100) NOT NULL,
                description TEXT,
                quantity INT NOT NULL DEFAULT 0,
                added_by INT NOT NULL,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (added_by) REFERENCES users(user_id)
            )
        `);
        
        // Product requests
        await dbConnection.execute(`
            CREATE TABLE IF NOT EXISTS product_requests (
                request_id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id INT NOT NULL,
                product_id INT NOT NULL,
                quantity INT NOT NULL DEFAULT 1,
                purpose TEXT NOT NULL,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                processed_by INT,
                processed_at TIMESTAMP NULL,
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
                FOREIGN KEY (product_id) REFERENCES products(product_id),
                FOREIGN KEY (processed_by) REFERENCES users(user_id)
            )
        `);
        
        // Product assignments
        await dbConnection.execute(`
            CREATE TABLE IF NOT EXISTS product_assignments (
                assignment_id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                employee_id INT NOT NULL,
                monitor_id INT NOT NULL,
                quantity INT NOT NULL DEFAULT 1,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                return_date TIMESTAMP NULL,
                is_returned BOOLEAN DEFAULT FALSE,
                returned_at TIMESTAMP NULL,
                returned_to INT,
                FOREIGN KEY (product_id) REFERENCES products(product_id),
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
                FOREIGN KEY (monitor_id) REFERENCES users(user_id),
                FOREIGN KEY (returned_to) REFERENCES users(user_id)
            )
        `);
        
        // Registration requests
        await dbConnection.execute(`
            CREATE TABLE IF NOT EXISTS registration_requests (
                request_id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(100) NOT NULL,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                department_id INT NOT NULL,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                processed_by INT,
                processed_at TIMESTAMP NULL,
                FOREIGN KEY (department_id) REFERENCES departments(department_id),
                FOREIGN KEY (processed_by) REFERENCES users(user_id)
            )
        `);
        
        // Monitor assignments
        await dbConnection.execute(`
            CREATE TABLE IF NOT EXISTS monitor_assignments (
                assignment_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                assigned_by INT NOT NULL,
                start_date DATETIME NOT NULL,
                end_date DATETIME NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                FOREIGN KEY (user_id) REFERENCES users(user_id),
                FOREIGN KEY (assigned_by) REFERENCES users(user_id)
            )
        `);
        
        // Stock history
        await dbConnection.execute(`
            CREATE TABLE IF NOT EXISTS stock_history (
                history_id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                action ENUM('add', 'assign', 'return') NOT NULL,
                quantity INT NOT NULL,
                performed_by INT NOT NULL,
                performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                FOREIGN KEY (product_id) REFERENCES products(product_id),
                FOREIGN KEY (performed_by) REFERENCES users(user_id)
            )
        `);
        
        console.log('✅ Tables created');
        
        // Insert departments
        await dbConnection.execute(`
            INSERT IGNORE INTO departments (department_name, description) VALUES 
            ('IT', 'Information Technology Department'),
            ('HR', 'Human Resources Department'),
            ('Finance', 'Finance and Accounting Department'),
            ('Marketing', 'Marketing and Sales Department'),
            ('Operations', 'Operations and Logistics Department')
        `);
        
        console.log('✅ Departments inserted');
        
        // Check if admin user exists
        const [adminCheck] = await dbConnection.execute('SELECT * FROM users WHERE username = ?', ['admin']);
        
        if (adminCheck.length === 0) {
            // Create admin user with proper password hash
            const hashedPassword = await bcrypt.hash('admin', 10);
            await dbConnection.execute(`
                INSERT INTO users (username, full_name, email, password, role) 
                VALUES ('admin', 'System Administrator', 'admin@example.com', ?, 'admin')
            `, [hashedPassword]);
            
            console.log('✅ Admin user created (username: admin, password: admin)');
        } else {
            console.log('✅ Admin user already exists');
        }
        
        // Add some sample products
        const [productCheck] = await dbConnection.execute('SELECT * FROM products LIMIT 1');
        if (productCheck.length === 0) {
            const [adminUser] = await dbConnection.execute('SELECT user_id FROM users WHERE username = ?', ['admin']);
            if (adminUser.length > 0) {
                await dbConnection.execute(`
                    INSERT INTO products (product_name, description, quantity, added_by) VALUES 
                    ('Laptop', 'Dell Latitude 5520 Laptop', 10, ?),
                    ('Mouse', 'Wireless Optical Mouse', 25, ?),
                    ('Keyboard', 'Mechanical Keyboard', 15, ?),
                    ('Monitor', '24 inch LED Monitor', 8, ?),
                    ('Headphones', 'Noise Cancelling Headphones', 12, ?)
                `, [adminUser[0].user_id, adminUser[0].user_id, adminUser[0].user_id, adminUser[0].user_id, adminUser[0].user_id]);
                
                console.log('✅ Sample products added');
            }
        }
        
        await dbConnection.end();
        console.log('🎉 Database setup complete!');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        process.exit(1);
    }
}

setupDatabase();
