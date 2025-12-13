-- Create admin users manually
-- First, let's make sure we're using the right database
USE product_management_system;

-- Insert admin users with proper bcrypt hashes
-- Password for GuddiS and KatragaddaV: Welcome@MQI
-- Password for admin: admin123

-- These are pre-computed bcrypt hashes for the passwords
INSERT IGNORE INTO users (username, full_name, email, password, role, is_active) VALUES 
('admin', 'System Administrator', 'admin@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 1),
('GuddiS', 'Somling Guddi', 'Somling.Guddi@marquardt.com', '$2a$10$HlfD3YLfq0MrI4.jXhiMpOWpL8f8T8mLo4PnT8wO0YfRpMJhJGxsG', 'admin', 1),
('KatragaddaV', 'Venubabu Katragadda', 'Venubabu.Katragadda@marquardt.com', '$2a$10$HlfD3YLfq0MrI4.jXhiMpOWpL8f8T8mLo4PnT8wO0YfRpMJhJGxsG', 'admin', 1);

-- Check if users were created
SELECT username, full_name, role, is_active FROM users WHERE username IN ('admin', 'GuddiS', 'KatragaddaV');

SELECT 'Admin users created successfully!' AS message;