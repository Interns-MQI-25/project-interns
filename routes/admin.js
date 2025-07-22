const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Product = require('../models/product');
const Assignment = require('../models/assignment');
const Request = require('../models/request');
const bcrypt = require('bcrypt');

// Admin dashboard
router.get('/dashboard', (req, res) => {
  res.render('admin/dashboard');
});

// Manage Employees - View Registration Requests
router.get('/manage-employees/requests', (req, res) => {
  User.getPendingRegistrationRequests((error, requests) => {
    if (error) {
      console.error('Error fetching registration requests:', error);
      return res.status(500).send('Internal Server Error');
    }
    res.render('admin/manage_employees', { requests });
  });
});

// Manage Employees - Approve Registration Request
router.post('/manage-employees/requests/approve/:requestId', (req, res) => {
  const requestId = req.params.requestId;
  // In a real application, you would get the admin user ID from the session
  const adminUserId = 1; // Placeholder for admin user ID

  Request.getRegistrationRequestById(requestId, (error, request) => {
    if (error) {
      console.error('Error fetching registration request:', error);
      return res.status(500).send('Internal Server Error');
    }

    if (!request) {
      return res.status(404).send('Registration request not found');
    }

    // Create user in the users table
    const userData = {
      full_name: request.full_name,
      username: request.username,
      email: request.email,
      password: request.password, // Hashed password from registration request
      role: 'employee'
    };

    User.createUser(userData, (error, userId) => {
      if (error) {
        console.error('Error creating user:', error);
        return res.status(500).send('Internal Server Error');
      }

      // Create employee in the employees table
      User.createEmployee(userId, request.department_id, (error, employeeId) => {
        if (error) {
          console.error('Error creating employee:', error);
          // Consider rolling back user creation here in a real app
          return res.status(500).send('Internal Server Error');
        }

        // Update registration request status
        Request.updateRegistrationRequestStatus(requestId, 'approved', adminUserId, (error, affectedRows) => {
          if (error) {
            console.error('Error updating registration request status:', error);
            // Consider rolling back user and employee creation here
            return res.status(500).send('Internal Server Error');
          }

          // Redirect back to the manage employees page
          res.redirect('/admin/manage-employees/requests');
        });
      });
    });
  });
});

// Manage Employees - Reject Registration Request
router.post('/manage-employees/requests/reject/:requestId', (req, res) => {
  const requestId = req.params.requestId;
  // In a real application, you would get the admin user ID from the session
  const adminUserId = 1; // Placeholder for admin user ID

  Request.updateRegistrationRequestStatus(requestId, 'rejected', adminUserId, (error, affectedRows) => {
    if (error) {
      console.error('Error updating registration request status:', error);
      return res.status(500).send('Internal Server Error');
    }

    // Redirect back to the manage employees page
    res.redirect('/admin/manage-employees/requests');
  });
});

// Manage Employees - View Existing Employees
router.get('/manage-employees/view', (req, res) => {
  User.getAllEmployees((error, employees) => {
    if (error) {
      console.error('Error fetching employees:', error);
      return res.status(500).send('Internal Server Error');
    }
    res.render('admin/view_employees', { employees });
  });
});

// Manage Employees - Edit Employee (GET - Display form)
router.get('/manage-employees/edit/:userId', (req, res) => {
  const userId = req.params.userId;
  User.getEmployeeById(userId, (error, employee) => {
    if (error) {
      console.error('Error fetching employee:', error);
      return res.status(500).send('Internal Server Error');
    }
    if (!employee) {
      return res.status(404).send('Employee not found');
    }
    res.render('admin/edit_employee', { employee });
  });
});

// Manage Employees - Edit Employee (POST - Submit form)
router.post('/manage-employees/edit/:userId', (req, res) => {
  const userId = req.params.userId;
  const { full_name, username, email } = req.body;
  const userData = { full_name, username, email };

  User.updateUser(userId, userData, (error, affectedRows) => {
    if (error) {
      console.error('Error updating user:', error);
      // Check for duplicate entry errors
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.message.includes('username')) {
          // You might want to fetch the employee again to render the page with an error message
          return res.status(400).send('Username already exists'); // Basic error response
        } else if (error.message.includes('email')) {
           return res.status(400).send('Email already exists'); // Basic error response
        }
      }
      return res.status(500).send('Internal Server Error');
    }

    // Redirect back to the view employees page
    res.redirect('/admin/manage-employees/view');
  });
});

// Manage Employees - Delete Employee
router.post('/manage-employees/delete/:userId', (req, res) => {
  const userId = req.params.userId;
  User.deleteUser(userId, (error, affectedRows) => {
    if (error) {
      console.error('Error deleting user:', error);
      return res.status(500).send('Internal Server Error');
    }
    res.redirect('/admin/manage-employees/view');
  });
});

// Manage Employees - Create Employee (GET - Display form)
router.get('/manage-employees/create', (req, res) => {
  // In a real application, you would fetch departments to populate a dropdown
  res.render('admin/create_employee');
});

