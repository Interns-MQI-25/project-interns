// Simple test to verify the application setup
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

console.log('🧪 Testing Asset Management System Setup...\n');

// Test 1: Check dependencies
console.log('✓ Testing dependencies...');
try {
    require('express');
    require('ejs');
    require('mysql2');
    require('bcryptjs');
    require('express-session');
    require('body-parser');
    require('method-override');
    console.log('  ✅ All dependencies are installed\n');
} catch (error) {
    console.log('  ❌ Missing dependencies:', error.message);
    process.exit(1);
}

// Test 2: Database connection
console.log('✓ Testing database connection...');
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Update with your password
    database: 'asset_management'
});

db.connect((err) => {
    if (err) {
        console.log('  ❌ Database connection failed:', err.message);
        console.log('  💡 Make sure MySQL is running and database exists');
        process.exit(1);
    }
    
    console.log('  ✅ Database connection successful');
    
    // Test 3: Check tables exist
    console.log('✓ Testing database tables...');
    db.query('SHOW TABLES', (err, results) => {
        if (err) {
            console.log('  ❌ Error checking tables:', err.message);
            db.end();
            process.exit(1);
        }
        
        const tables = results.map(row => Object.values(row)[0]);
        const requiredTables = ['users', 'products', 'requests'];
        const missingTables = requiredTables.filter(table => !tables.includes(table));
        
        if (missingTables.length > 0) {
            console.log('  ❌ Missing tables:', missingTables.join(', '));
            console.log('  💡 Run: mysql -u root -p asset_management < database.sql');
            db.end();
            process.exit(1);
        }
        
        console.log('  ✅ All required tables exist');
        
        // Test 4: Check if users exist
        console.log('✓ Testing default users...');
        db.query('SELECT COUNT(*) as count FROM users', (err, results) => {
            if (err) {
                console.log('  ❌ Error checking users:', err.message);
                db.end();
                process.exit(1);
            }
            
            const userCount = results[0].count;
            if (userCount === 0) {
                console.log('  ❌ No users found');
                console.log('  💡 Run: node create-users.js');
            } else {
                console.log(`  ✅ Found ${userCount} users in database`);
            }
            
            console.log('\n🎉 Setup verification complete!');
            console.log('\nTo start the application:');
            console.log('  npm run dev');
            console.log('\nTo access the application:');
            console.log('  http://localhost:3000');
            
            db.end();
        });
    });
});
