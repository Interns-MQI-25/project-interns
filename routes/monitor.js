const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const Request = require('../models/request');
const Assignment = require('../models/assignment');

// Monitor dashboard
router.get('/dashboard', (req, res) => {
  res.render('monitor/dashboard');
});

// Product Management - View Products (Monitor)
router.get('/products', (req, res) => {
  Product.getAllProducts((error, products) => {
    if (error) {
      console.error('Error fetching products:', error);
      return res.status(500).send('Internal Server Error');
    }
    res.render('products/list', { products, userRole: 'monitor' }); // Pass userRole to control view elements
  });
});

// Product Management - Add Product (Monitor)
router.post('/products/add', (req, res) => {
  const { product_name, description, quantity } = req.body;
  // In a real application, you would get the monitor user ID from the session
  const addedBy = 2; // Placeholder user ID for monitor
  const productData = { product_name, description, quantity, added_by: addedBy };

  Product.createProduct(productData, (error, productId) => {
    if (error) {
      console.error('Error adding product:', error);
      return res.status(500).send('Internal Server Error');
    }
    res.redirect('/monitor/products'); // Redirect back to the product list
  });
});

// Product Management - Edit Product (Monitor - GET)
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
    res.render('products/edit', { product, userRole: 'monitor' });
  });
});

// Product Management - Edit Product (Monitor - POST)
router.post('/products/edit/:productId', (req, res) => {
  const productId = req.params.productId;
  const { product_name, description, quantity } = req.body;
  const productData = { product_name, description, quantity };

  Product.updateProduct(productId, productData, (error, affectedRows) => {
    if (error) {
      console.error('Error updating product:', error);
      return res.status(500).send('Internal Server Error');
    }
    res.redirect('/monitor/products'); // Redirect back to the product list
  });
});

// Product Management - Delete Product (Monitor)
router.post('/products/delete/:productId', (req, res) => {
  const productId = req.params.productId;
  Product.deleteProduct(productId, (error, affectedRows) => {
    if (error) {
      console.error('Error deleting product:', error);
      return res.status(500).send('Internal Server Error');
    }
    res.redirect('/monitor/products'); // Redirect back to the product list
  });
});

// Manage Product Requests - View Pending Requests (Monitor)
router.get('/requests/pending', (req, res) => {
  Request.getAllPendingRequests((error, requests) => {
    if (error) {
      console.error('Error fetching pending requests:', error);
      return res.status(500).send('Internal Server Error');
    }
    res.render('monitor/manage_requests', { requests });
  });
});

// Manage Product Requests - Approve Request (Monitor)
router.post('/requests/approve/:requestId', (req, res) => {
  const requestId = req.params.requestId;
  // In a real application, get the monitor user ID from the logged-in user session
  const processedBy = 2; // Placeholder monitor ID

  Request.updateRequestStatus(requestId, 'approved', processedBy, (error, affectedRows) => {
    if (error) {
      console.error('Error approving request:', error);
      return res.status(500).send('Internal Server Error');
    }
    // Redirect to the assign product page for this request
    res.redirect(`/monitor/assignments/assign/${requestId}`);
  });
});

// Manage Product Requests - Reject Request (Monitor)
router.post('/requests/reject/:requestId', (req, res) => {
  const requestId = req.params.requestId;
  // In a real application, get the monitor user ID from the logged-in user session
  const processedBy = 2; // Placeholder monitor ID

  Request.updateRequestStatus(requestId, 'rejected', processedBy, (error, affectedRows) => {
    if (error) {
      console.error('Error rejecting request:', error);
      return res.status(500).send('Internal Server Error');
    }
    // Redirect back to the pending requests page
    res.redirect('/monitor/requests/pending');
  });
});

// Manage Product Assignments - Display Assign Form (Monitor)
router.get('/assignments/assign/:requestId', (req, res) => {
  const requestId = req.params.requestId;
  // Fetch the request details to display on the form
  Request.getRegistrationRequestById(requestId, (error, request) => { // Reusing getRegistrationRequestById, might need a more general getRequestById
    if (error) {
      console.error('Error fetching request for assignment:', error);
      return res.status(500).send('Internal Server Error');
    }
    if (!request) {
      return res.status(404).send('Product request not found');
    }
    res.render('monitor/assign_product', { request });
  });
});

