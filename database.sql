-- Product Management System Database Schema

-- Create database
CREATE DATABASE IF NOT EXISTS product_management_system;
USE product_management_system;

-- Drop existing tables in correct order to handle foreign key constraints
DROP TABLE IF EXISTS product_assignments;
DROP TABLE IF EXISTS product_requests;
DROP TABLE IF EXISTS stock_history;
DROP TABLE IF EXISTS registration_requests;
DROP TABLE IF EXISTS monitor_assignments;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS users;

-- Create users table
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

-- Create departments table
CREATE TABLE departments (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    description TEXT
);

-- Create employees table
CREATE TABLE employees (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    department_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

-- Create monitor_assignments table
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

-- Create registration_requests table
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

-- Create products table
CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    item_number INT,
    asset_type VARCHAR(50) ,
    product_category VARCHAR(100) ,
    product_name VARCHAR(500) ,
    model_number VARCHAR(100),
    serial_number VARCHAR(100),
    is_available BOOLEAN DEFAULT TRUE,
    quantity INT DEFAULT 1,
    added_by INT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calibration_required BOOLEAN DEFAULT FALSE,
    calibration_frequency VARCHAR(50),
    calibration_due_date DATE,
    FOREIGN KEY (added_by) REFERENCES users(user_id)
);

-- Create stock_history table
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

-- Create product_requests table
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

-- Create product_assignments table
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