// Manage Employees - Create Employee (POST - Submit form)
router.post('/manage-employees/create', (req, res) => {
  const { full_name, username, email, password, department_id } = req.body;

  // Hash the password
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Error hashing password:', err);
      return res.status(500).send('Internal Server Error');
    }

    // Create user in the users table
    const userData = {
      full_name,
      username,
      email,
      password: hashedPassword, // Store the hashed password
      role: 'employee'
    };

    User.createUser(userData, (error, userId) => {
      if (error) {
        console.error('Error creating user:', error);
         // Check for duplicate entry errors
         if (error.code === 'ER_DUP_ENTRY') {
          if (error.message.includes('username')) {
            // You might want to render the form again with an error message
            return res.status(400).send('Username already exists'); // Basic error response
          } else if (error.message.includes('email')) {
             return res.status(400).send('Email already exists'); // Basic error response
          }
        }
        return res.status(500).send('Internal Server Error');
      }

      // Create employee in the employees table
      User.createEmployee(userId, department_id, (error, employeeId) => {
        if (error) {
          console.error('Error creating employee:', error);
          // Consider rolling back user creation here
          return res.status(500).send('Internal Server Error');
        }

        // Redirect back to the view employees page
        res.redirect('/admin/manage-employees/view');
      });
    });
  });
});

// Manage Monitors - View Monitors and Assign Option
router.get('/manage-monitors', (req, res) => {
  User.getAllMonitors((error, monitors) => {
    if (error) {
      console.error('Error fetching monitors:', error);
      return res.status(500).send('Internal Server Error');
    }
    User.getAvailableEmployeesForMonitor((error, availableEmployees) => {
      if (error) {
        console.error('Error fetching available employees:', error);
        return res.status(500).send('Internal Server Error');
      }
      res.render('admin/manage_monitors', { monitors, availableEmployees });
    });
  });
});

// Manage Monitors - Assign Monitor
router.post('/manage-monitors/assign', (req, res) => {
  const { employee_id, start_date, end_date } = req.body;
  // In a real application, you would get the admin user ID from the session
  const assignedBy = 1; // Placeholder for admin user ID

  User.assignMonitor(employee_id, assignedBy, start_date, end_date, (error, assignmentId) => {
    if (error) {
      console.error('Error assigning monitor:', error);
      return res.status(500).send('Internal Server Error');
    }
    res.redirect('/admin/manage-monitors');
  });
});

// Manage Monitors - Unassign Monitor
router.post('/manage-monitors/unassign/:userId', (req, res) => {
  const userId = req.params.userId;
  User.unassignMonitor(userId, (error, affectedRows) => {
    if (error) {
      console.error('Error unassigning monitor:', error);
      return res.status(500).send('Internal Server Error');
    }
    res.redirect('/admin/manage-monitors');
  });
});

// Manage Monitors - View Monitor History
router.get('/manage-monitors/history', (req, res) => {
  User.getAllMonitorAssignments((error, assignments) => {
    if (error) {
      console.error('Error fetching monitor assignments history:', error);
      return res.status(500).send('Internal Server Error');
    }
    res.render('admin/monitor_history', { assignments });
  });
});

// Product Management - View Products (Admin)
router.get('/products', (req, res) => {
  Product.getAllProducts((error, products) => {
    if (error) {
      console.error('Error fetching products:', error);
      return res.status(500).send('Internal Server Error');
    }
    res.render('products/list', { products, userRole: 'admin' }); // Pass userRole to control view elements
  });
});

// Product Management - Add Product (Admin)
router.post('/products/add', (req, res) => {
  const { product_name, description, quantity } = req.body;
  // In a real application, you would get the admin/monitor user ID from the session
  const addedBy = 1; // Placeholder user ID
  const productData = { product_name, description, quantity, added_by: addedBy };

  Product.createProduct(productData, (error, productId) => {
    if (error) {
      console.error('Error adding product:', error);
      return res.status(500).send('Internal Server Error');
    }
    res.redirect('/admin/products'); // Redirect back to the product list
  });
});

// Product Management - Edit Product (Admin - GET)
router.get('/products/edit/:productId', (req, res) => {
  const productId = req.params.productId;
  Product.getProductById(productId, (error, product) => {
    if (error) {
      console.error('Error fetching product:', error);
      return res.status(500).send('Internal Server Error');
    }
    if (!product) {
      return res.status(404).send('Product not found');
    }
    res.render('products/edit', { product, userRole: 'admin' });
  });
});

// Product Management - Edit Product (Admin - POST)
router.post('/products/edit/:productId', (req, res) => {
  const productId = req.params.productId;
  const { product_name, description, quantity } = req.body;
  const productData = { product_name, description, quantity };

  Product.updateProduct(productId, productData, (error, affectedRows) => {
    if (error) {
      console.error('Error updating product:', error);
      return res.status(500).send('Internal Server Error');
    }
    res.redirect('/admin/products'); // Redirect back to the product list
  });
});

// Product Management - Delete Product (Admin)
router.post('/products/delete/:productId', (req, res) => {
  const productId = req.params.productId;
  Product.deleteProduct(productId, (error, affectedRows) => {
    if (error) {
      console.error('Error deleting product:', error);
      return res.status(500).send('Internal Server Error');
    }
    res.redirect('/admin/products'); // Redirect back to the product list
  });
});

// View Stock Report (Admin)
router.get('/reports/stock', (req, res) => {
  Product.getStockReportData((error, stockData) => {
    if (error) {
      console.error('Error fetching stock report data:', error);
      return res.status(500).send('Internal Server Error');
    }
    res.render('monitor/stock_report', { stockData }); // Reusing monitor view for now
  });
});

// View Assignment Report (Admin)
router.get('/reports/assignments', (req, res) => {
  Assignment.getAllAssignments((error, assignments) => {
     if (error) {
      console.error('Error fetching assignments for report:', error);
      return res.status(500).send('Internal Server Error');
    }
    res.render('monitor/assignment_report', { assignments }); // Reusing monitor view for now
  });
});

// Add other admin routes here

module.exports = router;