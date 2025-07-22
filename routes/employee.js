const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const Request = require('../models/request');
const Assignment = require('../models/assignment');
const User = require('../models/user'); // Import User model

// Employee dashboard
router.get('/dashboard', (req, res) => {
  res.render('employee/dashboard');
});

// View Products (Employee)
router.get('/products', (req, res) => {
  Product.getAllProducts((error, products) => {
    if (error) {
      console.error('Error fetching products:', error);
      return res.status(500).send('Internal Server Error');
    }
    res.render('products/list', { products, userRole: 'employee' }); // Pass userRole
  });
});

// Request Product - Display form (Employee)
router.get('/requests/create/:productId', (req, res) => {
  const productId = req.params.productId;
  Product.getProductById(productId, (error, product) => {
    if (error) {
      console.error('Error fetching product:', error);
      return res.status(500).send('Internal Server Error');
    }
    if (!product) {
      return res.status(404).send('Product not found');
    }
    res.render('employee/request_product', { product });
  });
});

// Request Product - Submit form (Employee)
router.post('/requests/create/:productId', (req, res) => {
  const productId = req.params.productId;
  const { quantity, purpose } = req.body;
  // In a real application, get the employee_id from the logged-in user session
  const employeeId = 3; // Placeholder employee ID

  const requestData = {
    employee_id: employeeId,
    product_id: productId,
    quantity: quantity,
    purpose: purpose
  };

  Request.createProductRequest(requestData, (error, requestId) => {
    if (error) {
      console.error('Error creating product request:', error);
      return res.status(500).send('Internal Server Error');
    }
    // Redirect to the request history page
    res.redirect('/employee/requests/history');
  });
});

// View Request History (Employee)
router.get('/requests/history', (req, res) => {
  // In a real application, get the employee_id from the logged-in user session
  const employeeId = 3; // Placeholder employee ID

  Request.getRequestsByEmployeeId(employeeId, (error, requests) => {
    if (error) {
      console.error('Error fetching request history:', error);
      return res.status(500).send('Internal Server Error');
    }
    res.render('employee/request_history', { requests });
  });
});

// View Assignment Records (Employee)
router.get('/assignments/records', (req, res) => {
  // In a real application, get the employee_id from the logged-in user session
  const employeeId = 3; // Placeholder employee ID

  Assignment.getAssignmentsByEmployeeId(employeeId, (error, assignments) => {
    if (error) {
      console.error('Error fetching assignment records:', error);
      return res.status(500).send('Internal Server Error');
    }
    res.render('employee/assignment_records', { assignments });
  });
});

// View Account History (Employee)
router.get('/account/history', (req, res) => {
   // In a real application, get the user_id from the logged-in user session
   const userId = 3; // Placeholder user ID for employee

   User.getEmployeeById(userId, (error, employee) => { // Reusing getEmployeeById
      if (error) {
         console.error('Error fetching employee account history:', error);
         return res.status(500).send('Internal Server Error');
      }
      if (!employee) {
         return res.status(404).send('Employee not found');
      }
      res.render('employee/account_history', { employee });
   });
});

// Add other employee routes here

module.exports = router;