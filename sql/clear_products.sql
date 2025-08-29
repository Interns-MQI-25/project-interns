-- Clear Products Table Script
-- Run this to clean all product data before Excel upload

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Clear product attachments first
DELETE FROM product_attachments;

-- Clear product assignments
DELETE FROM product_assignments;

-- Clear product requests
DELETE FROM product_requests;

-- Clear products table
DELETE FROM products;

-- Reset auto increment counters
ALTER TABLE products AUTO_INCREMENT = 1;
ALTER TABLE product_attachments AUTO_INCREMENT = 1;
ALTER TABLE product_assignments AUTO_INCREMENT = 1;
ALTER TABLE product_requests AUTO_INCREMENT = 1;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Show confirmation
SELECT 'Products table cleared successfully!' as Status;