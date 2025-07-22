const connection = require('../app').connection;
const bcrypt = require('bcrypt');

const User = {
  findByUsername: (username, callback) => {
    const query = 'SELECT * FROM users WHERE username = ?';
    connection.query(query, [username], (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results[0]);
    });
  },

  createRegistrationRequest: (userData, callback) => {
    const query = 'INSERT INTO registration_requests (full_name, username, email, password, department_id) VALUES (?, ?, ?, ?, ?)';
    const values = [userData.full_name, userData.username, userData.email, userData.password, userData.department_id];
    connection.query(query, values, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results.insertId);
    });
  },

  findDepartmentByName: (departmentName, callback) => {
    const query = 'SELECT department_id FROM departments WHERE department_name = ?';
    connection.query(query, [departmentName], (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results[0] ? results[0].department_id : null);
    });
  }

  // Add other user-related database functions here (e.g., findById, updatePassword, etc.)
};

module.exports = User;