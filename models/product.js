const connection = require('../app').connection;

const Product = {
  getAllProducts: (callback) => {
    const query = `SELECT * FROM products`;
    connection.query(query, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results);
    });
  },

  createProduct: (productData, callback) => {
    const query = `INSERT INTO products (product_name, description, quantity, added_by) VALUES (?, ?, ?, ?)`;
    const values = [productData.product_name, productData.description, productData.quantity, productData.added_by];
    connection.query(query, values, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results.insertId);
    });
  },

  getProductById: (productId, callback) => {
    const query = `SELECT * FROM products WHERE product_id = ?`;
    connection.query(query, [productId], (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results[0]);
    });
  },

  updateProduct: (productId, productData, callback) => {
    const query = `UPDATE products SET product_name = ?, description = ?, quantity = ? WHERE product_id = ?`;
    const values = [productData.product_name, productData.description, productData.quantity, productId];
    connection.query(query, values, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results.affectedRows);
    });
  },

  deleteProduct: (productId, callback) => {
    const query = `DELETE FROM products WHERE product_id = ?`;
    connection.query(query, [productId], (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results.affectedRows);
    });
  },

  updateProductQuantity: (productId, quantityChange, callback) => {
    // quantityChange should be negative for assignment, positive for return
    const query = `UPDATE products SET quantity = quantity + ? WHERE product_id = ?`;
    const values = [quantityChange, productId];
    connection.query(query, values, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results.affectedRows);
    });
  },

  getStockReportData: (callback) => {
    const query = `
      SELECT
          p.product_id,
          p.product_name,
          p.quantity AS total_quantity,
          SUM(CASE WHEN pa.is_returned = FALSE THEN pa.quantity ELSE 0 END) AS quantity_assigned
      FROM products p
      LEFT JOIN product_assignments pa ON p.product_id = pa.product_id
      GROUP BY p.product_id, p.product_name, p.quantity
      ORDER BY p.product_name;
    `;
    connection.query(query, (error, results) => {
      if (error) {
        return callback(error, null);
      }
      // Calculate available quantity in the application layer for simplicity
      const stockData = results.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        total_quantity: item.total_quantity,
        quantity_assigned: item.quantity_assigned || 0,
        quantity_available: item.total_quantity - (item.quantity_assigned || 0)
      }));
      callback(null, stockData);
    });
  }
};

module.exports = Product;