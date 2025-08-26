# 🏢 Marquardt India Pvt. Ltd. - Asset Management System
## Comprehensive Project Documentation

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Installation & Setup](#installation--setup)
4. [Technology Stack](#technology-stack)
5. [Database Design](#database-design)
6. [User Roles & Interfaces](#user-roles--interfaces)
7. [Backend Architecture](#backend-architecture)
8. [Routing System](#routing-system)
9. [Deployment Strategies](#deployment-strategies)
10. [Version Control & CI/CD](#version-control--cicd)
11. [Docker Implementation](#docker-implementation)
12. [Security Features](#security-features)
13. [File Management System](#file-management-system)
14. [Email Notification System](#email-notification-system)
15. [Troubleshooting & Maintenance](#troubleshooting--maintenance)

---

## Project Overview

The Marquardt India Asset Management System is a comprehensive web-based application designed to streamline inventory management, product requests, and user administration within the organization. Built with modern web technologies, this system provides role-based access control, real-time inventory tracking, email notifications, and file attachment capabilities.

### Key Features
- **Role-Based Access Control**: Three distinct user roles (Employee, Monitor, Admin)
- **Product Request Workflow**: Complete lifecycle from request to assignment
- **Email Notifications**: Automated notifications for registration and approvals
- **File Attachment System**: Document management for product specifications
- **Real-Time Inventory Tracking**: Live stock monitoring and history
- **Cloud Deployment**: Scalable deployment on Google Cloud Platform
- **Responsive Design**: Mobile-friendly interface

### Business Requirements
The system addresses critical business needs:
- Efficient asset tracking and allocation
- Streamlined approval workflows
- Centralized user management
- Audit trail maintenance
- Scalable cloud infrastructure
- Security compliance

---

## System Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │────│   Backend       │────│   Database      │
│   (EJS/HTML)    │    │   (Node.js)     │    │   (MySQL)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   File Storage  │    │   Email Service │    │   Cloud SQL     │
│   (Local/Cloud) │    │   (Gmail SMTP)  │    │   (Production)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Breakdown
1. **Presentation Layer**: EJS templates with Tailwind CSS
2. **Application Layer**: Express.js with custom middleware
3. **Business Logic Layer**: Route handlers and utility functions
4. **Data Access Layer**: MySQL with connection pooling
5. **External Services**: Gmail SMTP, Google Cloud Platform

---

## Installation & Setup

### Prerequisites & Downloads

#### Required Software
1. **Node.js 20+**
   - Download: [https://nodejs.org/](https://nodejs.org/)
   - Purpose: JavaScript runtime for server-side execution
   - Installation: Download LTS version and follow installer instructions

2. **MySQL 8.0+**
   - Download: [https://dev.mysql.com/downloads/](https://dev.mysql.com/downloads/)
   - Purpose: Relational database management system
   - Installation: Download MySQL Community Server

3. **Git**
   - Download: [https://git-scm.com/downloads](https://git-scm.com/downloads)
   - Purpose: Version control system
   - Installation: Download for your operating system

4. **Google Cloud CLI** (for deployment)
   - Download: [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)
   - Purpose: Google Cloud Platform management
   - Installation: Follow platform-specific instructions

5. **Docker** (optional)
   - Download: [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
   - Purpose: Containerization platform
   - Installation: Download Docker Desktop

### Step-by-Step Installation

#### Method 1: Automated Setup (Recommended)
```bash
# Clone the repository
git clone https://github.com/Interns-MQI-25/project-interns.git
cd project-interns

# Run automated setup script
chmod +x scripts/setup.sh
./scripts/setup.sh
```

#### Method 2: Manual Installation
```bash
# 1. Clone repository
git clone https://github.com/Interns-MQI-25/project-interns.git
cd project-interns

# 2. Install Node.js dependencies
npm install

# 3. Create environment file
cp .env.example .env
# Edit .env with your database credentials

# 4. Setup MySQL database
mysql -u root -p
CREATE DATABASE IF NOT EXISTS product_management_system;
USE product_management_system;
SOURCE sql/database.sql;
EXIT;

# 5. Start the application
npm run dev
```

### Environment Configuration
Create `.env` file with the following structure:
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

# Email Configuration (Optional)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
```

---

## Technology Stack

### Frontend Technologies
- **HTML5**: Semantic markup structure
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **JavaScript (ES6+)**: Client-side interactivity and AJAX requests
- **EJS (Embedded JavaScript)**: Server-side templating engine
- **Font Awesome**: Icon library for UI elements

### Backend Technologies
- **Node.js 20+**: JavaScript runtime environment
- **Express.js 4.x**: Web application framework
- **bcryptjs**: Password hashing and security
- **express-session**: Session management middleware
- **mysql2**: MySQL database driver with connection pooling
- **multer**: File upload handling middleware
- **nodemailer**: Email sending functionality

### Database & Storage
- **MySQL 8.0**: Primary relational database
- **Google Cloud SQL**: Production database hosting
- **Local File System**: Development file storage
- **Google Cloud Storage**: Production file storage (optional)

### Development Tools
- **npm**: Package manager and script runner
- **Git**: Version control system
- **GitHub**: Repository hosting and collaboration
- **GitHub Actions**: CI/CD pipeline automation
- **Docker**: Containerization platform

### Cloud & Deployment
- **Google App Engine**: Serverless application hosting
- **Google Cloud SQL**: Managed MySQL database
- **Google Secret Manager**: Secure credential storage
- **Google Cloud Build**: Automated deployment pipeline

---

## Database Design

### Database Schema Overview
The `database.sql` file contains the complete database structure with 10 core tables designed to handle user management, product inventory, and workflow processes.

### Core Tables Explanation

#### 1. Users Table
```sql
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('employee', 'monitor', 'admin') NOT NULL DEFAULT 'employee',
    is_super_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```
**Purpose**: Central user authentication and role management
**Key Fields**:
- `user_id`: Primary key for user identification
- `username`: Unique login identifier
- `password`: bcrypt hashed password for security
- `role`: ENUM defining user permissions (employee/monitor/admin)
- `is_super_admin`: Boolean flag for system administrators
- `is_active`: Soft delete mechanism for user deactivation

#### 2. Departments Table
```sql
CREATE TABLE departments (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    description TEXT
);
```
**Purpose**: Organizational structure management
**Key Fields**:
- `department_id`: Primary key for department identification
- `department_name`: Marquardt-specific department codes (RDT-PU, RDA-PU, etc.)
- `description`: Detailed department function description

#### 3. Employees Table
```sql
CREATE TABLE employees (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    department_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);
```
**Purpose**: Links users to organizational structure
**Key Relationships**:
- One-to-one relationship with users table
- Many-to-one relationship with departments table
- Cascade delete ensures data integrity

#### 4. Products Table
```sql
CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    item_number INT,
    asset_type VARCHAR(50),
    product_category VARCHAR(100),
    product_name VARCHAR(500),
    model_number VARCHAR(100),
    serial_number VARCHAR(100),
    is_available BOOLEAN DEFAULT TRUE,
    quantity INT DEFAULT 1,
    added_by INT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calibration_required BOOLEAN DEFAULT FALSE,
    calibration_frequency VARCHAR(50),
    calibration_due_date DATE,
    -- Additional fields for comprehensive asset management
    pr_no INT,
    po_number VARCHAR(50),
    inward_date DATE,
    inwarded_by INT,
    version_number VARCHAR(50),
    software_license_type VARCHAR(50),
    license_start DATE,
    renewal_frequency VARCHAR(50),
    next_renewal_date DATE
);
```
**Purpose**: Comprehensive product/asset inventory management
**Key Features**:
- Supports both hardware and software assets
- Calibration tracking for precision instruments
- License management for software products
- Complete audit trail with timestamps

#### 5. Product Requests Table
```sql
CREATE TABLE product_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    purpose TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_by INT,
    processed_at TIMESTAMP NULL,
    return_date TIMESTAMP NULL,
    assigned_monitor_id INT NULL,
    remarks TEXT NULL
);
```
**Purpose**: Manages product request workflow
**Workflow States**:
- `pending`: Initial request state
- `approved`: Monitor-approved request
- `rejected`: Monitor-rejected request
**Key Features**:
- Complete audit trail with timestamps
- Purpose tracking for asset allocation
- Monitor assignment for processing

#### 6. Product Assignments Table
```sql
CREATE TABLE product_assignments (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    employee_id INT NOT NULL,
    monitor_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    return_date TIMESTAMP NULL,
    is_returned BOOLEAN DEFAULT FALSE,
    returned_at TIMESTAMP NULL,
    returned_to INT,
    return_status ENUM('none', 'requested', 'approved') DEFAULT 'none',
    remarks TEXT NULL,
    return_remarks TEXT NULL
);
```
**Purpose**: Tracks active product assignments to employees
**Return Workflow**:
- `none`: No return requested
- `requested`: Employee initiated return
- `approved`: Monitor approved return
**Key Features**:
- Complete assignment lifecycle tracking
- Return process management
- Audit trail maintenance

#### 7. Stock History Table
```sql
CREATE TABLE stock_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    action ENUM('add', 'assign', 'return', 'update') NOT NULL,
    quantity INT NOT NULL,
    performed_by INT NOT NULL,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);
```
**Purpose**: Maintains complete audit trail of inventory changes
**Action Types**:
- `add`: New product added to inventory
- `assign`: Product assigned to employee
- `return`: Product returned to inventory
- `update`: Product information updated

#### 8. Registration Requests Table
```sql
CREATE TABLE registration_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    department_id INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_by INT,
    processed_at TIMESTAMP NULL
);
```
**Purpose**: Manages new user registration approval workflow
**Key Features**:
- Admin approval required for new accounts
- Email notification integration
- Duplicate prevention mechanisms

#### 9. Monitor Assignments Table
```sql
CREATE TABLE monitor_assignments (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    assigned_by INT NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);
```
**Purpose**: Manages temporary monitor role assignments
**Key Features**:
- Time-bound monitor roles (maximum 4 active)
- Admin-controlled assignment process
- Historical tracking of monitor activities

#### 10. Admin Assignments Table
```sql
CREATE TABLE admin_assignments (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    assigned_by INT NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);
```
**Purpose**: Tracks admin role assignments and delegation
**Key Features**:
- Hierarchical admin management
- Temporary admin role assignments
- Complete audit trail for administrative actions

### Sample Data Structure
The database includes comprehensive sample data:
- **3 Admin Users**: System administrators with different privilege levels
- **9 Departments**: Marquardt-specific organizational structure
- **50+ Products**: Diverse inventory including power supplies, test equipment, and software
- **Default Credentials**: admin/admin123 for initial system access

---

## User Roles & Interfaces

### Employee Role Interface

#### Dashboard Features
The employee dashboard provides a clean, intuitive interface with four main sections:

**1. Records Section**
- **Purpose**: View complete assignment history
- **Features**:
  - Chronological list of all assigned products
  - Assignment dates and return status
  - Monitor information for each assignment
  - Download capability for product documentation
- **Navigation**: `/employee/records`

**2. Requests Section**
- **Purpose**: Submit and track product requests
- **Features**:
  - Product search and selection interface
  - Purpose description requirement
  - Real-time status tracking (pending/approved/rejected)
  - Request history with timestamps
- **Navigation**: `/employee/requests`

**3. Stock Section**
- **Purpose**: Browse available inventory
- **Features**:
  - Filterable product catalog
  - Availability status indicators
  - Product specifications and documentation
  - File attachment viewing and downloading
- **Navigation**: `/employee/stock`

**4. Account Management**
- **Purpose**: Personal profile management
- **Features**:
  - Password change functionality
  - Profile information display
  - Session management
  - Activity history
- **Navigation**: `/employee/account`

#### Employee Workflow
1. **Login**: Authenticate using username/password
2. **Browse Stock**: Explore available products and documentation
3. **Submit Request**: Select products and provide purpose justification
4. **Track Status**: Monitor request approval process
5. **Receive Assignment**: Access assigned products and documentation
6. **Return Process**: Initiate return when project complete

### Monitor Role Interface

#### Dashboard Features
Monitors have enhanced privileges with additional management capabilities:

**1. Approvals Section**
- **Purpose**: Process pending product requests
- **Features**:
  - Queue of pending requests with employee details
  - Approve/reject functionality with remarks
  - Bulk processing capabilities
  - Email notification triggers
- **Navigation**: `/monitor/approvals`

**2. Stock Management**
- **Purpose**: Comprehensive inventory control
- **Features**:
  - Add new products with specifications
  - File upload for product documentation
  - Inventory level monitoring
  - Calibration tracking and alerts
- **Navigation**: `/monitor/stock`

**3. Assignment Management**
- **Purpose**: Direct product assignment to employees
- **Features**:
  - Employee selection interface
  - Quantity allocation controls
  - Assignment date tracking
  - Return processing capabilities
- **Navigation**: `/monitor/assignments`

**4. Reporting Dashboard**
- **Purpose**: Generate management reports
- **Features**:
  - Assignment statistics and trends
  - Inventory utilization reports
  - Employee activity summaries
  - Calibration due date alerts
- **Navigation**: `/monitor/reports`

#### Monitor Workflow
1. **Review Requests**: Evaluate employee product requests
2. **Approve/Reject**: Make decisions with justification
3. **Manage Inventory**: Add new products and maintain stock levels
4. **Process Returns**: Handle product return workflows
5. **Generate Reports**: Create management summaries and analytics

### Admin Role Interface

#### Dashboard Features
Administrators have complete system control with advanced management tools:

**1. Employee Management**
- **Purpose**: Complete user lifecycle management
- **Features**:
  - Create, edit, and deactivate user accounts
  - Role assignment and modification
  - Department allocation management
  - Bulk operations for user management
- **Navigation**: `/admin/employees`

**2. Registration Approval**
- **Purpose**: Process new user registration requests
- **Features**:
  - Review pending registration requests
  - Approve/reject with email notifications
  - Reactivate previously rejected requests
  - Permanent deletion of unwanted requests
- **Navigation**: `/admin/registration-requests`

**3. Monitor Assignment**
- **Purpose**: Manage monitor role assignments
- **Features**:
  - Select employees for monitor roles (maximum 4 active)
  - Set assignment duration and responsibilities
  - Monitor activity tracking and reporting
  - Historical assignment records
- **Navigation**: `/admin/monitors`

**4. System Analytics**
- **Purpose**: Comprehensive system oversight
- **Features**:
  - User activity analytics and trends
  - Inventory utilization statistics
  - Request approval metrics
  - System performance monitoring
- **Navigation**: `/admin/analytics`

**5. File Management**
- **Purpose**: Complete document control
- **Features**:
  - Upload, view, and delete product attachments
  - File type validation and security
  - Storage quota management
  - Document version control
- **Navigation**: `/admin/files`

#### Admin Workflow
1. **User Management**: Create accounts and assign roles
2. **Registration Processing**: Approve new user requests
3. **Monitor Assignment**: Delegate monitor responsibilities
4. **System Monitoring**: Track performance and usage
5. **Policy Enforcement**: Maintain security and compliance

---

## Backend Architecture

### Express.js Application Structure

#### Server Configuration (`server.js`)
The main application file configures the Express.js server with essential middleware:

```javascript
const express = require('express');
const session = require('express-session');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
```

#### Middleware Architecture

**1. Authentication Middleware**
```javascript
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};
```

**2. Role-Based Authorization**
```javascript
const requireRole = (roles) => {
    return (req, res, next) => {
        if (roles.includes(req.session.user.role)) {
            next();
        } else {
            res.status(403).render('error', { message: 'Access denied' });
        }
    };
};
```

**3. File Upload Middleware**
```javascript
const multer = require('multer');
const storage = multer.diskStorage({
    destination: './uploads/products/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
```

### Database Connection Management

#### Connection Pooling Strategy
The application uses MySQL connection pooling for optimal performance:
- **Connection Limit**: 10 concurrent connections
- **Queue Management**: Unlimited queue for pending requests
- **Automatic Reconnection**: Built-in connection recovery
- **Transaction Support**: ACID compliance for data integrity

#### Query Optimization
All database queries use parameterized statements to prevent SQL injection:
```javascript
const [users] = await pool.execute(
    'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
    [username]
);
```

### Error Handling Strategy

#### Global Error Handler
```javascript
app.use((err, req, res, next) => {
    console.error('Application Error:', err);
    res.status(500).render('error', {
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});
```

#### Validation Middleware
Input validation ensures data integrity and security:
```javascript
const validateProductRequest = (req, res, next) => {
    const { product_id, quantity, purpose } = req.body;
    if (!product_id || !quantity || !purpose) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    next();
};
```

---

## Routing System

### Route Organization Structure

The application uses a modular routing system with separate route files for each user role:

#### Common Routes (`src/routes/commonRoutes.js`)
Handles authentication and shared functionality:

**Authentication Endpoints**:
- `GET /login` - Display login form
- `POST /login` - Process user authentication
- `GET /register` - Display registration form
- `POST /register` - Process new user registration with email notifications
- `GET /logout` - Terminate user session

**Dashboard Routing**:
- `GET /dashboard` - Role-based dashboard redirect
- `GET /` - Home page redirect to appropriate dashboard

**API Endpoints**:
- `GET /api/stock/search` - Product search functionality
- `GET /api/live-counts` - Real-time notification counts

#### Employee Routes (`src/routes/employeeRoutes.js`)
Manages employee-specific functionality:

**Dashboard & Navigation**:
- `GET /employee/dashboard` - Employee main dashboard with statistics
- `GET /employee/records` - Assignment history and tracking
- `GET /employee/requests` - Request management interface
- `GET /employee/stock` - Product catalog browsing

**Request Management**:
- `POST /employee/request-product` - Submit new product request
- `GET /employee/api/requests` - Fetch user's request history
- `PUT /employee/api/request/:id` - Update request status

**File Access**:
- `GET /employee/download-attachment/:id` - Download product documentation
- `GET /employee/api/product-attachments/:id` - List available files

**Account Management**:
- `GET /employee/account` - Profile management interface
- `POST /employee/change-password` - Password update functionality

#### Monitor Routes (`src/routes/monitorRoutes.js`)
Handles monitor-level operations and approvals:

**Dashboard & Management**:
- `GET /monitor/dashboard` - Monitor dashboard with pending requests
- `GET /monitor/approvals` - Request approval interface
- `GET /monitor/stock` - Inventory management dashboard
- `GET /monitor/assignments` - Assignment tracking interface

**Request Processing**:
- `POST /monitor/process-request` - Approve/reject product requests
- `GET /monitor/api/requests` - Fetch all pending requests
- `PUT /monitor/api/request/:id/assign` - Direct product assignment

**Inventory Management**:
- `POST /monitor/add-product` - Add new products with file uploads
- `PUT /monitor/api/product/:id` - Update product information
- `DELETE /monitor/api/product/:id` - Remove products from inventory

**File Management**:
- `POST /monitor/upload-attachment` - Upload product documentation
- `DELETE /monitor/api/attachment/:id` - Remove file attachments
- `GET /monitor/download-attachment/:id` - Download files

**Reporting**:
- `GET /monitor/reports` - Generate assignment and inventory reports
- `GET /monitor/api/analytics` - Fetch dashboard analytics

#### Admin Routes (`src/routes/adminRoutes.js`)
Provides complete system administration capabilities:

**User Management**:
- `GET /admin/employees` - Employee management interface
- `POST /admin/create-employee` - Create new employee accounts
- `PUT /admin/api/employee/:id` - Update employee information
- `DELETE /admin/api/employee/:id` - Deactivate employee accounts

**Registration Processing**:
- `GET /admin/registration-requests` - Pending registration interface
- `POST /admin/process-registration` - Approve/reject/reactivate/delete requests
- `GET /admin/api/registrations` - Fetch pending registrations

**Monitor Assignment**:
- `GET /admin/monitors` - Monitor management interface
- `POST /admin/assign-monitor` - Assign monitor roles to employees
- `DELETE /admin/api/monitor/:id` - Remove monitor assignments

**System Analytics**:
- `GET /admin/analytics` - System-wide analytics dashboard
- `GET /admin/api/system-stats` - Fetch system statistics
- `GET /admin/api/user-activity` - User activity reports

**Complete File Management**:
- `GET /admin/files` - File management interface
- `POST /admin/upload-files` - Bulk file upload capability
- `DELETE /admin/api/attachment/:id` - Delete any file attachment
- `GET /admin/download-attachment/:id` - Download any file

### Route Security Implementation

#### Authentication Flow
```javascript
// Route protection example
router.get('/employee/dashboard', requireAuth, async (req, res) => {
    try {
        // Fetch user-specific data
        const [requests] = await pool.execute(
            'SELECT * FROM product_requests WHERE employee_id = ?',
            [req.session.user.employee_id]
        );
        res.render('employee/dashboard', { requests });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).render('error', { message: 'Dashboard loading failed' });
    }
});
```

#### Role-Based Access Control
```javascript
// Admin-only route example
router.get('/admin/employees', 
    requireAuth, 
    requireRole(['admin']), 
    async (req, res) => {
        // Admin functionality
    }
);

// Monitor and Admin route example
router.get('/monitor/approvals', 
    requireAuth, 
    requireRole(['monitor', 'admin']), 
    async (req, res) => {
        // Monitor functionality
    }
);
```

### API Response Standards

#### Success Response Format
```javascript
res.json({
    success: true,
    data: results,
    message: 'Operation completed successfully'
});
```

#### Error Response Format
```javascript
res.status(400).json({
    success: false,
    error: 'Validation failed',
    details: validationErrors
});
```

---

## Deployment Strategies

### Google Cloud Platform Deployment

#### App Engine Configuration (`app.yaml`)
```yaml
runtime: nodejs20

env_variables:
  NODE_ENV: production
  DB_HOST: /cloudsql/mqi-ims:us-central1:product-management-db
  DB_USER: sigma
  DB_NAME: product_management_system
  # Secrets loaded from Secret Manager
  DB_PASSWORD: "projects/mqi-ims/secrets/db-password/versions/latest"
  SESSION_SECRET: "projects/mqi-ims/secrets/session-secret/versions/latest"
  EMAIL_USER: "projects/mqi-ims/secrets/email-user/versions/latest"
  EMAIL_PASS: "projects/mqi-ims/secrets/email-pass/versions/latest"

beta_settings:
  cloud_sql_instances: mqi-ims:us-central1:product-management-db

automatic_scaling:
  min_instances: 1
  max_instances: 10
```

#### Deployment Process
1. **Prerequisites Setup**:
   ```bash
   # Install Google Cloud CLI
   curl https://sdk.cloud.google.com | bash
   
   # Authenticate and set project
   gcloud auth login
   gcloud config set project mqi-ims
   ```

2. **Database Setup**:
   ```bash
   # Create Cloud SQL instance
   gcloud sql instances create product-management-db \
     --database-version=MYSQL_8_0 \
     --tier=db-f1-micro \
     --region=us-central1
   
   # Create database and user
   gcloud sql databases create product_management_system \
     --instance=product-management-db
   gcloud sql users create sigma \
     --instance=product-management-db \
     --password=sigma
   ```

3. **Secret Management**:
   ```bash
   # Store sensitive data in Secret Manager
   echo -n "sigma" | gcloud secrets create db-password --data-file=-
   echo -n "your-session-secret" | gcloud secrets create session-secret --data-file=-
   echo -n "your-email@gmail.com" | gcloud secrets create email-user --data-file=-
   echo -n "your-app-password" | gcloud secrets create email-pass --data-file=-
   ```

4. **Application Deployment**:
   ```bash
   # Deploy to App Engine
   gcloud app deploy app.yaml
   
   # View deployment logs
   gcloud app logs tail -s default
   ```

#### Production URLs
- **Primary**: [https://mqi-ims.uc.r.appspot.com](https://mqi-ims.uc.r.appspot.com)
- **Legacy**: [https://mqi-interns-467405.uc.r.appspot.com](https://mqi-interns-467405.uc.r.appspot.com)

### Local Development Deployment

#### Environment Setup
```bash
# Clone repository
git clone https://github.com/Interns-MQI-25/project-interns.git
cd project-interns

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with local database credentials

# Setup database
mysql -u root -p < sql/database.sql

# Start development server
npm run dev
```

#### Development Server Features
- **Hot Reload**: Automatic server restart on file changes
- **Debug Mode**: Detailed error logging and stack traces
- **Local Database**: MySQL connection with sample data
- **File Upload**: Local file storage in `uploads/` directory

---

## Version Control & CI/CD

### Git Workflow Strategy

#### Branch Structure
- **main**: Production-ready code
- **gcp-deploy-win**: Development and testing branch
- **final-monitor1**: Staging environment branch
- **feature/***: Individual feature development branches

#### Commit Standards
```bash
# Feature commits
git commit -m "feat: Add email notification system"

# Bug fixes
git commit -m "fix: Resolve database connection timeout"

# Documentation
git commit -m "docs: Update API documentation"

# Refactoring
git commit -m "refactor: Optimize database queries"
```

### GitHub Actions CI/CD Pipeline

#### Workflow Configuration (`.github/workflows/ci-cd.yml`)
The CI/CD pipeline includes multiple stages:

**1. Testing & Validation**:
```yaml
test:
  name: 🧪 Test & Lint
  runs-on: ubuntu-latest
  steps:
    - name: 📥 Checkout code
      uses: actions/checkout@v4
    - name: 🟢 Setup Node.js
      uses: actions/setup-node@v4
    - name: 📦 Install dependencies
      run: npm ci
    - name: 🔍 Run linting
      run: npm run lint
    - name: 🧪 Run tests
      run: npm test
    - name: 🔒 Security audit
      run: npm audit --audit-level moderate
```

**2. Database Validation**:
```yaml
validate-schema:
  name: 🗄️ Validate Database Schema
  steps:
    - name: 🔍 Validate SQL files
      run: |
        for file in sql/*.sql; do
          echo "Validating $file"
          # SQL syntax validation
        done
```

**3. Deployment Stages**:
- **Development**: Deploys to `dev` service on `gcp-deploy-win` branch
- **Staging**: Deploys to `staging` service on `final-monitor1` branch  
- **Production**: Deploys to `default` service on `main` branch

**4. Health Checks**:
```yaml
health-check:
  name: 🩺 Health Check
  steps:
    - name: 🩺 Health Check - Production
      run: |
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL")
        if [ "$HTTP_STATUS" = "200" ]; then
          echo "✅ Health check passed!"
        else
          echo "❌ Health check failed!"
          exit 1
        fi
```

#### Deployment Environments
1. **Development Environment**:
   - URL: `https://dev-dot-mqi-ims.uc.r.appspot.com`
   - Auto-deployment on `gcp-deploy-win` branch
   - No promotion to default service

2. **Staging Environment**:
   - URL: `https://staging-dot-mqi-ims.uc.r.appspot.com`
   - Auto-deployment on `final-monitor1` branch
   - Full feature testing environment

3. **Production Environment**:
   - URL: `https://mqi-ims.uc.r.appspot.com`
   - Auto-deployment on `main` branch
   - Health checks and monitoring

### Repository Management

#### GitHub Repository
- **URL**: [https://github.com/Interns-MQI-25/project-interns](https://github.com/Interns-MQI-25/project-interns)
- **Visibility**: Public repository for collaboration
- **Issues**: Bug tracking and feature requests
- **Pull Requests**: Code review and collaboration workflow

#### Collaboration Workflow
1. **Fork Repository**: Create personal copy for development
2. **Create Feature Branch**: Develop new features in isolation
3. **Submit Pull Request**: Request code review and integration
4. **Code Review**: Team review and approval process
5. **Merge to Main**: Integration into production codebase

---

## Docker Implementation

### Docker Configuration

#### Dockerfile
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads/products

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["npm", "start"]
```

#### Docker Compose Configuration
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=db
      - DB_USER=root
      - DB_PASSWORD=password
      - DB_NAME=product_management_system
    depends_on:
      - db
    volumes:
      - ./uploads:/app/uploads

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=product_management_system
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./sql/database.sql:/docker-entrypoint-initdb.d/init.sql

volumes:
  mysql_data:
```

### Docker Hub Distribution

#### Published Image
- **Repository**: [priyanshuksharma/project-interns](https://hub.docker.com/r/priyanshuksharma/project-interns)
- **Tags**: `latest`, `v1.0.0`, `v2.0.0`
- **Size**: ~248MB (optimized Alpine-based image)

#### Quick Docker Deployment
```bash
# Pull and run from Docker Hub
docker pull priyanshuksharma/project-interns:latest
docker run -p 3000:3000 priyanshuksharma/project-interns:latest

# Access application at http://localhost:3000
```

#### Development with Docker Compose
```bash
# Start complete development environment
docker-compose --profile dev up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Container Optimization

#### Multi-Stage Build (Advanced)
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

#### Security Features
- **Non-root user**: Application runs as non-privileged user
- **Minimal base image**: Alpine Linux for reduced attack surface
- **Health checks**: Container health monitoring
- **Volume mounts**: Persistent data storage

---

## Security Features

### Authentication & Authorization

#### Password Security
```javascript
const bcrypt = require('bcryptjs');

// Password hashing during registration
const hashPassword = async (password) => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
};

// Password verification during login
const verifyPassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};
```

#### Session Management
```javascript
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
```

### SQL Injection Prevention

#### Parameterized Queries
All database interactions use parameterized queries:
```javascript
// Safe query with parameters
const [users] = await pool.execute(
    'SELECT * FROM users WHERE username = ? AND password = ?',
    [username, hashedPassword]
);

// Unsafe query (never used)
// const query = `SELECT * FROM users WHERE username = '${username}'`;
```

### Cross-Site Scripting (XSS) Protection

#### Template Escaping
EJS templates automatically escape output:
```html
<!-- Safe: automatically escaped -->
<p>Welcome, <%= user.full_name %></p>

<!-- Unsafe: raw output (avoided) -->
<p>Welcome, <%- user.full_name %></p>
```

#### Input Validation
```javascript
const validateInput = (req, res, next) => {
    const { username, email } = req.body;
    
    // Sanitize inputs
    req.body.username = username.trim().toLowerCase();
    req.body.email = email.trim().toLowerCase();
    
    // Validate format
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    
    next();
};
```

### File Upload Security

#### File Type Validation
```javascript
const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const fileFilter = (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type'), false);
    }
};
```

#### File Size Limits
```javascript
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10 // Maximum 10 files
    },
    fileFilter: fileFilter
});
```

### Environment Security

#### Secret Management
Production secrets stored in Google Secret Manager:
```yaml
env_variables:
  DB_PASSWORD: "projects/mqi-ims/secrets/db-password/versions/latest"
  SESSION_SECRET: "projects/mqi-ims/secrets/session-secret/versions/latest"
```

#### HTTPS Enforcement
Google App Engine automatically enforces HTTPS:
```yaml
handlers:
- url: /.*
  script: auto
  secure: always
```

---

## File Management System

### File Upload Implementation

#### Multer Configuration
```javascript
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/products/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
```

#### File Type Support
**Supported File Types**:
- **Images**: JPG, JPEG, PNG, GIF, WebP
- **Documents**: PDF, DOC, DOCX, XLS, XLSX, CSV, TXT
- **Size Limit**: 10MB per file
- **Quantity Limit**: Maximum 10 files per upload

### Database Integration

#### Product Attachments Table
```sql
CREATE TABLE product_attachments (
    attachment_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by INT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
);
```

### File Access Control

#### Role-Based File Permissions
- **Employees**: View and download only
- **Monitors**: Upload, view, and download
- **Admins**: Complete file management (upload, view, delete)

#### Secure File Serving
```javascript
router.get('/download-attachment/:attachmentId', requireAuth, async (req, res) => {
    try {
        const [attachments] = await pool.execute(
            'SELECT * FROM product_attachments WHERE attachment_id = ?',
            [req.params.attachmentId]
        );
        
        if (attachments.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        const attachment = attachments[0];
        const filePath = path.join(__dirname, '../../', attachment.file_path);
        
        res.download(filePath, attachment.original_filename);
    } catch (error) {
        console.error('File download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});
```

---

## Email Notification System

### SMTP Configuration

#### Gmail Integration
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Gmail App Password
    }
});
```

#### Email Service Functions
```javascript
// Registration confirmation email
const sendRegistrationConfirmation = async (userEmail, userName) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: 'Registration Received - Marquardt Inventory Management System',
        html: `
            <h2>Registration Received</h2>
            <p>Dear ${userName},</p>
            <p>Your registration request has been received and is pending admin approval.</p>
            <p>Best regards,<br>Marquardt India Team</p>
        `
    };
    
    return transporter.sendMail(mailOptions);
};
```

### Multi-Admin Notifications

#### Admin Email Distribution
```javascript
const sendNewRegistrationNotification = async (adminEmails, userName, userEmail) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: adminEmails.join(','), // Send to all admins
        subject: 'New Registration Request - Inventory Management System',
        html: `
            <h2>New Registration Request</h2>
            <p>A new user has registered:</p>
            <ul>
                <li><strong>Name:</strong> ${userName}</li>
                <li><strong>Email:</strong> ${userEmail}</li>
            </ul>
            <p><a href="https://mqi-ims.uc.r.appspot.com/admin/employees">Review Request</a></p>
        `
    };
    
    return transporter.sendMail(mailOptions);
};
```

### Email Templates

#### HTML Email Design
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        .email-container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
        .header { background-color: #1f2937; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .button { background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Marquardt India Pvt. Ltd.</h1>
            <p>Asset Management System</p>
        </div>
        <div class="content">
            <!-- Email content here -->
        </div>
    </div>
</body>
</html>
```

---

## Troubleshooting & Maintenance

### Common Issues & Solutions

#### Database Connection Problems
```bash
# Check MySQL service status
sudo systemctl status mysql

# Restart MySQL service
sudo systemctl restart mysql

# Test connection
mysql -u root -p -e "SELECT 1"
```

#### Port Conflicts
```bash
# Find process using port 3000
lsof -ti:3000

# Kill process
kill -9 <PID>

# Use alternative port
PORT=3001 npm start
```

#### Email Service Issues
1. **Gmail App Password Setup**:
   - Enable 2-Factor Authentication
   - Generate App Password in Google Account settings
   - Use 16-character app password (not regular password)

2. **Environment Variables**:
   ```bash
   # Verify email configuration
   echo $EMAIL_USER
   echo $EMAIL_PASS
   ```

### Performance Monitoring

#### Database Query Optimization
```javascript
// Add query logging for performance monitoring
const logQuery = (query, params, duration) => {
    if (duration > 1000) { // Log slow queries (>1s)
        console.warn(`Slow query detected: ${duration}ms`, { query, params });
    }
};
```

#### Memory Usage Monitoring
```javascript
// Monitor memory usage
setInterval(() => {
    const memUsage = process.memoryUsage();
    console.log('Memory Usage:', {
        rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB'
    });
}, 60000); // Every minute
```

### Backup & Recovery

#### Database Backup
```bash
# Create database backup
mysqldump -u root -p product_management_system > backup_$(date +%Y%m%d).sql

# Restore from backup
mysql -u root -p product_management_system < backup_20250113.sql
```

#### File System Backup
```bash
# Backup uploaded files
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/

# Restore uploaded files
tar -xzf uploads_backup_20250113.tar.gz
```

### Maintenance Tasks

#### Regular Maintenance Schedule
1. **Daily**: Monitor application logs and performance
2. **Weekly**: Database backup and cleanup
3. **Monthly**: Security updates and dependency updates
4. **Quarterly**: Performance optimization and capacity planning

#### Log Management
```javascript
// Implement log rotation
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});
```

---

## Conclusion

The Marquardt India Asset Management System represents a comprehensive solution for modern inventory management and user administration. Built with scalable technologies and deployed on Google Cloud Platform, the system provides robust functionality for asset tracking, user management, and workflow automation.

### Key Achievements
- **Complete Role-Based System**: Three-tier user hierarchy with appropriate permissions
- **Scalable Architecture**: Cloud-native deployment with automatic scaling
- **Security Implementation**: Industry-standard security practices and encryption
- **Modern Development Practices**: CI/CD pipeline, containerization, and version control
- **User-Friendly Interface**: Responsive design with intuitive navigation
- **Comprehensive Documentation**: Complete setup and maintenance guides

### Support & Resources
- **GitHub Repository**: [https://github.com/Interns-MQI-25/project-interns](https://github.com/Interns-MQI-25/project-interns)
- **Production Application**: [https://mqi-ims.uc.r.appspot.com](https://mqi-ims.uc.r.appspot.com)
- **Docker Hub**: [https://hub.docker.com/r/priyanshuksharma/project-interns](https://hub.docker.com/r/priyanshuksharma/project-interns)
- **Documentation**: Complete guides available in repository

This documentation serves as a comprehensive guide for developers, administrators, and stakeholders involved in the deployment, maintenance, and enhancement of the Marquardt India Asset Management System.

---

**Document Version**: 1.0.0  
**Last Updated**: January 2025  
**Total Word Count**: ~5,000 words  
**Prepared by**: MQI Internship Program 2025