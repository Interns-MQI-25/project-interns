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

-- Clear existing HIL data safely
DELETE FROM hil_booking_attendees;
DELETE FROM hil_bookings;
DELETE FROM hil_labs;

-- Insert VT HIL Labs
INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'VT HIL 6', 'VT Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'VT HIL 7', 'VT Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'VT HIL 8', 'VT Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'VT HIL 9', 'VT Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'VT HIL 11', 'VT Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'VT HIL 12', 'VT Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'VT HIL 17', 'VT Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'VT HIL 18', 'VT Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'VT HIL 19', 'VT Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'VT HIL 20', 'VT Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'VT HIL 39', 'VT Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'VT HIL 40', 'VT Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'VT HIL 41', 'VT Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'VT HIL 42', 'VT Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'VT HIL 47', 'VT Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'VT HIL 48', 'VT Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'VT HIL 52', 'VT Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'VT HIL 53', 'VT Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'VT HIL 55', 'VT Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'VT HIL 66', 'VT Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

-- Insert MN HIL Labs
INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'MN HIL 33', 'MN Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'MN HIL 34', 'MN Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'MN HIL 46', 'MN Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'MN HIL 58', 'MN Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by) 
SELECT 'MN HIL 59', 'MN Hardware-in-Loop testing facility', 'A 2.37(RDT- Labs) ', 4, 'Real-time simulators, ECU testing equipment', user_id FROM users WHERE role = 'admin' LIMIT 1;

-- Create indexes for better performance
CREATE INDEX idx_hil_bookings_dates ON hil_bookings(start_date, end_date);
CREATE INDEX idx_hil_bookings_lab ON hil_bookings(lab_id);
CREATE INDEX idx_hil_bookings_status ON hil_bookings(status);
CREATE INDEX idx_hil_attendees_booking ON hil_booking_attendees(booking_id);

-- Display completion message
SELECT 'HIL Labs schema created successfully!' as message;