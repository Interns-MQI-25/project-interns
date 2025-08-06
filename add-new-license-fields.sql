-- Add new license key and version fields for subscription software
USE product_management_system;

-- Add new license key and version columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS new_license_key VARCHAR(255) NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS new_version_number VARCHAR(50) NULL;

SELECT 'New license fields added successfully!' as message;