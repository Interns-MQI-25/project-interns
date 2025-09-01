-- Add product_attachments table for file uploads
-- Run this in your MySQL database

USE product_management_system;

-- Create product_attachments table
CREATE TABLE IF NOT EXISTS product_attachments (
    attachment_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by INT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
);

-- Add index for better performance
CREATE INDEX idx_product_attachments_product_id ON product_attachments(product_id);
CREATE INDEX idx_product_attachments_uploaded_by ON product_attachments(uploaded_by);

-- Display completion message
SELECT 'Product attachments table created successfully!' as message;
