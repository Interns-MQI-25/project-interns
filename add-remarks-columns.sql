-- Add remarks columns for product requests and assignments
USE product_management_system;

-- Add remarks column to product_requests table
ALTER TABLE product_requests ADD COLUMN remarks TEXT NULL;

-- Add remarks column to product_assignments table  
ALTER TABLE product_assignments ADD COLUMN return_remarks TEXT NULL;

SELECT 'Remarks columns added successfully!' as message;