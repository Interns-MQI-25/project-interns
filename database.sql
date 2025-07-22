CREATE DATABASE IF NOT EXISTS asset_management;
USE asset_management;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role ENUM('employee', 'manager', 'admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    quantity INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Requests table
CREATE TABLE requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approved_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL,
    returned BOOLEAN DEFAULT FALSE,
    returned_at TIMESTAMP NULL,
    FOREIGN KEY (employee_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Default users will be created by running: node create-users.js
-- This ensures properly hashed passwords

-- Insert sample products
INSERT INTO products (name, description, quantity) VALUES 
('Laptop', 'Dell Laptop for development work', 10),
('Mouse', 'Wireless optical mouse', 25),
('Keyboard', 'Mechanical keyboard', 15),
('Monitor', '24-inch LED monitor', 8),
('Headphones', 'Noise-canceling headphones', 12);
