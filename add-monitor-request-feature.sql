-- Add assigned_monitor_id column to product_requests table for monitor-to-monitor requests
ALTER TABLE product_requests ADD assigned_monitor_id INT NULL;
ALTER TABLE product_requests ADD CONSTRAINT fk_assigned_monitor FOREIGN KEY (assigned_monitor_id) REFERENCES employees(employee_id);
