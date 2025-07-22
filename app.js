const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mysql = require('mysql2');

// Database connection (replace with your credentials)
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'product_management_system'
});

connection.connect(err => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the database.');
});

// Make the connection available to models
module.exports.connection = connection;

// Set up EJS as the view engine
app.set('view engine', 'ejs');

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Parse incoming request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Routes
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employee');
const monitorRoutes = require('./routes/monitor');
const adminRoutes = require('./routes/admin');

app.use('/', authRoutes);
app.use('/employee', employeeRoutes);
app.use('/monitor', monitorRoutes);
app.use('/admin', adminRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});