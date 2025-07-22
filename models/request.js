const connection = require('../app').connection;

const Request = {
  createProductRequest: (requestData, callback) => {
    const query = `INSERT INTO product_requests (employee_id, product_id, quantity, purpose) VALUES (?, ?, ?, ?)`;
    const values = [requestData.employee_id, requestData.product_id, requestData.quantity, requestData.purpose];
    connection.query(query, values, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results.insertId);
    });
  },

  getRequestsByEmployeeId: (employeeId, callback) => {
    const query = `SELECT pr.request_id, pr.quantity, pr.purpose, pr.status, pr.requested_at, p.product_name FROM product_requests pr JOIN products p ON pr.product_id = p.product_id WHERE pr.employee_id = ? ORDER BY pr.requested_at DESC`;
    connection.query(query, [employeeId], (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results);
    });
  },

  getAllPendingRequests: (callback) => {
    const query = `SELECT pr.request_id, pr.quantity, pr.purpose, pr.requested_at, u.full_name as employee_name, p.product_name FROM product_requests pr JOIN users u ON pr.employee_id = u.user_id JOIN products p ON pr.product_id = p.product_id WHERE pr.status = 'pending' ORDER BY pr.requested_at ASC`;
    connection.query(query, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results);
    });
  },

  updateRequestStatus: (requestId, status, processedBy, callback) => {
    const query = `UPDATE product_requests SET status = ?, processed_by = ?, processed_at = CURRENT_TIMESTAMP WHERE request_id = ?`;
    const values = [status, processedBy, requestId];
    connection.query(query, values, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results.affectedRows);
    });
  },

  getAllRequests: (callback) => {
    const query = `SELECT pr.request_id, pr.quantity, pr.purpose, pr.status, pr.requested_at, u.full_name as employee_name, p.product_name, m.full_name as processed_by_name FROM product_requests pr JOIN users u ON pr.employee_id = u.user_id JOIN products p ON pr.product_id = p.product_id LEFT JOIN users m ON pr.processed_by = m.user_id ORDER BY pr.requested_at DESC`;
    connection.query(query, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results);
    });
  }

  // Add other request-related database functions here (e.g., updateRequestStatus, etc.)
};

module.exports = Request;