-- Create users table and insert default admin users
USE product_management_system;

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'employee', 'monitor') NOT NULL DEFAULT 'employee',
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Clear existing users (if any)
DELETE FROM users WHERE username IN ('admin', 'GuddiS', 'KatragaddaV');

-- Insert default admin users with pre-hashed passwords
-- Password for 'admin': admin123
INSERT INTO users (username, full_name, email, password, role, is_active) VALUES 
('admin', 'System Administrator', 'admin@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 1);

-- Password for 'GuddiS': Welcome@MQI
INSERT INTO users (username, full_name, email, password, role, is_active) VALUES 
('GuddiS', 'Somling Guddi', 'Somling.Guddi@marquardt.com', '$2a$10$WfvMb3aApRfAKm.HCXKsYea/OlZfLRCDZP7xDhqx8P2.YXIaOAz1G', 'admin', 1);

-- Password for 'KatragaddaV': Welcome@MQI  
INSERT INTO users (username, full_name, email, password, role, is_active) VALUES 
('KatragaddaV', 'Venubabu Katragadda', 'Venubabu.Katragadda@marquardt.com', '$2a$10$WfvMb3aApRfAKm.HCXKsYea/OlZfLRCDZP7xDhqx8P2.YXIaOAz1G', 'admin', 1);

-- Verify users were created
SELECT username, full_name, email, role, is_active FROM users;