#!/usr/bin/env node

/**
 * Basic Tests for Product Management System
 * This file contains basic functionality tests
 */

console.log('🧪 Running Basic Tests...\n');

// Test 1: Check if required modules can be loaded
console.log('✅ Test 1: Module Loading');
try {
    const express = require('express');
    const bcrypt = require('bcrypt');
    const mysql = require('mysql2');
    console.log('   - Express.js loaded successfully');
    console.log('   - bcrypt loaded successfully');
    console.log('   - MySQL2 loaded successfully');
} catch (error) {
    console.log('❌ Module loading failed:', error.message);
    process.exit(1);
}

// Test 2: Check bcrypt functionality
console.log('\n✅ Test 2: bcrypt Functionality');
async function testBcrypt() {
    try {
        const bcrypt = require('bcrypt');
        const password = 'testpassword123';
        const hash = await bcrypt.hash(password, 10);
        const isValid = await bcrypt.compare(password, hash);
        
        if (isValid) {
            console.log('   - Password hashing and comparison working');
        } else {
            throw new Error('Password comparison failed');
        }
    } catch (error) {
        console.log('❌ bcrypt test failed:', error.message);
        process.exit(1);
    }
}

// Test 3: Basic Express app creation
console.log('\n✅ Test 3: Express App Creation');
try {
    const express = require('express');
    const app = express();
    
    app.get('/test', (req, res) => {
        res.json({ status: 'ok', message: 'Test endpoint working' });
    });
    
    console.log('   - Express app created successfully');
    console.log('   - Test route defined successfully');
} catch (error) {
    console.log('❌ Express app creation failed:', error.message);
    process.exit(1);
}

// Test 4: Environment configuration
console.log('\n✅ Test 4: Environment Configuration');
try {
    // Check if important files exist
    const fs = require('fs');
    const path = require('path');
    
    const serverPath = path.join(__dirname, '..', 'server.js');
    const packagePath = path.join(__dirname, '..', 'package.json');
    const databasePath = path.join(__dirname, '..', 'database.sql');
    
    if (fs.existsSync(serverPath)) {
        console.log('   - server.js exists');
    } else {
        throw new Error('server.js not found');
    }
    
    if (fs.existsSync(packagePath)) {
        console.log('   - package.json exists');
    } else {
        throw new Error('package.json not found');
    }
    
    if (fs.existsSync(databasePath)) {
        console.log('   - database.sql exists');
    } else {
        throw new Error('database.sql not found');
    }
    
} catch (error) {
    console.log('❌ Environment configuration test failed:', error.message);
    process.exit(1);
}

// Run async tests
(async () => {
    await testBcrypt();
    
    console.log('\n🎉 All basic tests passed!');
    console.log('✨ Product Management System basic functionality verified\n');
    process.exit(0);
})();
