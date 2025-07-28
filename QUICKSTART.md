# 🏢 Product Management System - Quick Start Guide

> **Get up and running in minutes with this comprehensive setup guide!**

## 🚀 Automated Setup (Recommended)

### Option 1: Run the Setup Script
1. For Linux/macOS
```bash
# Make the script executable and run for Linux/MacOS
cd scripts
chmod +x setup.sh
.\setup.sh
```

2. For Windows(You doublee-click the files to directly execute)
```ps1
# Make the script executable and run for Windows(PowerShell)
cd scripts
.\setup.ps1
```

```batch
REM Make the script executable and run for Windows(Command Prompt)
cd scripts
./setup.bat
```

The script will automatically:
- Install Node.js dependencies
- Create necessary directories
- Set up the MySQL database
- Configure environment variables
- Start the development server

### Option 2: Manual Setup

Follow these steps if you prefer manual installation:

## 📋 Prerequisites

- **Node.js** 14+ ([Download](https://nodejs.org/))
- **MySQL** 8.0+ ([Download](https://dev.mysql.com/downloads/))
- **npm** or **yarn** package manager

## 🛠️ Step-by-Step Installation

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone <repository-url>
cd product-management-system

# Install Node.js dependencies
npm install

# Create necessary directories
mkdir -p public/css/dist
mkdir -p logs
```

### 2. Database Setup
```bash
# Login to MySQL
mysql -u root -p

# Create database and import schema
CREATE DATABASE IF NOT EXISTS product_management_system;
USE product_management_system;
SOURCE database.sql;

# Exit MySQL
EXIT;
```

### 3. Environment Configuration
```bash
# Copy environment template (if available)
cp .env.example .env

# Or create .env manually with these settings:
```

**Edit `.env` file:**
```env
# Database Configuration
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=product_management_system
DB_PORT=3306

# Application Settings
SESSION_SECRET=your_session_secret_key_here
PORT=3000
NODE_ENV=development
```

### 4. Initialize Application
```bash
# Create admin account
node fix-admin.js

# Setup database connection
node setup-db.js

# Build Tailwind CSS (if using)
npx tailwindcss -i ./public/css/input.css -o ./public/css/dist/output.css --build
```

### 5. Start the Application
```bash
# Development mode (with auto-reload)
npm run dev

# Or production mode
npm start
```

### 6. Access the System
🌐 **Open your browser:** [http://localhost:3000](http://localhost:3000)

## 🔑 Default Login Credentials

### Admin Account
- **Username:** `admin`
- **Password:** `admin123`

### Sample Employee Accounts
- **john.doe** / `password123`
- **jane.smith** / `password123`
- **mike.wilson** / `password123` (Monitor)
- **sarah.johnson** / `password123`

## 👥 User Roles Overview

### 📊 **Employees**
- ✅ Submit product requests
- ✅ View assignment history
- ✅ Check stock availability
- ✅ Manage account settings

### 🔍 **Monitors** (Maximum 4 active)
- ✅ Approve/reject requests
- ✅ Add products to inventory
- ✅ Assign products to employees
- ✅ Generate reports
- ✅ Process returns

### 👑 **Administrators**
- ✅ Manage all users
- ✅ Assign monitor roles
- ✅ Process registrations
- ✅ Complete system oversight
- ✅ Access full history

## 🛠️ Technology Stack

- **Frontend:** HTML5, Tailwind CSS, JavaScript, EJS Templates
- **Backend:** Node.js, Express.js
- **Database:** MySQL with connection pooling
- **Security:** bcryptjs, Express sessions, SQL injection protection
- **Icons:** Font Awesome
- **Styling:** Responsive design with Tailwind CSS

## 📋 Key Features

✅ **Role-based Access Control**  
✅ **Product Request Workflow**  
✅ **Real-time Inventory Management**  
✅ **User Registration Approval**  
✅ **Responsive Design**  
✅ **Activity Tracking & History**  
✅ **Stock Level Monitoring**  
✅ **Department Management**  

## 📁 Project Structure


```
product-management-system/
├── views/              # EJS templates
│   ├── auth/           # Login/Register pages
│   ├── employee/       # Employee dashboard
│   ├── monitor/        # Monitor dashboard
│   ├── admin/          # Admin dashboard
│   └── partials/       # Reusable components
├── public/             # Static assets
│   ├── css/            # Stylesheets
│   ├── js/             # Client-side JavaScript
│   └── images/         # Images and icons
├── routes/             # Express routes
├── middleware/         # Custom middleware
├── database.sql        # Database schema
├── server.js           # Main application entry
├── .env.example        # Environment template
└── setup.sh            # Automated setup script
```

## 🚨 Troubleshooting

### Common Issues:

**Database Connection Error:**
```bash
# Check MySQL service is running
sudo systemctl status mysql

# Verify credentials in .env file
# Ensure database exists
```

**Port Already in Use:**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 <PID>

# Or use different port in .env
PORT=3001
```

**Missing Dependencies:**
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 🎯 Next Steps

1. **Login** with admin credentials
2. **Create** employee accounts or approve registrations
3. **Assign** monitor roles (max 4)
4. **Add** products to inventory
5. **Start** managing requests and assignments

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Verify all prerequisites are installed
3. Ensure database credentials are correct
4. Check console logs for error messages

---

**🎉 You're all set! The Product Management System is ready to use.**

**Access URL:** [http://localhost:3000](http://localhost:3000)  
**Admin Login:** `admin` / `admin123`
