const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcrypt');

// GET login page
router.get('/', (req, res) => {
  res.render('login', { error: null });
});

// GET register page
router.get('/register', (req, res) => {
  res.render('register', { error: null });
});

// POST login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  User.findByUsername(username, (error, user) => {
    if (error) {
      console.error('Error finding user:', error);
      return res.status(500).send('Internal Server Error');
    }

    if (!user) {
      // User not found
      return res.render('login', { error: 'Invalid username or password' });
    }

    // Compare passwords using bcrypt
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error('Error comparing passwords:', err);
        return res.status(500).send('Internal Server Error');
      }

      if (!isMatch) {
        return res.render('login', { error: 'Invalid username or password' });
      }

      // Password is correct, redirect based on role
      if (user.role === 'admin') {
        res.redirect('/admin/dashboard');
      } else if (user.role === 'monitor') {
        res.redirect('/monitor/dashboard');
      } else {
        res.redirect('/employee/dashboard');
      }
    });
  });
});

// POST register
router.post('/register', (req, res) => {
  const { full_name, username, email, password, department } = req.body;

  // Hash the password
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Error hashing password:', err);
      return res.status(500).send('Internal Server Error');
    }

    // Find department ID
    User.findDepartmentByName(department, (err, departmentId) => {
      if (err) {
        console.error('Error finding department:', err);
        return res.status(500).send('Internal Server Error');
      }

      if (!departmentId) {
        // Department not found
        return res.render('register', { error: 'Invalid department' });
      }

      // Create registration request
      const userData = {
        full_name,
        username,
        email,
        password: hashedPassword, // Store the hashed password
        department_id: departmentId
      };

      User.createRegistrationRequest(userData, (err, requestId) => {
        if (err) {
          console.error('Error creating registration request:', err);
          // Check for duplicate entry errors
          if (err.code === 'ER_DUP_ENTRY') {
            if (err.message.includes('username')) {
              return res.render('register', { error: 'Username already exists' });
            } else if (err.message.includes('email')) {
              return res.render('register', { error: 'Email already exists' });
            }
          }
          return res.status(500).send('Internal Server Error');
        }

        // Registration request created successfully
        res.send('Your registration request has been submitted for admin approval.');
      });
    });
  });
});

module.exports = router;