// Manage Product Assignments - Assign Product (Monitor)
router.post('/assignments/assign/:requestId', (req, res) => {
  const requestId = req.params.requestId;
  const { quantity } = req.body;
  // In a real application, get the monitor user ID from the logged-in user session
  const monitorId = 2; // Placeholder monitor ID

  // Fetch the request details
  Request.getRegistrationRequestById(requestId, (error, request) => { // Reusing getRegistrationRequestById
    if (error) {
      console.error('Error fetching request for assignment:', error);
      return res.status(500).send('Internal Server Error');
    }
    if (!request) {
      return res.status(404).send('Product request not found');
    }

    // Create product assignment
    const assignmentData = {
      product_id: request.product_id,
      employee_id: request.employee_id,
      monitor_id: monitorId,
      quantity: quantity
    };

    Assignment.createProductAssignment(assignmentData, (error, assignmentId) => {
      if (error) {
        console.error('Error creating assignment:', error);
        return res.status(500).send('Internal Server Error');
      }

      // Decrease product quantity in stock
      Product.updateProductQuantity(request.product_id, -quantity, (error, affectedRows) => {
        if (error) {
          console.error('Error updating product quantity after assignment:', error);
          // Consider rolling back assignment creation here
          return res.status(500).send('Internal Server Error');
        }

        // Redirect to the assigned products page
        res.redirect('/monitor/assignments');
      });
    });
  });
});

// Manage Product Assignments - View Assigned Products (Monitor)
router.get('/assignments', (req, res) => {
  Assignment.getAssignedProducts((error, assignments) => {
    if (error) {
      console.error('Error fetching assigned products:', error);
      return res.status(500).send('Internal Server Error');
    }
    res.render('monitor/assigned_products', { assignments });
  });
});

// Manage Product Assignments - Return Product (Monitor)
router.post('/assignments/return/:assignmentId', (req, res) => {
  const assignmentId = req.params.assignmentId;
  // In a real application, get the monitor user ID from the logged-in user session
  const returnedTo = 2; // Placeholder monitor ID

  // Fetch assignment details to get product and quantity
  Assignment.getAssignmentById(assignmentId, (error, assignment) => {
    if (error) {
      console.error('Error fetching assignment for return:', error);
      return res.status(500).send('Internal Server Error');
    }
    if (!assignment) {
      return res.status(404).send('Product assignment not found');
    }

    // Update assignment to mark as returned
    Assignment.returnProduct(assignmentId, returnedTo, (error, affectedRows) => {
      if (error) {
        console.error('Error marking assignment as returned:', error);
        return res.status(500).send('Internal Server Error');
      }

      // Increase product quantity in stock
      Product.updateProductQuantity(assignment.product_id, assignment.quantity, (error, affectedRows) => {
        if (error) {
          console.error('Error updating product quantity after return:', error);
          // Consider rolling back assignment update here
          return res.status(500).send('Internal Server Error');
        }

        // Redirect to the assigned products page
        res.redirect('/monitor/assignments');
      });
    });
  });
});

// View All Request History (Monitor)
router.get('/requests/history', (req, res) => {
  Request.getAllRequests((error, requests) => {
    if (error) {
      console.error('Error fetching all request history:', error);
      return res.status(500).send('Internal Server Error');
    }
    res.render('monitor/request_history', { requests });
  });
});

// View Stock Report (Monitor)
router.get('/reports/stock', (req, res) => {
  Product.getAllProducts((error, products) => {
    if (error) {
      console.error('Error fetching products for stock report:', error);
      return res.status(500).send('Internal Server Error');
    }

    // For a real report, you would calculate assigned/returned quantities
    // by joining with product_assignments and stock_history tables.
    // For now, just display total quantity from products table.
    const stockData = products.map(product => ({
      product_name: product.product_name,
      total_quantity: product.quantity,
      quantity_assigned: 0, // Placeholder
      quantity_available: product.quantity // Placeholder
    }));

    res.render('monitor/stock_report', { stockData });
  });
});

// View Assignment Report (Monitor)
router.get('/reports/assignments', (req, res) => {
  Assignment.getAssignedProducts((error, assignments) => { // getAssignedProducts currently only fetches unreturned
     if (error) {
      console.error('Error fetching assignments for report:', error);
      return res.status(500).send('Internal Server Error');
    }
    // For a real report, you would fetch all assignments (returned and unreturned)
    // and potentially group by employee or product.
    res.render('monitor/assignment_report', { assignments });
  });
});

// Add other monitor routes here

module.exports = router;