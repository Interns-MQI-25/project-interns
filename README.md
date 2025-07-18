# Project Interns - Product Management System

## Overview
A comprehensive product management system designed for organizations to manage inventory, employee requests, and monitor approvals efficiently.

## User Roles

### 1. Employees
- View their own information and department details
- Request products for project purposes
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
