-- Add 'rejected' status to return_status enum
ALTER TABLE product_assignments 
MODIFY COLUMN return_status ENUM('none', 'requested', 'approved', 'rejected') DEFAULT 'none';