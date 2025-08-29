-- HIL (Hardware in Loop) Labs Management Schema
-- Adds HIL lab booking functionality to the existing inventory management system

USE product_management_system;

-- Create HIL Labs table
CREATE TABLE IF NOT EXISTS hil_labs (
    lab_id INT AUTO_INCREMENT PRIMARY KEY,
    lab_name VARCHAR(100) NOT NULL,
    lab_description TEXT,
    location VARCHAR(100),
    capacity INT DEFAULT 1,
    equipment_details TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Create HIL Lab Bookings table
CREATE TABLE IF NOT EXISTS hil_bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    lab_id INT NOT NULL,
    project_name VARCHAR(200) NOT NULL,
    project_description TEXT,
    booked_by INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    booking_purpose TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lab_id) REFERENCES hil_labs(lab_id),
    FOREIGN KEY (booked_by) REFERENCES users(user_id)
);

-- Create HIL Booking Attendees table (for team members working on the project)
CREATE TABLE IF NOT EXISTS hil_booking_attendees (
    attendee_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    user_id INT NOT NULL,
    role_in_project VARCHAR(100),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    added_by INT NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES hil_bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (added_by) REFERENCES users(user_id),
    UNIQUE KEY unique_booking_user (booking_id, user_id)
);

-- Insert sample HIL Labs (using existing admin user)
INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'HIL Lab 1', 'Primary Hardware-in-Loop testing facility for automotive systems', 'Building A - Floor 2', 4, 'Real-time simulators, ECU testing equipment, CAN/LIN interfaces', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'HIL Lab 2', 'Secondary HIL facility for advanced driver assistance systems', 'Building B - Floor 1', 6, 'ADAS testing equipment, sensor simulation, vehicle dynamics models', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'HIL Lab 3', 'Specialized HIL lab for powertrain testing', 'Building A - Floor 3', 3, 'Engine simulation, transmission testing, hybrid system validation', user_id FROM users WHERE role = 'admin' LIMIT 1;

-- Create indexes for better performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_hil_bookings_dates ON hil_bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_hil_bookings_lab ON hil_bookings(lab_id);
CREATE INDEX IF NOT EXISTS idx_hil_bookings_status ON hil_bookings(status);
CREATE INDEX IF NOT EXISTS idx_hil_attendees_booking ON hil_booking_attendees(booking_id);

-- Display completion message
SELECT 'HIL Labs schema created successfully!' as message;