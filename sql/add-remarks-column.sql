USE product_management_system;

-- Add remarks column to product_assignments table
ALTER TABLE product_assignments 
ADD remarks TEXT NULL;

-- Display completion message
SELECT 'Remarks column added successfully!' as message;
