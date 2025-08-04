# Marquardt India Pvt. Ltd.

A comprehensive web application for managing product inventory and employee requests with role-based access control.

## Features

### For Employees
- Submit product requests for projects
- View request history and status
- Browse available stock
- View assigned product records
- Account management

### For Monitors
- Approve/reject product requests
- Add new products to inventory
- Assign products to employees
- Process product returns
- View assignment records and reports
- Manage stock levels

### For Admins
- Manage employee accounts
- Process registration requests
- Assign/unassign monitor roles
- View comprehensive system history
- Manage stock and generate reports
- Full system oversight

## Technology Stack

- **Frontend**: EJS templates, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Authentication**: Express sessions with bcryptjs
- **Additional**: Font Awesome icons, responsive design

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn package manager

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd product-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   # Login to MySQL
   mysql -u root -p
   
   # Create database and tables
   source database.sql
   
   # Insert sample data (optional)
   source sample_data.sql
   ```

4. **Configure environment variables**
   Edit `.env` file with your database credentials:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=product_management_system
   DB_PORT=3306
   
   SESSION_SECRET=your_session_secret_key_here
   PORT=3000
   NODE_ENV=development
   ```
e
5. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## Default Login Credentials

After running the sample data script:

### Admin Account
- **Username**: admin
- **Password**: admin123

### Employee Accounts
- **Username**: john.doe | **Password**: password123
- **Username**: jane.smith | **Password**: password123
- **Username**: mike.wilson | **Password**: password123
- **Username**: sarah.johnson | **Password**: password123

Note: John Doe and Mike Wilson are also assigned as monitors in the sample data.
- Track status of their requests
- Access personal account history

### 2. Monitors
- View information of all employees
- Approve or reject product requests
- Manage product inventory (add, assign, return)
- View request history and generate reports

**Note:**
 Limited to 4 monitors assigned by admins for specific durations

### 3. Admins
- Complete system oversight and management
- Manage employees (add, remove, edit)
- Assign/unassign monitor roles
- Approve new employee registrations
- Access comprehensive system reports and history

## Authentication Flow

### Registration Process
1. **Login Page (Sign-in/Sign-up)**
   - Users enter email and password
   - New employees can register for an account

2. **Registration Page**
   - Required fields: name, email, password, department
   - Default role: Employee
   - Registration request sent to admins for approval

3. **Admin Approval Process**
   - **If Accepted:** User can login with registered credentials
   - **If Rejected:** User account is marked as invalid
   - **Notification:** Users informed via email about approval status

## System Pages

### Login Interface
- **Sign-in Fields:**
  - Username
  - Password

- **Sign-up Fields:**
  - Full name
  - Username (must be unique)
  - Email
  - Password


## Dashboard Interfaces

### Employee Dashboard
**Main Cards:**
1. **Records** - View product assignment history
2. **Requests** - Submit product requests
3. **Stock** - Browse available inventory
4. **Account History** - Manage profile and settings

**Detailed Pages:**
- **Records:** Complete history of assigned products
- **Requests:** Product request submission interface
- **Stock:** Available products with quantity information
- **Account History:** User ID, password change, logout options

### Monitor Dashboard
**Main Cards:**
1. **Records** - Employee assignment history
2. **Approvals** - Process product requests
3. **Stock** - Inventory management
4. **Account History** - Profile management

**Additional Features:**
- **Add Products** - Add new items to inventory
- **Assign Products** - Allocate products to employees
- **Return Products** - Process product returns
- **Reports** - Generate assignment and stock reports
- **Stock Management** - Complete inventory oversight

> **Note:** Only monitors have authority for product addition, assignment, and return operations.

### Admin Dashboard
**Management Cards:**

#### 1. Manage Employees
- **Create/Edit/Delete:** Manual employee management
- **Bulk Operations:** Checkbox selection for multiple users
- **New Employee Requests:** Process registration approvals

#### 2. Manage Monitors
- **Assignment:** Select 4 monitors from employee pool
- **Duration Control:** Set specific assignment periods
- **Monitor List:** View active monitors with details
- **History Tracking:** Permanent record of monitor activities

#### 3. Stock Management
- **Inventory History:** Complete product tracking
- **Available Stock:** Current inventory status
- **Comprehensive Reports:** Detailed analytics including:
  - Total products vs. assigned vs. returned
  - Employee-specific assignment/return statistics
  - Monitor-specific activity reports

#### 4. System History
- **Product Assignments:** Who received what products
- **Request Approvals:** Monitor approval tracking
- **Return Processing:** Product return history

## Key Features

### Employee Registration Flow
```
User Registration → Admin Review → Approval/Rejection → Email Notification
```

### Monitor Assignment
- **Limit:** Maximum 4 monitors at any time
- **Selection:** Chosen from existing employees
- **Duration:** Fixed-term assignments set by admins
- **Responsibilities:** Product management and request approvals

### Inventory Management
- **Addition:** Monitor-controlled product entry
- **Assignment:** Monitor-to-employee allocation
- **Returns:** Monitor-processed product returns
- **Tracking:** Complete audit trail maintained

### Reporting System
- **Employee Reports:** Individual assignment/return history
- **Monitor Reports:** Activity and approval statistics
- **Stock Reports:** Inventory levels and movement
- **System Reports:** Comprehensive administrative overview
