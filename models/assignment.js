const connection = require('../app').connection;

const Assignment = {
  createProductAssignment: (assignmentData, callback) => {
    const query = `INSERT INTO product_assignments (product_id, employee_id, monitor_id, quantity) VALUES (?, ?, ?, ?)`;
    const values = [assignmentData.product_id, assignmentData.employee_id, assignmentData.monitor_id, assignmentData.quantity];
    connection.query(query, values, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results.insertId);
    });
  },

  getAssignedProducts: (callback) => {
    const query = `SELECT pa.assignment_id, pa.quantity, pa.assigned_at, pa.is_returned, pa.returned_at, p.product_name, u.full_name as employee_name, m.full_name as monitor_name FROM product_assignments pa JOIN products p ON pa.product_id = p.product_id JOIN users u ON pa.employee_id = u.user_id JOIN users m ON pa.monitor_id = m.user_id WHERE pa.is_returned = FALSE ORDER BY pa.assigned_at DESC`;
    connection.query(query, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results);
    });
  },

  getAssignmentById: (assignmentId, callback) => {
    const query = `SELECT * FROM product_assignments WHERE assignment_id = ?`;
    connection.query(query, [assignmentId], (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results[0]);
    });
  },

  returnProduct: (assignmentId, returnedTo, callback) => {
    const query = `UPDATE product_assignments SET is_returned = TRUE, returned_at = CURRENT_TIMESTAMP, returned_to = ? WHERE assignment_id = ?`;
    const values = [returnedTo, assignmentId];
    connection.query(query, values, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results.affectedRows);
    });
  },

  getAssignmentsByEmployeeId: (employeeId, callback) => {
    const query = `SELECT pa.assignment_id, pa.quantity, pa.assigned_at, pa.is_returned, pa.returned_at, p.product_name, m.full_name as monitor_name FROM product_assignments pa JOIN products p ON pa.product_id = p.product_id JOIN users m ON pa.monitor_id = m.user_id WHERE pa.employee_id = ? ORDER BY pa.assigned_at DESC`;
    connection.query(query, [employeeId], (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results);
    });
  },

  getAllAssignments: (callback) => {
    const query = `SELECT pa.assignment_id, pa.quantity, pa.assigned_at, pa.is_returned, pa.returned_at, p.product_name, u.full_name as employee_name, m.full_name as monitor_name FROM product_assignments pa JOIN products p ON pa.product_id = p.product_id JOIN users u ON pa.employee_id = u.user_id JOIN users m ON pa.monitor_id = m.user_id ORDER BY pa.assigned_at DESC`;
    connection.query(query, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results);
    });
  }

  // Add other assignment-related database functions here
};

module.exports = Assignment;