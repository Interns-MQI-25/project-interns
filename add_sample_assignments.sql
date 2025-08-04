-- Add sample employee and product assignments to see the Request Return button

-- First, let's create a sample employee user
INSERT INTO users (username, full_name, email, password, role) 
VALUES ('john.doe', 'John Doe', 'john.doe@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employee');

-- Get the user ID
SET @user_id = LAST_INSERT_ID();

-- Add employee record
INSERT INTO employees (user_id, department_id, is_active) 
VALUES (@user_id, 1, TRUE);

-- Get employee ID
SET @employee_id = LAST_INSERT_ID();

-- Add some product assignments with return dates
INSERT INTO product_assignments (product_id, employee_id, monitor_id, quantity, assigned_at, return_date, is_returned, return_status) 
VALUES 
(1, @employee_id, 1, 1, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), FALSE, 'none'),
(2, @employee_id, 1, 1, NOW(), DATE_ADD(NOW(), INTERVAL 15 DAY), FALSE, 'none'),
(3, @employee_id, 1, 1, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), FALSE, 'none');