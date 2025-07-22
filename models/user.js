const connection = require('../app').connection;
const bcrypt = require('bcrypt');

const User = {
  findByUsername: (username, callback) => {
    const query = `SELECT * FROM users WHERE username = ?`;
    connection.query(query, [username], (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results[0]);
    });
  },

  createRegistrationRequest: (userData, callback) => {
    const query = `INSERT INTO registration_requests (full_name, username, email, password, department_id) VALUES (?, ?, ?, ?, ?)`;
    const values = [userData.full_name, userData.username, userData.email, userData.password, userData.department_id];
    connection.query(query, values, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results.insertId);
    });
  },

  findDepartmentByName: (departmentName, callback) => {
    const query = `SELECT department_id FROM departments WHERE department_name = ?`;
    connection.query(query, [departmentName], (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results[0] ? results[0].department_id : null);
    });
  },

  getPendingRegistrationRequests: (callback) => {
    const query = `SELECT * FROM registration_requests WHERE status = 'pending'`;
    connection.query(query, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results);
    });
  },

  getRegistrationRequestById: (requestId, callback) => {
    const query = `SELECT * FROM registration_requests WHERE request_id = ?`;
    connection.query(query, [requestId], (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results[0]);
    });
  },

  createUser: (userData, callback) => {
    const query = `INSERT INTO users (full_name, username, email, password, role) VALUES (?, ?, ?, ?, ?)`;
    const values = [userData.full_name, userData.username, userData.email, userData.password, userData.role];
    connection.query(query, values, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results.insertId);
    });
  },

  createEmployee: (userId, departmentId, callback) => {
    const query = `INSERT INTO employees (user_id, department_id) VALUES (?, ?)`;
    const values = [userId, departmentId];
    connection.query(query, values, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results.insertId);
    });
  },

  updateRegistrationRequestStatus: (requestId, status, processedBy, callback) => {
    const query = `UPDATE registration_requests SET status = ?, processed_by = ?, processed_at = CURRENT_TIMESTAMP WHERE request_id = ?`;
    const values = [status, processedBy, requestId];
    connection.query(query, values, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results.affectedRows);
    });
  },

  getAllEmployees: (callback) => {
    const query = `SELECT u.user_id, u.full_name, u.username, u.email, d.department_name FROM users u JOIN employees e ON u.user_id = e.user_id JOIN departments d ON e.department_id = d.department_id WHERE u.role = 'employee'`;
    connection.query(query, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results);
    });
  },

  getEmployeeById: (userId, callback) => {
    const query = `SELECT u.user_id, u.full_name, u.username, u.email, e.department_id FROM users u JOIN employees e ON u.user_id = e.user_id WHERE u.user_id = ? AND u.role = 'employee'`;
    connection.query(query, [userId], (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results[0]);
    });
  },

  updateUser: (userId, userData, callback) => {
    const query = `UPDATE users SET full_name = ?, username = ?, email = ? WHERE user_id = ?`;
    const values = [userData.full_name, userData.username, userData.email, userId];
    connection.query(query, values, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      // Assuming department update is handled separately or not allowed via this function
      callback(null, results.affectedRows);
    });
  },

  deleteUser: (userId, callback) => {
    const query = `DELETE FROM users WHERE user_id = ?`;
    connection.query(query, [userId], (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results.affectedRows);
    });
  },

  getAllMonitors: (callback) => {
    const query = `SELECT u.user_id, u.full_name, u.username, u.email, ma.start_date, ma.end_date FROM users u JOIN monitor_assignments ma ON u.user_id = ma.user_id WHERE u.role = 'monitor' AND ma.is_active = TRUE`;
    connection.query(query, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results);
    });
  },

  getAvailableEmployeesForMonitor: (callback) => {
    const query = `SELECT u.user_id, u.full_name, u.username FROM users u LEFT JOIN monitor_assignments ma ON u.user_id = ma.user_id WHERE u.role = 'employee' AND (ma.assignment_id IS NULL OR ma.is_active = FALSE)`;
     connection.query(query, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results);
    });
  },

  assignMonitor: (userId, assignedBy, startDate, endDate, callback) => {
    // First, update user role to monitor
    const updateUserRoleQuery = `UPDATE users SET role = 'monitor' WHERE user_id = ?`;
    connection.query(updateUserRoleQuery, [userId], (error, results) => {
      if (error) {
        return callback(error, null);
      }

      // Then, create monitor assignment
      const createAssignmentQuery = `INSERT INTO monitor_assignments (user_id, assigned_by, start_date, end_date) VALUES (?, ?, ?, ?)`;
      const values = [userId, assignedBy, startDate, endDate];
      connection.query(createAssignmentQuery, values, (error, results) => {
        if (error) {
          // Consider rolling back user role update here
          return callback(error, null);
        }
        callback(null, results.insertId);
      });
    });
  },

  unassignMonitor: (userId, callback) => {
    // First, update monitor assignment to inactive
    const updateAssignmentQuery = `UPDATE monitor_assignments SET is_active = FALSE, returned_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_active = TRUE`;
     connection.query(updateAssignmentQuery, [userId], (error, results) => {
      if (error) {
        return callback(error, null);
      }

      // Then, update user role back to employee
      const updateUserRoleQuery = `UPDATE users SET role = 'employee' WHERE user_id = ?`;
       connection.query(updateUserRoleQuery, [userId], (error, results) => {
        if (error) {
          // Consider rolling back assignment update here
          return callback(error, null);
        }
        callback(null, results.affectedRows);
      });
    });
  },

  getAllMonitorAssignments: (callback) => {
    const query = `SELECT ma.assignment_id, u.full_name as monitor_name, a.full_name as assigned_by_name, ma.start_date, ma.end_date, ma.is_active FROM monitor_assignments ma JOIN users u ON ma.user_id = u.user_id JOIN users a ON ma.assigned_by = a.user_id ORDER BY ma.start_date DESC`;
    connection.query(query, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results);
    });
  }

  // Add other user-related database functions here (e.g., findById, updatePassword, etc.)
};

module.exports = User;