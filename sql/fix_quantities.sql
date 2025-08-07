-- Reset all product quantities to 1 to ensure they show up
UPDATE products SET quantity = 1 WHERE is_available = 1;