#!/usr/bin/env node

/**
 * Database Tests for Product Management System
 * This file contains database connectivity and functionality tests
 */

const mysql = require('mysql2/promise');

console.log('🗄️  Running Database Tests...\n');

// Database configuration for testing
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'sigma',
    password: process.env.DB_PASSWORD || 'sigma',
    database: process.env.DB_NAME || 'product_management_system_test'
};

async function testDatabaseConnection() {
    console.log('✅ Test 1: Database Connection');
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('   - Successfully connected to MySQL database');
        console.log(`   - Connected to database: ${dbConfig.database}`);
        
        await connection.end();
        return true;
    } catch (error) {
        console.log('❌ Database connection failed:', error.message);
        console.log('   - Check if MySQL is running and credentials are correct');
        return false;
    }
}

async function testTableStructure() {
    console.log('\n✅ Test 2: Table Structure Verification');
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        
        // Check if main tables exist
        const requiredTables = ['users', 'products', 'requests', 'admin_assignments'];
        
        for (const table of requiredTables) {
            const [rows] = await connection.execute(`SHOW TABLES LIKE '${table}'`);
            if (rows.length > 0) {
                console.log(`   - Table '${table}' exists`);
            } else {
                throw new Error(`Required table '${table}' not found`);
            }
        }
        
        await connection.end();
        return true;
    } catch (error) {
        console.log('❌ Table structure test failed:', error.message);
        if (connection) await connection.end();
        return false;
    }
}

async function testBasicQueries() {
    console.log('\n✅ Test 3: Basic Query Operations');
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        
        // Test SELECT query on users table
        const [userRows] = await connection.execute('SELECT COUNT(*) as count FROM users');
        console.log(`   - Users table query successful: ${userRows[0].count} users found`);
        
        // Test SELECT query on products table
        const [productRows] = await connection.execute('SELECT COUNT(*) as count FROM products');
        console.log(`   - Products table query successful: ${productRows[0].count} products found`);
        
        // Test SELECT query on requests table
        const [requestRows] = await connection.execute('SELECT COUNT(*) as count FROM requests');
        console.log(`   - Requests table query successful: ${requestRows[0].count} requests found`);
        
        await connection.end();
        return true;
    } catch (error) {
        console.log('❌ Basic queries test failed:', error.message);
        if (connection) await connection.end();
        return false;
    }
}

async function testAdminSystem() {
    console.log('\n✅ Test 4: Admin System Verification');
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        
        // Check admin assignments table
        const [adminRows] = await connection.execute(
            'SELECT COUNT(*) as count FROM admin_assignments WHERE is_active = 1'
        );
        console.log(`   - Active admin assignments: ${adminRows[0].count}`);
        
        // Check if admin users exist
        const [adminUsers] = await connection.execute(
            'SELECT COUNT(*) as count FROM users WHERE role = "admin"'
        );
        console.log(`   - Admin users in system: ${adminUsers[0].count}`);
        
        await connection.end();
        return true;
    } catch (error) {
        console.log('❌ Admin system test failed:', error.message);
        if (connection) await connection.end();
        return false;
    }
}

// Run all database tests
(async () => {
    console.log(`🔗 Connecting to: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    console.log(`👤 Using credentials: ${dbConfig.user}\n`);
    
    const results = [];
    
    results.push(await testDatabaseConnection());
    
    if (results[0]) {
        results.push(await testTableStructure());
        results.push(await testBasicQueries());
        results.push(await testAdminSystem());
    }
    
    const passedTests = results.filter(Boolean).length;
    const totalTests = results.length;
    
    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All database tests passed!');
        console.log('✨ Database connectivity and structure verified\n');
        process.exit(0);
    } else {
        console.log('❌ Some database tests failed');
        console.log('💡 Make sure MySQL is running and database is properly set up\n');
        process.exit(1);
    }
})();