-- Insert admin user
INSERT INTO users (username, full_name, email, password, role) 
VALUES ('admin', 'System Administrator', 'admin@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Insert departments
INSERT INTO departments (department_name, description) VALUES 
('IT', 'Information Technology Department'),
('HR', 'Human Resources Department'),
('Finance', 'Finance and Accounting Department'),
('Marketing', 'Marketing and Sales Department'),
('Operations', 'Operations and Logistics Department');

-- Set admin user ID variable
SET @admin_user_id = (SELECT user_id FROM users WHERE username = 'admin' LIMIT 1);

-- Insert products
INSERT INTO products (
    item_number,
    asset_type,
    product_category,
    product_name,
    model_number,
    serial_number,
    is_available,
    quantity,
    added_by,
    calibration_required,
    calibration_frequency,
    calibration_due_date
) VALUES
(1, 'Hardware', 'Power Supply', 'Scientific 30V, 5A Power supply', 'PSD3005', '45583213', TRUE, 1, @admin_user_id, TRUE, '1 Year', '2026-07-24'),
(2, 'Hardware', 'Power Supply', 'Scientific 30V, 5A Power supply', 'PSD3005', 'AEF093', TRUE, 1, @admin_user_id, TRUE, '2 Year', NULL),
(3, 'Hardware', 'Power Supply', 'Scientific 30V, 5A Power supply', 'PSD3005', NULL, TRUE, 1, @admin_user_id, TRUE, '3 Year', NULL),
(4, 'Hardware', 'Power Supply', 'Scientific 30V, 5A Power supply', 'PSD3005', 'AQRTV893048', TRUE, 1, @admin_user_id, TRUE, '4 Year', NULL),
(5, 'Hardware', 'Power Supply', 'Programmable Linear D.C. Power supply', 'GPD-2303S', '45583214', TRUE, 1, @admin_user_id, TRUE, '5 Year', NULL),
(6, 'Hardware', 'Power Supply', 'Programmable Linear D.C. Power supply', 'GPD-2303S', 'AEF094', TRUE, 1, @admin_user_id, TRUE, '6 Year', NULL),
(7, 'Hardware', 'Power Supply', 'D.C. Power Supply', 'GPS-3030D', NULL, TRUE, 1, @admin_user_id, TRUE, '7 Year', NULL),
(8, 'Hardware', 'Power Supply', 'D.C. Power Supply', 'GPS-3030D', 'AQRTV893049', TRUE, 1, @admin_user_id, TRUE, '8 Year', NULL),
(9, 'Hardware', 'Power Supply', 'D.C. Power Supply', 'GPS-3030D', '45583215', TRUE, 1, @admin_user_id, TRUE, '9 Year', NULL),
(10, 'Hardware', 'Power Supply', 'D.C. Power Supply', 'GPS-30300', 'AEF095', TRUE, 1, @admin_user_id, TRUE, '10 Year', NULL),
(11, 'Hardware', 'Power Supply', 'TDK lamda Power supply', NULL, NULL, TRUE, 1, @admin_user_id, TRUE, '11 Year', NULL),
(12, 'Hardware', 'Multimeter', 'Fluke True RMS Multimeter', '179', 'AQRTV893050', TRUE, 1, @admin_user_id, TRUE, '12 Year', NULL),
(13, 'Hardware', 'Multimeter', 'Fluke True RMS Multimeter', '179', '45583216', TRUE, 1, @admin_user_id, TRUE, '13 Year', NULL),
(14, 'Hardware', 'HD Oscilloscope', '200 MHz, 10 GS/s, 4 Ch, 12.5 Mpts/Ch 12-bit HD Oscilloscope with 12.1" WXGA Color Display', NULL, 'AEF096', TRUE, 1, @admin_user_id, TRUE, '14 Year', NULL),
(15, 'Hardware', 'Oscilloscope', '200 MHz, 4 Input Channels, Oscilloscope 2 GS/s interleaved, 140 Mpts interleaved DSO with 8" display', NULL, NULL, TRUE, 1, @admin_user_id, TRUE, '15 Year', NULL),
(16, 'Hardware', 'Picoscope', '3406D MSO', 'NA', 'AQRTV893051', TRUE, 1, @admin_user_id, TRUE, '16 Year', NULL),
(17, 'Hardware', 'Oscilloscope Probe', 'TA386 200MHz Oscilloscope Probe TA386 Max 600Volts PK', 'NA', '45583217', TRUE, 1, @admin_user_id, TRUE, '17 Year', NULL),
(18, 'Hardware', 'Passive Probe', 'T3PP350 Passive Probe SP2035 350MHz', 'NA', 'AEF097', TRUE, 1, @admin_user_id, TRUE, '18 Year', NULL),
(19, 'Hardware', 'Passive Probe', 'T3PP350 Passive Probe T3PP300 MHz,300Vrms CAT II', 'NA', NULL, TRUE, 1, @admin_user_id, TRUE, '19 Year', NULL),
(20, 'Hardware', 'Function Generator', '40MHz; 2 independent channels; 1.2GS/s; 16-bit vertical resolution; 8Mpts/ch memory Arbitary Function/Waveform Generator with 4.3 inch Touch Screen TFT LCD', NULL, 'AQRTV893052', TRUE, 1, @admin_user_id, TRUE, '20 Year', NULL),
(21, 'Hardware', 'CAN Hardware', 'CAN Disturbance Hardware-CANStress Tool', 'VH6501', '45583218', TRUE, 1, @admin_user_id, TRUE, '21 Year', NULL),
(22, 'Misc', 'USB Cable', 'USB Cable for CANStress Hardware', 'NA', 'AEF098', TRUE, 1, @admin_user_id, TRUE, '22 Year', NULL),
(23, 'Hardware', 'Test Hardware', 'Conformance Test Hardware', 'VH1150', NULL, TRUE, 1, @admin_user_id, TRUE, '23 Year', NULL),
(24, 'Hardware', 'USB Cable', 'USB Cable for Conformance Test Hardware', 'NA', 'AQRTV893053', TRUE, 1, @admin_user_id, TRUE, '24 Year', NULL),
(25, 'Hardware', 'Power Supply', 'Desktop Power Supply for Conformance Hardware', 'NA', '45583219', TRUE, 1, @admin_user_id, TRUE, '25 Year', NULL),
(26, 'Hardware', 'Cable', 'Y Cable for Conformance Test Hardware', 'NA', 'AEF099', TRUE, 1, @admin_user_id, TRUE, '26 Year', NULL),
(27, 'Hardware', 'Terminator', 'CAN Terminator with Conformance Test Hardware', 'NA', NULL, TRUE, 1, @admin_user_id, TRUE, '27 Year', NULL),
(28, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN/Diva/XCP', 'VN1630A', 'AQRTV893054', TRUE, 1, @admin_user_id, TRUE, '28 Year', NULL),
(29, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN(J1939) NL', 'VN1630A', '45583220', TRUE, 1, @admin_user_id, TRUE, '29 Year', NULL),
(30, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN(J1939) NL', 'VN1630A', 'AEF100', TRUE, 1, @admin_user_id, TRUE, '30 Year', NULL),
(31, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN 12.0', 'VN1630A', NULL, TRUE, 1, @admin_user_id, TRUE, '31 Year', NULL),
(32, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN NL', 'VN1630A', 'AQRTV893055', TRUE, 1, @admin_user_id, TRUE, '32 Year', NULL),
(33, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN 11.0', 'VN1630A', '45583221', TRUE, 1, @admin_user_id, TRUE, '33 Year', NULL),
(34, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN', 'VN1630A', 'AEF101', TRUE, 1, @admin_user_id, TRUE, '34 Year', NULL),
(35, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN 12.0', 'VN1630A', NULL, TRUE, 1, @admin_user_id, TRUE, '35 Year', NULL),
(36, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN 17.0', 'VN1640A', 'AQRTV893056', TRUE, 1, @admin_user_id, TRUE, '36 Year', NULL),
(37, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN 17.0', 'VN1640A', '45583222', TRUE, 1, @admin_user_id, TRUE, '37 Year', NULL),
(38, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN 17 & 18', 'VN1640A', 'AEF102', TRUE, 1, @admin_user_id, TRUE, '38 Year', NULL),
(39, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN NL Canoe 18 License Vector ID: 55000324146, 55004052271', 'VN1640A', NULL, TRUE, 1, @admin_user_id, TRUE, '39 Year', NULL),
(40, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN NL Canoe 18 License Vector ID: 55000324145, 55004052270', 'VN1640A', 'AQRTV893057', TRUE, 1, @admin_user_id, TRUE, '40 Year', NULL),
(41, 'Hardware', 'Canoe Hardware', 'Canoe Network Interface - CAN/LIN', 'VN1640A', '45583223', TRUE, 1, @admin_user_id, TRUE, '41 Year', NULL),
(42, 'Hardware', 'Vector Keyman', 'Vector Keyman / Dongle', 'NA', 'AEF103', TRUE, 1, @admin_user_id, TRUE, '42 Year', NULL),
(43, 'Hardware', 'Digit Multimeter', 'Digit multimeter model 2100 6 1/2', NULL, NULL, TRUE, 1, @admin_user_id, TRUE, '43 Year', NULL),
(44, 'Misc', 'Debug Interface', 'Lauterbach Power Debug Interface - Power Debug Module USB 3.0', 'NA', 'AQRTV893058', TRUE, 1, @admin_user_id, TRUE, '44 Year', NULL),
(45, 'Misc', 'Debug Interface', 'Lauterbach Power Debug Interface - Power Debug Module USB 3.0', 'NA', '45583224', TRUE, 1, @admin_user_id, TRUE, '45 Year', NULL),
(46, 'Misc', 'Debugger', 'Debugger for Cortex-M-JTAG Cable', 'NA', 'AEF104', TRUE, 1, @admin_user_id, TRUE, '46 Year', NULL),
(47, 'Misc', 'Debugger', 'Debugger for Cortex-M-A-JTAG Cable (Tricore)', 'NA', NULL, TRUE, 1, @admin_user_id, TRUE, '47 Year', NULL),
(48, 'Misc', 'USB Cable', 'USB Cable for Lauterbach - USB 3.0', 'NA', 'AQRTV893059', TRUE, 1, @admin_user_id, TRUE, '48 Year', NULL),
(49, 'Misc', 'USB Cable', 'USB Cable for Lauterbach - USB 2.0', 'NA', '45583225', TRUE, 1, @admin_user_id, TRUE, '49 Year', NULL),
(50, 'Misc', 'USB Cable', 'USB Cable for Canoe', 'NA', 'AEF105', TRUE, 1, @admin_user_id, TRUE, '50 Year', NULL),
(51, 'Misc', 'USB Cable', 'USB Cable for Canoe', 'NA', NULL, TRUE, 1, @admin_user_id, TRUE, '51 Year', NULL),
(52, 'Misc', 'USB Cable', 'USB Cable for Canoe', 'NA', 'AQRTV893060', TRUE, 1, @admin_user_id, TRUE, '52 Year', NULL),
(53, 'Misc', 'USB Cable', 'USB Cable for Canoe', 'NA', '45583226', TRUE, 1, @admin_user_id, TRUE, '53 Year', NULL),
(54, 'Misc', 'Connectors', 'Crocodile Pin Connectors', 'NA', 'AEF106', TRUE, 1, @admin_user_id, TRUE, '54 Year', NULL),
(55, 'Software', 'Canoe Software', 'Canoe Software with CAN/LIN', 'Version 11.0', NULL, TRUE, 1, @admin_user_id, TRUE, '55 Year', NULL),
(56, 'Software', 'Canoe Software', 'Canoe Software with CAN/LIN', 'Version 12.0', 'AQRTV893061', TRUE, 1, @admin_user_id, TRUE, '56 Year', NULL),
(57, 'Software', 'Canoe Software', 'Canoe Software with CAN/LIN', 'Version 12.0', '45583227', TRUE, 1, @admin_user_id, TRUE, '57 Year', NULL),
(58, 'Software', 'Canoe Software', 'Canoe Software with LIN', 'Version 12.0', 'AEF107', TRUE, 1, @admin_user_id, TRUE, '58 Year', NULL),
(59, 'Software', 'Canoe Software', 'Canoe Software with LIN', 'Version 12.0', NULL, TRUE, 1, @admin_user_id, TRUE, '59 Year', NULL),
(60, 'Software', 'Canoe Software', 'Canoe Software with LIN,DIVA,AMD/XCP', 'Version 11.0', 'AQRTV893062', TRUE, 1, @admin_user_id, TRUE, '60 Year', NULL),
(61, 'Software', 'Canoe Software', 'Canoe Software with CAN/LIN', 'Version 11.0', '45583228', TRUE, 1, @admin_user_id, TRUE, '61 Year', NULL),
(62, 'Software', 'vFlash Software', 'vFlash Software', 'Version 7.0', 'AEF108', TRUE, 1, @admin_user_id, TRUE, '62 Year', NULL),
(63, 'Software', 'Vector Driver CD', 'Driver & Documentation for Vector Bus Interfaces', 'Version 11.0', NULL, TRUE, 1, @admin_user_id, TRUE, '63 Year', NULL),
(64, 'Software', 'Canoe Software CD', 'Probe,Test, Kleps 30, 4mm, 4A, RED', 'NA', 'AQRTV893063', TRUE, 1, @admin_user_id, TRUE, '64 Year', NULL),
(65, 'Software', 'vFlash Software CD', 'vFlash Software CD', 'NA', '45583229', TRUE, 1, @admin_user_id, FALSE, NULL, NULL),
(66, 'License', 'VAG License', 'Yearly Subscription for Porsche Projects', '5.1', 'AEF109', TRUE, 1, @admin_user_id, FALSE, NULL, NULL),
(67, 'License', 'AMTS License', 'Yearly Subscription for BMW Projects', 'NA', NULL, TRUE, 1, @admin_user_id, FALSE, NULL, NULL),
(68, 'Laptop', 'Hardware', 'Dell Laptop', '5580', 'AQRTV893064', TRUE, 1, @admin_user_id, FALSE, NULL, NULL),
(69, 'Hardware', 'Programmer', 'Multi Standard Programmer for laboratory usage-Desktop version High performance universal, dual channel programming tool for flash devices', NULL, '45583230', TRUE, 1, @admin_user_id, FALSE, NULL, NULL),
(70, 'Misc', 'Target cable', 'Target cable for MSP2100NET/2100NET-MQ customized,twisted pair,0.1m lengths with MDR36 connector on both ends', NULL, 'AEF110', TRUE, 1, @admin_user_id, FALSE, NULL, NULL),
(71, 'Misc', 'Power cable', 'Power supply target cable for MSP2100NET/2150NET-Standard open end, 4-wire power supply cable with connector for MSP2100NET and open end on other side,2m length', NULL, NULL, TRUE, 1, @admin_user_id, FALSE, NULL, NULL),
(72, 'Misc', 'USB Cable', 'Amazonbasics USB 2.0 Cable A-Male to Mini B - 6Ft and 1.8M', NULL, 'AQRTV893065', TRUE, 1, @admin_user_id, FALSE, NULL, NULL);

-- Create indexes for performance
CREATE INDEX idx_products_asset_type ON products(asset_type);
CREATE INDEX idx_products_category ON products(product_category);
CREATE INDEX idx_product_assignments_employee ON product_assignments(employee_id);
CREATE INDEX idx_product_assignments_returned ON product_assignments(is_returned);
CREATE INDEX idx_registration_requests_status ON registration_requests(status);
CREATE INDEX idx_monitor_assignments_active ON monitor_assignments(is_active);

-- Display completion message
SELECT 'Database setup completed successfully!' as message;

-- Add is_active column to users table
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Update existing users to be active
UPDATE users SET is_active = TRUE;

alter table products add column pr_no INT;
alter table products add column po_number VARCHAR(50);
alter table products add column inward_date DATE;
alter table products add column inwarded_by INT REFERENCES users(user_id);

ALTER TABLE products
    ADD COLUMN version_number VARCHAR(50),
    ADD COLUMN software_license_type VARCHAR(50),
    ADD COLUMN license_expiry DATE,
    ADD COLUMN renewal_frequency VARCHAR(50),
    ADD COLUMN next_renewal_date DATE;
   

