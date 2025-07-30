-- Add return_status column to product_assignments table
ALTER TABLE product_assignments 
ADD COLUMN return_status ENUM('none', 'requested', 'approved') DEFAULT 'none';

-- Update existing returned items to 'approved' status
UPDATE product_assignments 
SET return_status = 'approved' 
WHERE is_returned = 1;