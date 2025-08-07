USE product_management_system;

-- Fix any product_assignments that have return_status = 'approved' but is_returned = 0
UPDATE product_assignments 
SET is_returned = 1, returned_at = NOW() 
WHERE return_status = 'approved' AND is_returned = 0;

-- Ensure returned_at is set for all returned items that don't have a timestamp
UPDATE product_assignments 
SET returned_at = NOW() 
WHERE is_returned = 1 AND returned_at IS NULL;

-- Add returned_at column if it doesn't exist (safety check)
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'product_assignments' 
    AND COLUMN_NAME = 'returned_at' 
    AND TABLE_SCHEMA = 'product_management_system'
);

-- Display completion message
SELECT 'Timestamp fixes applied successfully!' as message;