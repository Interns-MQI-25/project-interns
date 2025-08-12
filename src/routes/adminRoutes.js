const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const { sendRegistrationApprovalEmail, sendRegistrationRejectionEmail } = require('../utils/emailService');

// Import file upload utilities
const { 
    upload, 
    saveFileAttachment, 
    getProductAttachments, 
    deleteFileAttachment,
    getFileIcon,
    formatFileSize 
} = require('../utils/fileUpload');

// Configure multer for Excel file uploads - use memory storage for cloud compatibility
const excelUpload = multer({
    storage: multer.memoryStorage(), // Use memory storage instead of disk for App Engine
    fileFilter: (req, file, cb) => {
        // Check if file is Excel
        const allowedMimes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'text/csv' // .csv
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files (.xlsx, .xls) and CSV files are allowed'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Admin routes module
module.exports = (pool, requireAuth, requireRole) => {
    
    // Admin: Dashboard Route (add this before other routes)
    router.get('/dashboard', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            // Get dashboard statistics
            const [totalEmployees] = await pool.execute(
                'SELECT COUNT(*) as count FROM users WHERE role IN ("employee", "monitor")'
            );
            
            const [activeMonitors] = await pool.execute(
                'SELECT COUNT(*) as count FROM users WHERE role = "monitor"'
            );
            
            const [pendingRegistrations] = await pool.execute(
                'SELECT COUNT(*) as count FROM registration_requests WHERE status = "pending"'
            );
            
            const [totalProducts] = await pool.execute(
                'SELECT COUNT(*) as count FROM products'
            );

            const [lowStockProducts] = await pool.execute(
                'SELECT COUNT(*) as count FROM products WHERE quantity <= 5'
            );

            // Get recent activity
            const [recentActivity] = await pool.execute(`
                SELECT 'request' as type, pr.requested_at as date, p.product_name, 
                       u.full_name as employee_name, pr.status, pr.quantity
                FROM product_requests pr
                JOIN products p ON pr.product_id = p.product_id
                JOIN employees e ON pr.employee_id = e.employee_id
                JOIN users u ON e.user_id = u.user_id
                UNION ALL
                SELECT 'assignment' as type, pa.assigned_at as date, p.product_name,
                       u.full_name as employee_name, 
                       CASE WHEN pa.is_returned THEN 'returned' ELSE 'assigned' END as status,
                       pa.quantity
                FROM product_assignments pa
                JOIN products p ON pa.product_id = p.product_id
                JOIN employees e ON pa.employee_id = e.employee_id
                JOIN users u ON e.user_id = u.user_id
                ORDER BY date DESC
                LIMIT 10
            `);

            res.render('admin/dashboard', {
                user: req.session.user,
                stats: {
                    totalEmployees: totalEmployees[0].count,
                    activeMonitors: activeMonitors[0].count,
                    pendingRegistrations: pendingRegistrations[0].count,
                    totalProducts: totalProducts[0].count,
                    lowStockProducts: lowStockProducts[0].count
                },
                recentActivity: recentActivity || [],
                messages: req.flash()
            });
        } catch (error) {
            console.error('Admin dashboard error:', error);
            res.render('error', { 
                message: 'Error loading admin dashboard',
                user: req.session.user 
            });
        }
    });

    // Admin: Employees Route
    router.get('/employees', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            const [employees] = await pool.execute(`
                SELECT u.*, e.employee_id, d.department_name, e.is_active as employee_active
                FROM users u
                LEFT JOIN employees e ON u.user_id = e.user_id
                LEFT JOIN departments d ON e.department_id = d.department_id
                WHERE u.role IN ('employee', 'monitor')
                ORDER BY e.is_active DESC, u.full_name
            `);
            
            const [departments] = await pool.execute('SELECT DISTINCT department_id, department_name FROM departments ORDER BY department_name');
            
            res.render('admin/employees', { user: req.session.user, employees, departments });
        } catch (error) {
            console.error('Employees error:', error);
            res.render('error', { message: 'Error loading employees' });
        }
    });

    // Admin: Monitors Route
    router.get('/monitors', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            const [monitors] = await pool.execute(`
                SELECT u.*, ma.start_date, ma.end_date, ma.is_active as monitor_active
                FROM users u
                LEFT JOIN monitor_assignments ma ON u.user_id = ma.user_id AND ma.is_active = 1
                WHERE u.role = 'monitor'
                ORDER BY u.full_name
            `);
            
            const [employees] = await pool.execute(`
                SELECT u.user_id, u.full_name, u.username, d.department_name
                FROM users u
                JOIN employees e ON u.user_id = e.user_id
                JOIN departments d ON e.department_id = d.department_id
                WHERE u.role = 'employee' AND e.is_active = 1
                ORDER BY u.full_name
            `);
            
            res.render('admin/monitors', { user: req.session.user, monitors, employees });
        } catch (error) {
            console.error('Monitors error:', error);
            res.render('error', { message: 'Error loading monitors' });
        }
    });

    // Admin: Manage Admins Route (Read-only)
    router.get('/manage-admins', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            res.render('admin/manage-admins', { user: req.session.user });
        } catch (error) {
            console.error('Manage admins error:', error);
            res.render('error', { message: 'Error loading admin management' });
        }
    });

    // Admin: Stock Route
    router.get('/stock', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            const productsQuery = `
                SELECT 
                    p.*,
                    u.full_name as added_by_name,
                    COALESCE((
                        SELECT COUNT(*) 
                        FROM product_assignments pa 
                        WHERE pa.product_id = p.product_id
                    ), 0) as total_assignments,
                    COALESCE((
                        SELECT SUM(pa.quantity) 
                        FROM product_assignments pa 
                        WHERE pa.product_id = p.product_id AND pa.is_returned = FALSE
                    ), 0) as currently_assigned,
                    (p.quantity + COALESCE((
                        SELECT SUM(pa.quantity) 
                        FROM product_assignments pa 
                        WHERE pa.product_id = p.product_id AND pa.is_returned = FALSE
                    ), 0)) as total_quantity,
                    CASE 
                        WHEN p.calibration_due_date IS NOT NULL AND p.calibration_due_date < CURDATE() THEN 'Overdue'
                        WHEN p.calibration_due_date IS NOT NULL AND p.calibration_due_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'Due Soon'
                        WHEN p.calibration_due_date IS NOT NULL THEN 'Current'
                        ELSE 'Not Required'
                    END as calibration_status
                FROM products p
                LEFT JOIN users u ON p.added_by = u.user_id
                ORDER BY p.asset_type, p.product_category, p.product_name
            `;
            
            const [products] = await pool.execute(productsQuery);
            
            // Get comprehensive stock analytics
            const stockStatsQuery = `
                SELECT 
                    asset_type,
                    COUNT(*) as total_items,
                    SUM(quantity) as total_quantity,
                    SUM(CASE WHEN is_available = TRUE THEN quantity ELSE 0 END) as available_quantity,
                    SUM(CASE WHEN COALESCE(calibration_required, FALSE) = TRUE THEN 1 ELSE 0 END) as calibration_items,
                    SUM(CASE WHEN calibration_due_date IS NOT NULL AND calibration_due_date < CURDATE() THEN 1 ELSE 0 END) as overdue_calibrations
                FROM products
                GROUP BY asset_type
            `;
            
            const [stockStats] = await pool.execute(stockStatsQuery);
            
            // Get recent stock activity (if stock_history table exists)
            let recentActivity = [];
            try {
                const [activity] = await pool.execute(`
                    SELECT 
                        sh.action,
                        sh.quantity,
                        sh.performed_at,
                        sh.notes,
                        p.product_name,
                        u.full_name as performed_by_name
                    FROM stock_history sh
                    JOIN products p ON sh.product_id = p.product_id
                    JOIN users u ON sh.performed_by = u.user_id
                    ORDER BY sh.performed_at DESC
                    LIMIT 20
                `);
                recentActivity = activity;
            } catch (historyError) {
                console.log('Stock history table not found, skipping recent activity');
            }
            
            res.render('admin/stock', { 
                user: req.session.user, 
                products: products || [],
                stockStats: stockStats || [],
                recentActivity: recentActivity || []
            });
        } catch (error) {
            console.error('Admin stock error:', error);
            res.render('admin/stock', { 
                user: req.session.user, 
                products: [],
                stockStats: [],
                recentActivity: [],
                error: 'Error loading stock data'
            });
        }
    });

    // Admin: Update Product Route
    router.post('/update-product/:productId', requireAuth, requireRole(['admin']), async (req, res) => {
        const productId = req.params.productId;
        const {
            product_name,
            product_category,
            asset_type,
            serial_number,
            model_number,
            quantity,
            calibration_required,
            calibration_frequency
        } = req.body;

        try {
            const connection = await pool.getConnection();
            await connection.beginTransaction();

            try {
                // Validate required fields
                if (!product_name || !asset_type || quantity === undefined) {
                    req.flash('error', 'Product name, asset type, and quantity are required');
                    return res.redirect('/admin/stock');
                }

                // Check if product exists and get current data
                const [existingProduct] = await connection.execute(
                    'SELECT * FROM products WHERE product_id = ?',
                    [productId]
                );

                if (existingProduct.length === 0) {
                    req.flash('error', 'Product not found');
                    return res.redirect('/admin/stock');
                }

                // Validate quantity is not negative
                if (parseInt(quantity) < 0) {
                    req.flash('error', 'Quantity cannot be negative');
                    return res.redirect('/admin/stock');
                }

                // Update the product
                const updateQuery = `
                    UPDATE products SET 
                        product_name = ?,
                        product_category = ?,
                        asset_type = ?,
                        serial_number = ?,
                        model_number = ?,
                        quantity = ?,
                        calibration_required = ?,
                        calibration_frequency = ?,
                        updated_at = NOW()
                    WHERE product_id = ?
                `;

                await connection.execute(updateQuery, [
                    product_name,
                    product_category || null,
                    asset_type,
                    serial_number || null,
                    model_number || null,
                    parseInt(quantity),
                    calibration_required === '1' ? 1 : 0,
                    calibration_frequency || null,
                    productId
                ]);

                // Log the update activity (if you have activity logging)
                try {
                    await connection.execute(
                        `INSERT INTO activity_logs (user_id, action, table_name, record_id, details, performed_at) 
                         VALUES (?, 'UPDATE', 'products', ?, ?, NOW())`,
                        [
                            req.session.user.user_id,
                            productId,
                            `Updated product: ${product_name}`
                        ]
                    );
                } catch (logError) {
                    console.log('Activity logging failed (table may not exist):', logError.message);
                }

                await connection.commit();
                req.flash('success', `Product "${product_name}" updated successfully`);

            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }

        } catch (error) {
            console.error('Update product error:', error);
            req.flash('error', 'Error updating product. Please try again.');
        }

        res.redirect('/admin/stock');
    });

    // Admin: Excel Upload Page Route
    router.get('/upload-products', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            // Get the products table column structure
            const [columns] = await pool.execute(`
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
                ORDER BY ORDINAL_POSITION
            `);
            
            // Filter out auto-increment and system columns that users shouldn't provide
            const editableColumns = columns.filter(col => 
                !['product_id', 'added_at', 'updated_at'].includes(col.COLUMN_NAME)
            );
            
            res.render('admin/upload-products', { 
                user: req.session.user,
                columns: editableColumns,
                messages: req.flash()
            });
        } catch (error) {
            console.error('Upload products page error:', error);
            res.render('error', { message: 'Error loading upload page' });
        }
    });

    // Admin: Process Excel Upload Route
    router.post('/upload-products', requireAuth, requireRole(['admin']), excelUpload.single('excelFile'), async (req, res) => {
        try {
            if (!req.file) {
                req.flash('error', 'No file uploaded. Please select an Excel file.');
                return res.redirect('/admin/upload-products');
            }

            // Read the Excel file from memory buffer
            const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0]; // Use first sheet
            const sheet = workbook.Sheets[sheetName];
            
            // Convert to JSON with header row as keys
            const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
            
            if (data.length < 2) {
                req.flash('error', 'Excel file must contain at least a header row and one data row.');
                return res.redirect('/admin/upload-products');
            }

            const headers = data[0].map(h => h ? h.toString().trim() : '');
            const rows = data.slice(1);

            // Get the products table column structure
            const [dbColumns] = await pool.execute(`
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
                ORDER BY ORDINAL_POSITION
            `);

            // Filter out auto-increment and system columns
            const expectedColumns = dbColumns
                .filter(col => !['product_id', 'added_at', 'updated_at'].includes(col.COLUMN_NAME))
                .map(col => col.COLUMN_NAME);

            // Validate column headers
            const missingColumns = expectedColumns.filter(col => !headers.includes(col));
            const extraColumns = headers.filter(col => col && !expectedColumns.includes(col));

            if (missingColumns.length > 0 || extraColumns.length > 0) {
                let errorMessage = 'Column mismatch detected:\\n';
                if (missingColumns.length > 0) {
                    errorMessage += `Missing columns: ${missingColumns.join(', ')}\\n`;
                }
                if (extraColumns.length > 0) {
                    errorMessage += `Extra columns: ${extraColumns.join(', ')}\\n`;
                }
                errorMessage += `Expected columns: ${expectedColumns.join(', ')}`;
                
                req.flash('error', errorMessage);
                return res.redirect('/admin/upload-products');
            }

            // Process and validate data
            const connection = await pool.getConnection();
            await connection.beginTransaction();

            try {
                let successCount = 0;
                let errorCount = 0;
                const errors = [];

                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const rowNumber = i + 2; // Excel row number (accounting for header)

                    try {
                        // Skip empty rows
                        if (!row || row.every(cell => !cell && cell !== 0)) {
                            continue;
                        }

                        // Create object from row data
                        const productData = {};
                        headers.forEach((header, index) => {
                            if (header && expectedColumns.includes(header)) {
                                productData[header] = row[index] || null;
                            }
                        });

                        // Set default values for required fields
                        if (!productData.added_by) {
                            productData.added_by = req.session.user.user_id;
                        }
                        if (productData.is_available === undefined || productData.is_available === null) {
                            productData.is_available = true;
                        }
                        if (!productData.quantity) {
                            productData.quantity = 1;
                        }

                        // Convert boolean fields
                        if (typeof productData.is_available === 'string') {
                            productData.is_available = ['true', '1', 'yes', 'y'].includes(productData.is_available.toLowerCase());
                        }
                        if (typeof productData.calibration_required === 'string') {
                            productData.calibration_required = ['true', '1', 'yes', 'y'].includes(productData.calibration_required.toLowerCase());
                        }

                        // Validate required fields
                        if (!productData.product_name || !productData.asset_type) {
                            errors.push(`Row ${rowNumber}: Product name and asset type are required`);
                            errorCount++;
                            continue;
                        }

                        // Build INSERT query dynamically
                        const columns = Object.keys(productData).filter(key => productData[key] !== null);
                        const values = columns.map(key => productData[key]);
                        const placeholders = columns.map(() => '?').join(', ');
                        const columnNames = columns.join(', ');

                        const insertQuery = `INSERT INTO products (${columnNames}) VALUES (${placeholders})`;
                        await connection.execute(insertQuery, values);

                        successCount++;

                    } catch (rowError) {
                        console.error(`Error processing row ${rowNumber}:`, rowError);
                        errors.push(`Row ${rowNumber}: ${rowError.message}`);
                        errorCount++;
                    }
                }

                if (successCount > 0) {
                    await connection.commit();
                    req.flash('success', `Successfully imported ${successCount} products.`);
                    
                    if (errorCount > 0) {
                        req.flash('warning', `${errorCount} rows had errors and were skipped.`);
                        if (errors.length <= 10) {
                            req.flash('info', errors.join('\\n'));
                        } else {
                            req.flash('info', `First 10 errors:\\n${errors.slice(0, 10).join('\\n')}\\n... and ${errors.length - 10} more errors.`);
                        }
                    }
                } else {
                    await connection.rollback();
                    req.flash('error', 'No products were imported. Please check your data.');
                    if (errors.length > 0) {
                        req.flash('info', errors.slice(0, 10).join('\\n'));
                    }
                }

            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }

        } catch (error) {
            console.error('Excel upload error:', error);
            req.flash('error', 'Error processing Excel file. Please check the format and try again.');
        }

        res.redirect('/admin/upload-products');
    });

    // Admin: Download Template Route
    router.get('/download-template', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            // Get the products table column structure
            const [columns] = await pool.execute(`
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
                ORDER BY ORDINAL_POSITION
            `);
            
            // Filter out auto-increment and system columns
            const templateColumns = columns
                .filter(col => !['product_id', 'added_at', 'updated_at'].includes(col.COLUMN_NAME))
                .map(col => col.COLUMN_NAME);

            // Create a sample data row
            const sampleData = {
                item_number: 1001,
                asset_type: 'Hardware',
                product_category: 'Testing Equipment',
                product_name: 'Sample Product Name',
                model_number: 'MODEL-123',
                serial_number: 'SN-123456',
                is_available: true,
                quantity: 1,
                added_by: req.session.user.user_id,
                calibration_required: false,
                calibration_frequency: '1 Year',
                calibration_due_date: '2025-12-31',
                pr_no: 1234,
                po_number: 'PO-2024-001',
                inward_date: '2024-01-15',
                inwarded_by: req.session.user.user_id,
                version_number: 'v1.0',
                software_license_type: 'Standard',
                license_start: '2024-01-01',
                renewal_frequency: '1 Year',
                next_renewal_date: '2025-01-01',
                new_license_key: null,
                new_version_number: null
            };

            // Create worksheet data
            const wsData = [
                templateColumns, // Header row
                templateColumns.map(col => sampleData[col] || '') // Sample data row
            ];

            // Create workbook
            const wb = xlsx.utils.book_new();
            const ws = xlsx.utils.aoa_to_sheet(wsData);

            // Add the worksheet to workbook
            xlsx.utils.book_append_sheet(wb, ws, 'Products Template');

            // Generate buffer
            const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

            // Set headers for download
            res.setHeader('Content-Disposition', 'attachment; filename="products_template.xlsx"');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

            // Send the file
            res.send(buffer);

        } catch (error) {
            console.error('Template download error:', error);
            req.flash('error', 'Error generating template file.');
            res.redirect('/admin/upload-products');
        }
    });


    // Inventory
    router.get('/inventory', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            const [products] = await pool.execute(`
                SELECT 
                    p.*,
                    u.full_name as added_by_name,
                    COALESCE((
                        SELECT COUNT(*) 
                        FROM product_assignments pa 
                        WHERE pa.product_id = p.product_id
                    ), 0) as total_assignments,
                    COALESCE((
                        SELECT SUM(pa.quantity) 
                        FROM product_assignments pa 
                        WHERE pa.product_id = p.product_id AND pa.is_returned = FALSE
                    ), 0) as currently_assigned,
                    CASE 
                        WHEN p.calibration_due_date IS NOT NULL AND p.calibration_due_date < CURDATE() THEN 'Overdue'
                        WHEN p.calibration_due_date IS NOT NULL AND p.calibration_due_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'Due Soon'
                        WHEN p.calibration_due_date IS NOT NULL THEN 'Current'
                        ELSE 'Not Required'
                    END as calibration_status,
                    CASE 
                        WHEN p.calibration_required = 1 AND p.calibration_frequency IS NOT NULL 
                        THEN DATE_ADD(p.added_at, INTERVAL CAST(p.calibration_frequency AS UNSIGNED) YEAR)
                        ELSE NULL
                    END as next_calibration_date,
                    GROUP_CONCAT(
                        CONCAT(emp_user.full_name, ' (', dept.department_name, ')')
                        ORDER BY pa.assigned_at DESC 
                        SEPARATOR '; '
                    ) as assigned_to_details
                FROM products p
                LEFT JOIN users u ON p.added_by = u.user_id
                LEFT JOIN product_assignments pa ON p.product_id = pa.product_id AND pa.is_returned = FALSE
                LEFT JOIN employees emp ON pa.employee_id = emp.employee_id
                LEFT JOIN users emp_user ON emp.user_id = emp_user.user_id
                LEFT JOIN departments dept ON emp.department_id = dept.department_id
                GROUP BY p.product_id
                ORDER BY p.asset_type, p.product_category, p.product_name
            `);
            
            res.render('admin/inventory', { 
                user: req.session.user, 
                products 
            });
        } catch (error) {
            console.error('Inventory error:', error);
            res.render('error', { message: 'Error loading inventory' });
        }
    });

    // Admin: History Route with Fallback
    router.get('/history', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            // Check if system_activity_log table exists
            const [tableExists] = await pool.execute(`
                SELECT COUNT(*) as count FROM information_schema.tables 
                WHERE table_schema = DATABASE() AND table_name = 'system_activity_log'
            `);
            
            if (tableExists[0].count === 0) {
                // Fallback to old history system - get both assignments and requests
                const [assignments] = await pool.execute(`
                    SELECT 'assignment' as type, pa.assigned_at as date, p.product_name, 
                           u1.full_name as employee_name, u2.full_name as monitor_name, 
                           pa.quantity, 'Assigned' as status
                    FROM product_assignments pa
                    JOIN products p ON pa.product_id = p.product_id
                    JOIN employees e ON pa.employee_id = e.employee_id
                    JOIN users u1 ON e.user_id = u1.user_id
                    JOIN users u2 ON pa.monitor_id = u2.user_id
                    ORDER BY pa.assigned_at DESC
                    LIMIT 25
                `);

                const [requests] = await pool.execute(`
                    SELECT 'request' as type, pr.request_date as date, p.product_name,
                           u1.full_name as employee_name, u2.full_name as monitor_name,
                           pr.quantity, pr.status
                    FROM product_requests pr
                    JOIN products p ON pr.product_id = p.product_id
                    JOIN employees e ON pr.employee_id = e.employee_id
                    JOIN users u1 ON e.user_id = u1.user_id
                    LEFT JOIN users u2 ON pr.monitor_id = u2.user_id
                    ORDER BY pr.request_date DESC
                    LIMIT 25
                `);

                // Combine and sort by date
                const history = [...assignments, ...requests].sort((a, b) => new Date(b.date) - new Date(a.date));
                
                return res.render('admin/history', { 
                    user: req.session.user, 
                    history,
                    currentPage: 1,
                    totalPages: 1,
                    totalRecords: history.length
                });
            }
            
            // Use unified system if table exists
            const page = parseInt(req.query.page) || 1;
            const limit = 50;
            const offset = (page - 1) * limit;
            
            const [countResult] = await pool.execute(`
                SELECT COUNT(*) as total FROM system_activity_log
                WHERE activity_type IS NOT NULL AND description IS NOT NULL
            `);
            
            const totalRecords = countResult[0].total;
            const totalPages = Math.ceil(totalRecords / limit);
            
            const [history] = await pool.execute(`
                SELECT 
                    sal.activity_type as type,
                    sal.created_at as date,
                    u1.full_name as employee_name,
                    u2.full_name as monitor_name,
                    p.product_name,
                    1 as quantity,
                    CASE 
                        WHEN sal.activity_type = 'assignment' THEN 'Assigned'
                        WHEN sal.activity_type = 'request' THEN 'Requested'
                        ELSE 'Unknown'
                    END as status
                FROM system_activity_log sal
                JOIN users u1 ON sal.user_id = u1.user_id
                LEFT JOIN users u2 ON sal.target_user_id = u2.user_id
                LEFT JOIN products p ON sal.product_id = p.product_id
                WHERE sal.activity_type IS NOT NULL AND sal.description IS NOT NULL
                ORDER BY sal.created_at DESC
                LIMIT ? OFFSET ?
            `, [limit, offset]);
            
            res.render('admin/history', { 
                user: req.session.user, 
                history,
                currentPage: page,
                totalPages,
                totalRecords
            });
        } catch (error) {
            console.error('History error:', error);
            // Render history page with empty data instead of error page
            res.render('admin/history', { 
                user: req.session.user, 
                history: [],
                currentPage: 1,
                totalPages: 1,
                totalRecords: 0,
                error: 'Unable to load history data. Please check database connection.'
            });
        }
    });

    // Admin: Registration Requests Route
    router.get('/registration-requests', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            // Get all pending registration requests with department information
            const [requests] = await pool.execute(`
                SELECT 
                    rr.*,
                    d.department_name
                FROM registration_requests rr
                LEFT JOIN departments d ON rr.department_id = d.department_id
                ORDER BY rr.requested_at DESC
            `);

            // Get departments for the form
            const [departments] = await pool.execute(
                'SELECT DISTINCT department_id, department_name FROM departments ORDER BY department_name'
            );

            res.render('admin/registration-requests', {
                user: req.session.user,
                requests: requests || [],
                departments: departments || [],
                messages: req.flash()
            });
        } catch (error) {
            console.error('Registration requests error:', error);
            req.flash('error', 'Error loading registration requests');
            res.redirect('/admin/dashboard');
        }
    });


    // Admin: Account Route
    router.get('/account', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            const [adminDetails] = await pool.execute(`
                SELECT u.user_id, u.username, u.full_name, u.email, u.role, u.created_at,
                       COALESCE(e.is_active, 1) as is_active, 
                       COALESCE(d.department_name, 'Administration') as department_name
                FROM users u
                LEFT JOIN employees e ON u.user_id = e.user_id
                LEFT JOIN departments d ON e.department_id = d.department_id
                WHERE u.user_id = ?
            `, [req.session.user.user_id]);

            if (!adminDetails || adminDetails.length === 0) {
                req.flash('error', 'Admin details not found.');
                return res.redirect('/admin/dashboard');
            }

            res.render('admin/account', { 
                user: req.session.user, 
                admin: adminDetails[0],
                messages: req.flash()
            });
        } catch (error) {
            console.error('Account error:', error);
            res.render('error', { message: 'Error loading account details' });
        }
    });

    // Admin: Change Password Route
    router.post('/change-password', requireAuth, requireRole(['admin']), async (req, res) => {
        const { current_password, new_password, confirm_password } = req.body;
        
        try {
            // Validate input
            if (!current_password || !new_password || !confirm_password) {
                req.flash('error', 'All password fields are required');
                return res.redirect('/admin/account');
            }
            
            if (new_password !== confirm_password) {
                req.flash('error', 'New password and confirmation do not match');
                return res.redirect('/admin/account');
            }
            
            if (new_password.length < 6) {
                req.flash('error', 'New password must be at least 6 characters long');
                return res.redirect('/admin/account');
            }
            
            // Get current user details
            const [users] = await pool.execute(
                'SELECT password FROM users WHERE user_id = ?',
                [req.session.user.user_id]
            );
            
            if (users.length === 0) {
                req.flash('error', 'User not found');
                return res.redirect('/admin/account');
            }
            
            // Verify current password
            const bcrypt = require('bcryptjs');
            const isValidPassword = await bcrypt.compare(current_password, users[0].password);
            
            if (!isValidPassword) {
                req.flash('error', 'Current password is incorrect');
                return res.redirect('/admin/account');
            }
            
            // Hash new password
            const hashedNewPassword = await bcrypt.hash(new_password, 10);
            
            // Update password in database
            await pool.execute(
                'UPDATE users SET password = ?, updated_at = NOW() WHERE user_id = ?',
                [hashedNewPassword, req.session.user.user_id]
            );
            
            req.flash('success', 'Password changed successfully');
            res.redirect('/admin/account');
            
        } catch (error) {
            console.error('Change password error:', error);
            req.flash('error', 'Error changing password. Please try again.');
            res.redirect('/admin/account');
        }
    });



    // Admin: Dashboard Stats API
    router.get('/dashboard-stats', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            const [totalEmployees] = await pool.execute(
                'SELECT COUNT(*) as count FROM users WHERE role IN ("employee", "monitor")'
            );
            
            const [activeMonitors] = await pool.execute(
                'SELECT COUNT(*) as count FROM users WHERE role = "monitor"'
            );
            
            const [pendingRegistrations] = await pool.execute(
                'SELECT COUNT(*) as count FROM registration_requests WHERE status = "pending"'
            );
            
            const [totalProducts] = await pool.execute(
                'SELECT COUNT(*) as count FROM products'
            );
            
            // Fetch recent system activity
            const [recentActivity] = await pool.execute(`
                SELECT 'request' as type, pr.requested_at as date, p.product_name, 
                       u.full_name as employee_name, pr.status, pr.quantity
                FROM product_requests pr
                JOIN products p ON pr.product_id = p.product_id
                JOIN employees e ON pr.employee_id = e.employee_id
                JOIN users u ON e.user_id = u.user_id
                UNION ALL
                SELECT 'assignment' as type, pa.assigned_at as date, p.product_name,
                       u.full_name as employee_name, 
                       CASE WHEN pa.is_returned THEN 'returned' ELSE 'assigned' END as status,
                       pa.quantity
                FROM product_assignments pa
                JOIN products p ON pa.product_id = p.product_id
                JOIN employees e ON pa.employee_id = e.employee_id
                JOIN users u ON e.user_id = u.user_id
                UNION ALL
                SELECT 'registration' as type, rr.requested_at as date, 'User Registration' as product_name,
                       rr.full_name as employee_name, rr.status, 1 as quantity
                FROM registration_requests rr
                ORDER BY date DESC
                LIMIT 50
            `);
            
            // Fetch stock analytics
            const stockStatsQuery = `
                SELECT 
                    asset_type,
                    COUNT(*) as total_items,
                    SUM(quantity) as total_quantity,
                    SUM(CASE WHEN is_available = TRUE THEN quantity ELSE 0 END) as available_quantity,
                    SUM(CASE WHEN COALESCE(calibration_required, FALSE) = TRUE THEN 1 ELSE 0 END) as calibration_items,
                    SUM(CASE WHEN calibration_due_date IS NOT NULL AND calibration_due_date < CURDATE() THEN 1 ELSE 0 END) as overdue_calibrations
                FROM products
                GROUP BY asset_type
            `;
            
            const [stockStats] = await pool.execute(stockStatsQuery);
            
            res.json({
                totalEmployees: totalEmployees[0].count,
                activeMonitors: activeMonitors[0].count,
                pendingRegistrations: pendingRegistrations[0].count,
                totalProducts: totalProducts[0].count,
                recentActivity: recentActivity || [],
                stockStats: stockStats || []
            });
        } catch (error) {
            console.error('Dashboard stats error:', error);
            res.status(500).json({ error: 'Failed to fetch dashboard stats' });
        }
    });

    // Admin: Assign Monitor Route
    router.post('/assign-monitor', requireAuth, requireRole(['admin']), async (req, res) => {
        const { employee_id, end_date } = req.body;
        
        try {
            const connection = await pool.getConnection();
            await connection.beginTransaction();
            
            try {
                // Check if user exists and is an employee
                const [users] = await connection.execute(
                    'SELECT * FROM users WHERE user_id = ? AND role = "employee"',
                    [employee_id]
                );
                
                if (users.length === 0) {
                    req.flash('error', 'Invalid employee selected');
                    res.redirect('/admin/monitors');
                    return;
                }
                
                // Check if there are already 4 active monitors
                const [activeMonitors] = await connection.execute(
                    'SELECT COUNT(*) as count FROM users WHERE role = "monitor"'
                );
                
                if (activeMonitors[0].count >= 4) {
                    req.flash('error', 'Maximum of 4 monitors allowed');
                    res.redirect('/admin/monitors');
                    return;
                }
                
                // Update user role to monitor
                await connection.execute(
                    'UPDATE users SET role = "monitor" WHERE user_id = ?',
                    [employee_id]
                );
                
                // Create monitor assignment record
                await connection.execute(
                    'INSERT INTO monitor_assignments (user_id, assigned_by, start_date, end_date, is_active) VALUES (?, ?, NOW(), ?, 1)',
                    [employee_id, req.session.user.user_id, end_date]
                );
                
                await connection.commit();
                req.flash('success', 'Monitor assigned successfully');
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
            res.redirect('/admin/monitors');
        } catch (error) {
            console.error('Assign monitor error:', error);
            req.flash('error', 'Error assigning monitor');
            res.redirect('/admin/monitors');
        }
    });

    // Admin: Unassign Monitor Route
    router.post('/unassign-monitor', requireAuth, requireRole(['admin']), async (req, res) => {
        const { user_id } = req.body;
        
        try {
            const connection = await pool.getConnection();
            await connection.beginTransaction();
            
            try {
                // Check if user is currently a monitor
                const [users] = await connection.execute(
                    'SELECT * FROM users WHERE user_id = ? AND role = "monitor"',
                    [user_id]
                );
                
                if (users.length === 0) {
                    req.flash('error', 'User is not currently a monitor');
                    res.redirect('/admin/monitors');
                    return;
                }
                
                // Update user role back to employee
                await connection.execute(
                    'UPDATE users SET role = "employee" WHERE user_id = ?',
                    [user_id]
                );
                
                // Deactivate monitor assignment
                await connection.execute(
                    'UPDATE monitor_assignments SET is_active = 0, end_date = NOW() WHERE user_id = ? AND is_active = 1',
                    [user_id]
                );
                
                await connection.commit();
                req.flash('success', 'Monitor unassigned successfully');
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
            res.redirect('/admin/monitors');
        } catch (error) {
            console.error('Unassign monitor error:', error);
            req.flash('error', 'Error unassigning monitor');
            res.redirect('/admin/monitors');
        }
    });

    // Admin: Process Registration Request Route
    router.post('/process-registration', requireAuth, requireRole(['admin']), async (req, res) => {
        const { request_id, action } = req.body;
        
        try {
            const connection = await pool.getConnection();
            await connection.beginTransaction();
            
            try {
                // Get the registration request
                const [requests] = await connection.execute(
                    'SELECT * FROM registration_requests WHERE request_id = ?',
                    [request_id]
                );
                
                if (requests.length === 0) {
                    throw new Error('Registration request not found');
                }
                
                const request = requests[0];
                
                if (action === 'approve') {
                    // Create user account
                    const [result] = await connection.execute(`
                        INSERT INTO users (username, full_name, email, password, role) 
                        VALUES (?, ?, ?, ?, 'employee')
                    `, [request.username, request.full_name, request.email, request.password]);
                    
                    const userId = result.insertId;
                    
                    // Create employee record
                    await connection.execute(`
                        INSERT INTO employees (user_id, department_id, is_active) 
                        VALUES (?, ?, 1)
                    `, [userId, request.department_id]);
                    
                    // Send approval email
                    try {
                        await sendRegistrationApprovalEmail(request.email, request.full_name);
                    } catch (emailError) {
                        console.error('Failed to send approval email:', emailError);
                    }
                } else if (action === 'reject') {
                    // Send rejection email
                    try {
                        await sendRegistrationRejectionEmail(request.email, request.full_name);
                    } catch (emailError) {
                        console.error('Failed to send rejection email:', emailError);
                    }
                } else if (action === 'reactivate') {
                    // Reactivate rejected request (set back to pending)
                    await connection.execute(
                        'UPDATE registration_requests SET status = "pending", processed_at = NULL WHERE request_id = ?',
                        [request_id]
                    );
                    req.flash('success', 'Registration request reactivated successfully');
                    await connection.commit();
                    return res.redirect('/admin/registration-requests');
                } else if (action === 'delete') {
                    // Delete the registration request
                    await connection.execute(
                        'DELETE FROM registration_requests WHERE request_id = ?',
                        [request_id]
                    );
                    req.flash('success', 'Registration request deleted successfully');
                    await connection.commit();
                    return res.redirect('/admin/registration-requests');
                }
                
                // Update request status
                await connection.execute(
                    'UPDATE registration_requests SET status = ?, processed_at = NOW() WHERE request_id = ?',
                    [action === 'approve' ? 'approved' : 'rejected', request_id]
                );
                
                await connection.commit();
                req.flash('success', `Registration request ${action}d successfully`);
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
        } catch (error) {
            console.error('Process registration error:', error);
            req.flash('error', 'Error processing registration request');
        }
        
        res.redirect('/admin/registration-requests');
    });

    // Admin: Create Employee Route
    router.post('/create-employee', requireAuth, requireRole(['admin']), async (req, res) => {
        const { full_name, username, email, password, department_id, role, end_date } = req.body;
        
        try {
            const connection = await pool.getConnection();
            await connection.beginTransaction();
            
            try {
                // Check if username or email already exists
                const [existingUsers] = await connection.execute(
                    'SELECT * FROM users WHERE username = ? OR email = ?',
                    [username, email]
                );
                
                if (existingUsers.length > 0) {
                    req.flash('error', 'Username or email already exists');
                    res.redirect('/admin/employees');
                    return;
                }
                
                // Validate end date for monitor role
                if (role === 'monitor') {
                    if (!end_date) {
                        req.flash('error', 'End date is required for monitor role');
                        res.redirect('/admin/employees');
                        return;
                    }
                    
                    const endDate = new Date(end_date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    if (endDate <= today) {
                        req.flash('error', 'End date must be in the future');
                        res.redirect('/admin/employees');
                        return;
                    }
                }
                
                // Hash password
                const bcrypt = require('bcryptjs');
                const hashedPassword = await bcrypt.hash(password, 10);
                
                // Create user
                const [result] = await connection.execute(`
                    INSERT INTO users (username, full_name, email, password, role) 
                    VALUES (?, ?, ?, ?, ?)
                `, [username, full_name, email, hashedPassword, role]);
                
                const userId = result.insertId;
                
                // Create employee record
                await connection.execute(`
                    INSERT INTO employees (user_id, department_id, is_active) 
                    VALUES (?, ?, 1)
                `, [userId, department_id]);
                
                // If monitor role, create monitor assignment with end date
                if (role === 'monitor') {
                    const [employee] = await connection.execute(
                        'SELECT employee_id FROM employees WHERE user_id = ?',
                        [userId]
                    );
                    
                    if (employee.length > 0) {
                        await connection.execute(`
                            INSERT INTO monitor_assignments (employee_id, assigned_by, start_date, end_date) 
                            VALUES (?, ?, CURDATE(), ?)
                        `, [employee[0].employee_id, req.session.user.user_id, end_date]);
                    }
                }
                
                await connection.commit();
                req.flash('success', 'Employee created successfully');
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
        } catch (error) {
            console.error('Create employee error:', error);
            req.flash('error', 'Error creating employee');
        }
        
        res.redirect('/admin/employees');
    });

    // Admin: Toggle Employee Status Route (Deactivate/Activate)
    router.post('/toggle-employee-status/:id', requireAuth, requireRole(['admin']), async (req, res) => {
        const employeeId = req.params.id;
        
        try {
            const connection = await pool.getConnection();
            await connection.beginTransaction();
            
            try {
                // Get current status
                const [employees] = await connection.execute(
                    'SELECT is_active FROM users WHERE user_id = ?',
                    [employeeId]
                );
                
                if (employees.length === 0) {
                    req.flash('error', 'Employee not found');
                    res.redirect('/admin/employees');
                    return;
                }
                
                const currentStatus = employees[0].is_active;
                const newStatus = !currentStatus;
                
                // If deactivating, check for unreturned products
                if (!newStatus) {
                    const [assignments] = await connection.execute(`
                        SELECT COUNT(*) as count 
                        FROM product_assignments pa
                        JOIN employees e ON pa.employee_id = e.employee_id
                        WHERE e.user_id = ? AND pa.is_returned = FALSE
                    `, [employeeId]);
                    
                    if (assignments[0].count > 0) {
                        req.flash('error', `Cannot deactivate employee with ${assignments[0].count} unreturned product(s). Please check Employee Clearance page.`);
                        await connection.rollback();
                        res.redirect('/admin/employees');
                        return;
                    }
                }
                
                // Update user status
                await connection.execute(
                    'UPDATE users SET is_active = ? WHERE user_id = ?',
                    [newStatus, employeeId]
                );
                
                // Update employee status
                await connection.execute(
                    'UPDATE employees SET is_active = ? WHERE user_id = ?',
                    [newStatus, employeeId]
                );
                
                await connection.commit();
                req.flash('success', `Employee ${newStatus ? 'activated' : 'deactivated'} successfully`);
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
        } catch (error) {
            console.error('Toggle employee status error:', error);
            req.flash('error', 'Error updating employee status');
        }
        
        res.redirect('/admin/employees');
    });

    // Admin: Bulk Deactivate Employees Route
    router.post('/bulk-deactivate-employees', requireAuth, requireRole(['admin']), async (req, res) => {
        console.log('Bulk deactivate request received');
        console.log('Request body:', req.body);
        console.log('Content-Type:', req.get('Content-Type'));
        
        const { employee_ids } = req.body;
        
        console.log('Extracted employee_ids:', employee_ids);
        console.log('Type of employee_ids:', typeof employee_ids);
        console.log('Is array:', Array.isArray(employee_ids));
        
        if (!employee_ids || employee_ids.length === 0) {
            const message = 'No employees selected';
            console.log('Error: No employee_ids found');
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(400).json({ error: message });
            }
            req.flash('error', message);
            return res.redirect('/admin/employees');
        }
        
        try {
            const connection = await pool.getConnection();
            await connection.beginTransaction();
            
            try {
                const employeeIdArray = Array.isArray(employee_ids) ? employee_ids : [employee_ids];
                const placeholders = employeeIdArray.map(() => '?').join(',');
                
                // Update user status
                await connection.execute(
                    `UPDATE users SET is_active = 0 WHERE user_id IN (${placeholders})`,
                    employeeIdArray
                );
                
                // Update employee status
                await connection.execute(
                    `UPDATE employees SET is_active = 0 WHERE user_id IN (${placeholders})`,
                    employeeIdArray
                );
                
                await connection.commit();
                const successMessage = `${employeeIdArray.length} employee(s) deactivated successfully`;
                
                if (req.headers.accept && req.headers.accept.includes('application/json')) {
                    return res.json({ success: true, message: successMessage });
                }
                req.flash('success', successMessage);
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
        } catch (error) {
            console.error('Bulk deactivate error:', error);
            const errorMessage = 'Error deactivating employees';
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(500).json({ error: errorMessage });
            }
            req.flash('error', errorMessage);
        }
        
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.json({ success: true });
        }
        res.redirect('/admin/employees');
    });

    // Admin: Bulk Activate Employees Route
    router.post('/bulk-activate-employees', requireAuth, requireRole(['admin']), async (req, res) => {
        console.log('Bulk activate request received');
        console.log('Request body:', req.body);
        console.log('Content-Type:', req.get('Content-Type'));
        
        const { employee_ids } = req.body;
        
        console.log('Extracted employee_ids:', employee_ids);
        console.log('Type of employee_ids:', typeof employee_ids);
        console.log('Is array:', Array.isArray(employee_ids));
        
        if (!employee_ids || employee_ids.length === 0) {
            const message = 'No employees selected';
            console.log('Error: No employee_ids found');
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(400).json({ error: message });
            }
            req.flash('error', message);
            return res.redirect('/admin/employees');
        }
        
        try {
            const connection = await pool.getConnection();
            await connection.beginTransaction();
            
            try {
                const employeeIdArray = Array.isArray(employee_ids) ? employee_ids : [employee_ids];
                const placeholders = employeeIdArray.map(() => '?').join(',');
                
                // Update user status
                await connection.execute(
                    `UPDATE users SET is_active = 1 WHERE user_id IN (${placeholders})`,
                    employeeIdArray
                );
                
                // Update employee status
                await connection.execute(
                    `UPDATE employees SET is_active = 1 WHERE user_id IN (${placeholders})`,
                    employeeIdArray
                );
                
                await connection.commit();
                const successMessage = `${employeeIdArray.length} employee(s) activated successfully`;
                
                if (req.headers.accept && req.headers.accept.includes('application/json')) {
                    return res.json({ success: true, message: successMessage });
                }
                req.flash('success', successMessage);
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
        } catch (error) {
            console.error('Bulk activate error:', error);
            const errorMessage = 'Error activating employees';
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(500).json({ error: errorMessage });
            }
            req.flash('error', errorMessage);
        }
        
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.json({ success: true });
        }
        res.redirect('/admin/employees');
    });

    // Admin: Employee Clearance Route
    router.get('/clearance', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            const { employee_id } = req.query;
            
            // Get all employees
            const [employees] = await pool.execute(`
                SELECT u.user_id, u.full_name, u.username, u.is_active, d.department_name
                FROM users u
                JOIN employees e ON u.user_id = e.user_id
                JOIN departments d ON e.department_id = d.department_id
                WHERE u.role IN ('employee', 'monitor')
                ORDER BY u.full_name
            `);
            
            let selectedEmployee = null;
            let assignments = [];
            let clearanceStatus = {
                totalAssigned: 0,
                totalReturned: 0,
                pendingReturns: 0,
                clearancePercentage: 0,
                canDeactivate: false
            };
            
            if (employee_id) {
                // Get selected employee details
                const [empDetails] = await pool.execute(`
                    SELECT u.user_id, u.full_name, u.username, u.is_active, d.department_name
                    FROM users u
                    JOIN employees e ON u.user_id = e.user_id
                    JOIN departments d ON e.department_id = d.department_id
                    WHERE u.user_id = ?
                `, [employee_id]);
                
                if (empDetails.length > 0) {
                    selectedEmployee = empDetails[0];
                    
                    // Get all product assignments for this employee
                    const [assignmentData] = await pool.execute(`
                        SELECT pa.*, p.product_name, u.full_name as monitor_name
                        FROM product_assignments pa
                        JOIN products p ON pa.product_id = p.product_id
                        JOIN users u ON pa.monitor_id = u.user_id
                        JOIN employees e ON pa.employee_id = e.employee_id
                        WHERE e.user_id = ?
                        ORDER BY pa.assigned_at DESC
                    `, [employee_id]);
                    
                    assignments = assignmentData;
                    
                    // Calculate clearance status
                    clearanceStatus.totalAssigned = assignments.length;
                    clearanceStatus.totalReturned = assignments.filter(a => a.is_returned).length;
                    clearanceStatus.pendingReturns = clearanceStatus.totalAssigned - clearanceStatus.totalReturned;
                    clearanceStatus.clearancePercentage = clearanceStatus.totalAssigned > 0 
                        ? Math.round((clearanceStatus.totalReturned / clearanceStatus.totalAssigned) * 100) 
                        : 100;
                    clearanceStatus.canDeactivate = clearanceStatus.pendingReturns === 0;
                }
            }
            
            res.render('admin/clearance', {
                user: req.session.user,
                employees,
                selectedEmployee,
                assignments,
                clearanceStatus
            });
        } catch (error) {
            console.error('Clearance page error:', error);
            req.flash('error', 'Error loading clearance page');
            res.redirect('/admin/employees');
        }
    });

    // Admin: Process Return Request Route (same as monitor)
    router.post('/process-return', requireAuth, requireRole(['admin']), async (req, res) => {
        const { assignment_id, action } = req.body;
        
        try {
            const connection = await pool.getConnection();
            await connection.beginTransaction();
            
            try {
                if (action === 'approve') {
                    // Get assignment details
                    const [assignments] = await connection.execute(
                        'SELECT * FROM product_assignments WHERE assignment_id = ? AND return_status = "requested"',
                        [assignment_id]
                    );
                    
                    if (assignments.length === 0) {
                        throw new Error('Assignment not found or not in requested status');
                    }
                    
                    const assignment = assignments[0];
                    
                    // Update assignment as returned and approved
                    await connection.execute(
                        'UPDATE product_assignments SET is_returned = 1, return_status = "approved", return_date = NOW() WHERE assignment_id = ?',
                        [assignment_id]
                    );
                    
                    // Restore product quantity
                    await connection.execute(
                        'UPDATE products SET quantity = quantity + ? WHERE product_id = ?',
                        [assignment.quantity, assignment.product_id]
                    );
                    
                    req.flash('success', 'Return approved successfully. Product is now available for request.');
                } else if (action === 'reject') {
                    // Reset return status to none
                    await connection.execute(
                        'UPDATE product_assignments SET return_status = "none" WHERE assignment_id = ?',
                        [assignment_id]
                    );
                    
                    req.flash('success', 'Return request rejected.');
                }
                
                await connection.commit();
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
            res.redirect('/monitor/approvals'); // Redirect to monitor approvals since admin uses same page
        } catch (error) {
            console.error('Admin process return error:', error);
            req.flash('error', 'Error processing return request');
            res.redirect('/monitor/approvals');
        }
    });

    // Route: Download file attachment (Admin)
    router.get('/download-attachment/:attachmentId', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            const attachmentId = req.params.attachmentId;
            
            // Get attachment details
            const [attachments] = await pool.execute(
                'SELECT * FROM product_attachments WHERE attachment_id = ?',
                [attachmentId]
            );
            
            if (attachments.length === 0) {
                return res.status(404).json({ error: 'File not found' });
            }
            
            const attachment = attachments[0];
            const filePath = attachment.file_path;
            
            // Check if file exists
            const fs = require('fs');
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found on server' });
            }
            
            // Set headers for download
            res.setHeader('Content-Disposition', `attachment; filename="${attachment.original_filename}"`);
            res.setHeader('Content-Type', attachment.mime_type);
            
            // Send file
            res.sendFile(path.resolve(filePath));
            
        } catch (error) {
            console.error('Download error:', error);
            res.status(500).json({ error: 'Error downloading file' });
        }
    });

    // Route: View product attachments (API - Admin)
    router.get('/api/product-attachments/:productId', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            const productId = req.params.productId;
            const attachments = await getProductAttachments(pool, productId);
            
            // Add file icons and formatted sizes
            const formattedAttachments = attachments.map(attachment => ({
                ...attachment,
                file_icon: getFileIcon(attachment.filename),
                formatted_size: formatFileSize(attachment.file_size),
                download_url: `/admin/download-attachment/${attachment.attachment_id}`
            }));
            
            res.json(formattedAttachments);
        } catch (error) {
            console.error('Error fetching attachments:', error);
            res.status(500).json({ error: 'Error fetching attachments' });
        }
    });

    // Route: Delete attachment (Admin)
    router.delete('/api/attachment/:attachmentId', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            const attachmentId = req.params.attachmentId;
            await deleteFileAttachment(pool, attachmentId, req.session.user.user_id);
            res.json({ success: true, message: 'Attachment deleted successfully' });
        } catch (error) {
            console.error('Delete attachment error:', error);
            res.status(500).json({ error: 'Error deleting attachment' });
        }
    });

    return router;
};