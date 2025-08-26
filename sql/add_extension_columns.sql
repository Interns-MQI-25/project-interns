-- Add extension request columns to product_assignments table
-- This script adds the missing columns for extension functionality

USE product_management_system;

-- Add extension columns if they don't exist
ALTER TABLE product_assignments 
ADD COLUMN IF NOT EXISTS extension_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS extension_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS new_return_date DATE NULL,
ADD COLUMN IF NOT EXISTS extension_status ENUM('none', 'requested', 'approved', 'rejected') DEFAULT 'none',
ADD COLUMN IF NOT EXISTS extension_requested_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS extension_processed_by INT NULL,
ADD COLUMN IF NOT EXISTS extension_processed_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS extension_remarks TEXT NULL;

-- Add foreign key constraint for extension_processed_by
ALTER TABLE product_assignments 
ADD CONSTRAINT fk_extension_processed_by 
FOREIGN KEY (extension_processed_by) REFERENCES users(user_id);

-- Display completion message
SELECT 'Extension columns added successfully!' as message;