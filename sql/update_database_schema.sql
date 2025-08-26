-- Update database schema to add extension functionality
USE product_management_system;

-- Check if extension columns exist and add them if they don't
SET @sql = '';

-- Check for extension_requested column
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'product_management_system' 
AND TABLE_NAME = 'product_assignments' 
AND COLUMN_NAME = 'extension_requested';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ALTER TABLE product_assignments ADD COLUMN extension_requested BOOLEAN DEFAULT FALSE;');
END IF;

-- Check for extension_reason column
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'product_management_system' 
AND TABLE_NAME = 'product_assignments' 
AND COLUMN_NAME = 'extension_reason';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ALTER TABLE product_assignments ADD COLUMN extension_reason TEXT NULL;');
END IF;

-- Check for new_return_date column
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'product_management_system' 
AND TABLE_NAME = 'product_assignments' 
AND COLUMN_NAME = 'new_return_date';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ALTER TABLE product_assignments ADD COLUMN new_return_date DATE NULL;');
END IF;

-- Check for extension_status column
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'product_management_system' 
AND TABLE_NAME = 'product_assignments' 
AND COLUMN_NAME = 'extension_status';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ALTER TABLE product_assignments ADD COLUMN extension_status ENUM(\'none\', \'requested\', \'approved\', \'rejected\') DEFAULT \'none\';');
END IF;

-- Check for extension_requested_at column
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'product_management_system' 
AND TABLE_NAME = 'product_assignments' 
AND COLUMN_NAME = 'extension_requested_at';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ALTER TABLE product_assignments ADD COLUMN extension_requested_at TIMESTAMP NULL;');
END IF;

-- Check for extension_processed_by column
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'product_management_system' 
AND TABLE_NAME = 'product_assignments' 
AND COLUMN_NAME = 'extension_processed_by';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ALTER TABLE product_assignments ADD COLUMN extension_processed_by INT NULL;');
END IF;

-- Check for extension_processed_at column
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'product_management_system' 
AND TABLE_NAME = 'product_assignments' 
AND COLUMN_NAME = 'extension_processed_at';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ALTER TABLE product_assignments ADD COLUMN extension_processed_at TIMESTAMP NULL;');
END IF;

-- Check for extension_remarks column
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'product_management_system' 
AND TABLE_NAME = 'product_assignments' 
AND COLUMN_NAME = 'extension_remarks';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ALTER TABLE product_assignments ADD COLUMN extension_remarks TEXT NULL;');
END IF;

-- Execute the SQL if there are columns to add
IF LENGTH(@sql) > 0 THEN
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    SELECT 'Extension columns added successfully!' as message;
ELSE
    SELECT 'Extension columns already exist!' as message;
END IF;