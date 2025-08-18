-- Create the sigma user and grant privileges
CREATE USER 'sigma'@'%' IDENTIFIED BY 'sigma';
GRANT ALL PRIVILEGES ON *.* TO 'sigma'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;

-- Show confirmation
SELECT User, Host FROM mysql.user WHERE User = 'sigma';
