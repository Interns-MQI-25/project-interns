// Simple database setup endpoint for production
const express = require('express');
const bcrypt = require('bcryptjs');

// Simple setup route that can be called to initialize the database
const setupDatabase = async (req, res) => {
    const pool = req.app.locals.pool;
    
    try {
        console.log('🔧 Starting database setup...');
        
        // First, let's check if tables exist
        const [tables] = await pool.execute("SHOW TABLES");
        console.log('📋 Existing tables:', tables.map(t => Object.values(t)[0]));
        
        if (tables.length === 0) {
            console.log('📝 No tables found, creating database schema...');
            
            // Create users table
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS users (
                    user_id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    full_name VARCHAR(100) NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    role ENUM('employee', 'monitor', 'admin') NOT NULL DEFAULT 'employee',
                    is_super_admin BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ Users table created');
            
            // Create departments table
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS departments (
                    department_id INT AUTO_INCREMENT PRIMARY KEY,
                    department_name VARCHAR(100) NOT NULL,
                    description TEXT
                )
            `);
            console.log('✅ Departments table created');
            
            // Create products table
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS products (
                    product_id INT AUTO_INCREMENT PRIMARY KEY,
                    product_name VARCHAR(100) NOT NULL,
                    description TEXT,
                    category VARCHAR(50),
                    quantity_in_stock INT DEFAULT 0,
                    minimum_quantity INT DEFAULT 0,
                    location VARCHAR(100),
                    barcode VARCHAR(100) UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ Products table created');
            
            // Create product_requests table (matching the test expectations)
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS product_requests (
                    request_id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    product_id INT NOT NULL,
                    quantity INT NOT NULL,
                    request_type ENUM('issue', 'return') NOT NULL,
                    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
                    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expected_return_date DATE,
                    actual_return_date DATE,
                    approved_by INT,
                    approved_date TIMESTAMP NULL,
                    notes TEXT,
                    INDEX idx_user_id (user_id),
                    INDEX idx_product_id (product_id),
                    INDEX idx_status (status)
                )
            `);
            console.log('✅ Product requests table created');
        }
        
        // Check if admin users exist
        const [adminUsers] = await pool.execute("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
        const adminCount = adminUsers[0].count;
        
        if (adminCount === 0) {
            console.log('👑 Creating admin users...');
            
            // Create default admin user
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            await pool.execute(`
                INSERT INTO users (username, full_name, email, password, role, is_super_admin) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, ['admin', 'System Administrator', 'admin@company.com', 'admin123', 'admin', true]);
            
            console.log('✅ Admin user created');
            console.log('📧 Email: admin@company.com');
            console.log('🔐 Password: admin123');
        }
        
        // Insert sample department if none exist
        const [depts] = await pool.execute("SELECT COUNT(*) as count FROM departments");
        if (depts[0].count === 0) {
            await pool.execute(`
                INSERT INTO departments (department_name, description) VALUES 
                ('IT', 'Information Technology'),
                ('HR', 'Human Resources'),
                ('Finance', 'Finance Department'),
                ('Operations', 'Operations Department')
            `);
            console.log('✅ Sample departments created');
        }
        
        // Insert sample products if none exist
        const [products] = await pool.execute("SELECT COUNT(*) as count FROM products");
        if (products[0].count === 0) {
            await pool.execute(`
                INSERT INTO products (product_name, description, category, quantity_in_stock, minimum_quantity, location) VALUES 
                ('Laptop', 'Dell Laptop for office use', 'Electronics', 10, 2, 'Store Room A'),
                ('Office Chair', 'Ergonomic office chair', 'Furniture', 25, 5, 'Store Room B'),
                ('Projector', 'Conference room projector', 'Electronics', 3, 1, 'Store Room A'),
                ('Whiteboard', 'Meeting room whiteboard', 'Office Supplies', 8, 2, 'Store Room C')
            `);
            console.log('✅ Sample products created');
        }
        
        res.json({
            success: true,
            message: 'Database setup completed successfully!',
            data: {
                tables: tables.map(t => Object.values(t)[0]),
                adminCount: adminCount,
                login: {
                    email: 'admin@company.com',
                    password: 'admin123'
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Database setup failed:', error);
        res.status(500).json({
            success: false,
            message: 'Database setup failed',
            error: error.message
        });
    }
};

module.exports = { setupDatabase };
