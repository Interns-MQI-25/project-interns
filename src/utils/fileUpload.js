const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

// Configure multer for file uploads - use memory storage for cloud compatibility
const storage = process.env.NODE_ENV === 'production' ? 
    multer.memoryStorage() : // Use memory storage in production (App Engine)
    multer.diskStorage({
        destination: async (req, file, cb) => {
            const uploadPath = path.join(__dirname, '../../uploads/products');
            try {
                await fs.ensureDir(uploadPath);
                cb(null, uploadPath);
            } catch (error) {
                cb(error, null);
            }
        },
        filename: (req, file, cb) => {
            // Generate unique filename with timestamp
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const extension = path.extname(file.originalname);
            const filename = `product-${uniqueSuffix}${extension}`;
            cb(null, filename);
        }
    });

// File filter to allow only specific file types
const fileFilter = (req, file, cb) => {
    // Allowed file types: images, documents, PDFs, text files
    const allowedTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt', '.csv', '.xls', '.xlsx'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images (JPG, PNG, GIF, WebP), documents (PDF, DOC, DOCX), and text files (TXT, CSV, XLS, XLSX) are allowed.'), false);
    }
};

// Configure multer upload
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file
        files: 10 // Maximum 10 files per upload
    }
});

// Function to save file attachment info to database
async function saveFileAttachment(pool, file, productId, uploadedBy, description = null) {
    try {
        // Check if we're in production mode
        if (process.env.NODE_ENV === 'production') {
            console.warn('File storage not supported in production environment');
            return null;
        }
        
        // Check if the table exists
        const [tables] = await pool.execute(`
            SELECT COUNT(*) as table_count 
            FROM information_schema.tables 
            WHERE table_schema = 'product_management_system' 
            AND table_name = 'product_attachments'
        `);
        
        if (tables[0].table_count === 0) {
            console.warn('product_attachments table does not exist, skipping file attachment save');
            return null;
        }
        
        const [result] = await pool.execute(`
            INSERT INTO product_attachments 
            (product_id, filename, original_filename, file_path, file_size, mime_type, uploaded_by, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            productId,
            file.filename,
            file.originalname,
            file.path || '',
            file.size,
            file.mimetype,
            uploadedBy,
            description
        ]);
        
        return result.insertId;
    } catch (error) {
        console.error('Error saving file attachment:', error);
        throw error;
    }
}

// Function to get attachments for a product
async function getProductAttachments(pool, productId) {
    try {
        // First check if the table exists
        const [tables] = await pool.execute(`
            SELECT COUNT(*) as table_count 
            FROM information_schema.tables 
            WHERE table_schema = 'product_management_system' 
            AND table_name = 'product_attachments'
        `);
        
        if (tables[0].table_count === 0) {
            console.log('product_attachments table does not exist, returning empty array');
            return [];
        }

        const [attachments] = await pool.execute(`
            SELECT pa.*, u.full_name as uploaded_by_name
            FROM product_attachments pa
            LEFT JOIN users u ON pa.uploaded_by = u.user_id
            WHERE pa.product_id = ?
            ORDER BY pa.uploaded_at DESC
        `, [productId]);
        
        return attachments;
    } catch (error) {
        console.error('Error getting product attachments:', error);
        return [];
    }
}

// Function to delete file attachment
async function deleteFileAttachment(pool, attachmentId, userId) {
    try {
        // Check if the table exists
        const [tables] = await pool.execute(`
            SELECT COUNT(*) as table_count 
            FROM information_schema.tables 
            WHERE table_schema = 'product_management_system' 
            AND table_name = 'product_attachments'
        `);
        
        if (tables[0].table_count === 0) {
            console.warn('product_attachments table does not exist, cannot delete attachment');
            return false;
        }

        // Get file info first
        const [attachments] = await pool.execute(
            'SELECT * FROM product_attachments WHERE attachment_id = ?',
            [attachmentId]
        );
        
        if (attachments.length === 0) {
            throw new Error('Attachment not found');
        }
        
        const attachment = attachments[0];
        
        // Delete file from filesystem (only in development)
        if (process.env.NODE_ENV !== 'production') {
            try {
                await fs.remove(attachment.file_path);
            } catch (fsError) {
                console.warn('Could not delete file from filesystem:', fsError.message);
            }
        }
        
        // Delete from database
        await pool.execute(
            'DELETE FROM product_attachments WHERE attachment_id = ?',
            [attachmentId]
        );
        
        return true;
    } catch (error) {
        console.error('Error deleting file attachment:', error);
        throw error;
    }
}

// Function to get file extension icon class
function getFileIcon(filename) {
    const ext = path.extname(filename).toLowerCase();
    
    switch (ext) {
        case '.pdf':
            return 'fas fa-file-pdf text-red-500';
        case '.doc':
        case '.docx':
            return 'fas fa-file-word text-blue-500';
        case '.xls':
        case '.xlsx':
        case '.csv':
            return 'fas fa-file-excel text-green-500';
        case '.txt':
            return 'fas fa-file-alt text-gray-500';
        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.gif':
        case '.webp':
            return 'fas fa-file-image text-purple-500';
        default:
            return 'fas fa-file text-gray-400';
    }
}

// Function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
    upload,
    saveFileAttachment,
    getProductAttachments,
    deleteFileAttachment,
    getFileIcon,
    formatFileSize
};
