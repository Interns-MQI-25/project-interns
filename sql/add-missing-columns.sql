-- Add missing columns to products table
-- Run this script to add description and updated_at columns
USE product_management_system;

-- Add description column (ignore error if it already exists)
ALTER TABLE products 
ADD COLUMN description TEXT;

-- Add updated_at column (ignore error if it already exists)
ALTER TABLE products 
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Update existing records to set updated_at to added_at for consistency
UPDATE products 
SET updated_at = added_at 
WHERE updated_at IS NULL;
