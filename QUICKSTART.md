# 🏢 Product Management System

## Quick Start Guide

### 1. Database Setup
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE product_management_system;
USE product_management_system;
SOURCE database.sql;
```

### 2. Configure Environment
Update `.env` with your database credentials:
```env
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=product_management_system
```

### 3. Start Application
```bash
# Quick start
./start.sh

# Or manually
npm run dev
```

### 4. Access System
- URL: http://localhost:3000
- Default Admin: `admin` / `admin`

## 👥 User Roles

### 📊 **Employees**
- Submit product requests
- View assignment history
- Check stock availability
- Manage account settings

### 🔍 **Monitors** (Max 4)
- Approve/reject requests
- Add products to inventory
- Assign products to employees
- Generate reports
- Process returns

### 👑 **Administrators**
- Manage all users
- Assign monitor roles
- Process registrations
- System oversight
- Complete history access

## 🛠️ Tech Stack

- **Frontend**: HTML5, Tailwind CSS, JavaScript
- **Backend**: Node.js, Express.js, EJS
- **Database**: MySQL with connection pooling
- **Security**: bcryptjs, sessions, SQL injection protection

## 📋 Features

✅ **Role-based Access Control**  
✅ **Product Request Workflow**  
✅ **Real-time Inventory Management**  
✅ **User Registration Approval**  
✅ **Responsive Design**  
✅ **Activity Tracking & History**  
✅ **Stock Level Monitoring**  
✅ **Department Management**  

## 🚀 Getting Started

1. **Prerequisites**: Node.js 14+, MySQL 8.0+
2. **Install**: `npm install`
3. **Setup DB**: Run `database.sql`
4. **Configure**: Update `.env`
5. **Run**: `npm run dev`

## 📁 Project Structure

```
├── views/          # EJS templates
│   ├── auth/       # Login/Register
│   ├── employee/   # Employee pages
│   ├── monitor/    # Monitor pages
│   ├── admin/      # Admin pages
│   └── partials/   # Reusable components
├── public/         # Static assets
├── database.sql    # Database schema
└── server.js       # Main application
```

Ready to use! 🎉
