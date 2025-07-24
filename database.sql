-- Product Management System Database Schema

-- Create database
CREATE DATABASE IF NOT EXISTS product_management_system;
USE product_management_system;

-- Users table (common for all user types)
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('employee', 'monitor', 'admin') NOT NULL DEFAULT 'employee',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Departments table
CREATE TABLE departments (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    description TEXT
);

-- Employee details
CREATE TABLE employees (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    department_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

-- Monitor assignments
CREATE TABLE monitor_assignments (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    assigned_by INT NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (assigned_by) REFERENCES users(user_id)
);

-- Registration requests
CREATE TABLE registration_requests (
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
);

-- Products table
CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    description TEXT,
    quantity INT NOT NULL DEFAULT 0,
    added_by INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (added_by) REFERENCES users(user_id)
);

-- Product requests
CREATE TABLE product_requests (
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
);

-- Product assignments
CREATE TABLE product_assignments (
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
);

-- Stock history
CREATE TABLE stock_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    action ENUM('add', 'assign', 'return') NOT NULL,
    quantity INT NOT NULL,
    performed_by INT NOT NULL,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (performed_by) REFERENCES users(user_id)
);

-- Create admin user
INSERT INTO users (username, full_name, email, password, role) 
VALUES ('admin', 'System Administrator', 'admin@example.com', '$2y$10$somehashedpassword', 'admin');

-- Insert sample departments
INSERT INTO departments (department_name, description) VALUES 
('IT', 'Information Technology Department'),
('HR', 'Human Resources Department'),
('Finance', 'Finance and Accounting Department'),
('Marketing', 'Marketing and Sales Department'),
('Operations', 'Operations and Logistics Department');

-- Create indexes for performance
ALTER TABLE product_requests ADD COLUMN return_date TIMESTAMP NULL;

CREATE INDEX idx_product_requests_status ON product_requests(status);
CREATE INDEX idx_product_assignments_employee ON product_assignments(employee_id);
CREATE INDEX idx_product_assignments_returned ON product_assignments(is_returned);
CREATE INDEX idx_registration_requests_status ON registration_requests(status);
CREATE INDEX idx_monitor_assignments_active ON monitor_assignments(is_active);
