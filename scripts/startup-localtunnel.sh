#!/bin/bash
set -e

echo "🚀 Starting All-in-One Container with LocalTunnel..."
echo "📦 Container includes: Node.js App + MySQL Database + LocalTunnel"
echo "🌐 Local access: http://localhost:3000"
echo "🌍 Global access: https://${LT_SUBDOMAIN:-marquardt-inventory}.loca.lt"
echo "📊 Admin login: admin / password"
echo "✨ No signup required - instant public URL!"

# Initialize MySQL data directory if it doesn't exist
if [ ! -d "/var/lib/mysql/mysql" ]; then
    echo "📋 Initializing MySQL database..."
    mysqld --initialize-insecure --user=mysql --datadir=/var/lib/mysql
fi

# Start MySQL temporarily to import schema
echo "🗄️  Starting MySQL for schema import..."
mysqld --user=mysql --skip-networking --socket=/tmp/mysql_init.sock &
MYSQL_PID=$!

# Wait for MySQL to start
sleep 10

# Import database schema
echo "📥 Importing database schema..."
mysql --socket=/tmp/mysql_init.sock -u root < /tmp/database.sql

# Stop temporary MySQL
kill $MYSQL_PID
wait $MYSQL_PID 2>/dev/null || true

echo "✅ Database initialized successfully!"
echo "🔄 Starting services with supervisor..."
echo "🌐 Your app will be available at: https://${LT_SUBDOMAIN:-marquardt-inventory}.loca.lt"

# Start all services with supervisor (including localtunnel)
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
