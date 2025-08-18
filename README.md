# 🏢 Marquardt India Pvt. Ltd. - Inventory Management System

> **A comprehensive web-based asset management system with role-based access control, email notifications, and file attachment capabilities.**

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-blue.svg)](https://www.mysql.com/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-lightgrey.svg)](https://expressjs.com/)
[![Docker](https://img.shields.io/badge/Docker-Available-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/r/priyanshuksharma/project-interns)
[![Deployed on GCP](https://img.shields.io/badge/Deployed-Google%20Cloud-4285F4.svg)](https://mqi-ims.uc.r.appspot.com)

## 🚀 Live Application

**Production URL**: 
- Version 1.0.2: [https://mqi-ims.uc.r.appspot.com](https://mqi-ims.uc.r.appspot.com)
- Version 1.0.0: [https://mqi-interns-467405.uc.r.appspot.com](https://mqi-interns-467405.uc.r.appspot.com)

## 📋 Overview

This system provides comprehensive asset management capabilities for Marquardt India, featuring:
- **Role-based access control** (Employees, Monitors, Admins)
- **Product request workflow** with approval system
- **Email notifications** for registration and approvals
- **File attachment system** for product documentation
- **Real-time inventory tracking**
- **Responsive web interface**

## ✨ Key Features

### 👥 User Roles & Capabilities

#### 📊 **Employees**
- ✅ Submit product requests for projects
- ✅ View request history and status
- ✅ Browse available stock with file attachments
- ✅ View assigned product records
- ✅ Account management and password changes
- ✅ Download product documentation

#### 🔍 **Monitors** (Maximum 4 active)
- ✅ Approve/reject product requests
- ✅ Add new products with file uploads
- ✅ Assign products to employees
- ✅ Process product returns
- ✅ Generate assignment reports
- ✅ Manage file attachments
- ✅ View comprehensive stock analytics

#### 👑 **Administrators**
- ✅ Manage all employee accounts
- ✅ Process registration requests with email notifications
- ✅ Assign/unassign monitor roles
- ✅ View system-wide history and reports
- ✅ Complete file management capabilities
- ✅ Multi-admin email notifications
- ✅ Advanced user management (reactivate/delete)

### 🔧 Advanced Features

- **📧 Email Notifications**: Email SMTP integration for registration workflow
- **📎 File Attachments**: Upload/download product documentation (images, PDFs, docs)
- **🔐 Security**: bcryptjs password hashing, session management, SQL injection protection
- **📱 Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **🏗️ Cloud Deployment**: Google App Engine with Cloud SQL
- **📊 Analytics**: Comprehensive reporting and activity tracking

## 🛠️ Technology Stack

- **Frontend**: HTML5, Tailwind CSS, JavaScript (ES6+), EJS Templates
- **Backend**: Node.js 20+, Express.js 4.x
- **Database**: MySQL 8.0 with connection pooling
- **Container Platform**: Docker with Docker Compose
- **Authentication**: Express sessions with bcryptjs
- **Email Service**: Nodemailer with Gmail SMTP
- **File Handling**: Multer for file uploads
- **Cloud Platform**: Google App Engine + Cloud SQL
- **Icons**: Font Awesome
- **Security**: Parameterized queries, XSS protection

## 🚀 Quick Start

### 🐳 Option 1: Docker (Recommended - One-Click Setup)

**Available on Docker Hub**: [`priyanshuksharma/project-interns`](https://hub.docker.com/r/priyanshuksharma/project-interns)

#### Quick Run with Docker
```bash
# Pull and run the latest image
docker pull priyanshuksharma/project-interns:latest
docker run -p 3000:3000 priyanshuksharma/project-interns:latest

# Access at: http://localhost:3000
```

#### Full Docker Compose Setup (Database Included)
```bash
# Clone the repository
git clone https://github.com/Interns-MQI-25/project-interns.git
cd project-interns

# Start everything with Docker Compose
docker-compose --profile dev up -d

# Check running services
docker-compose ps

# Access at: http://localhost:3000
```

#### Global Access with Tunneling
```bash
# Share your local app globally (using ngrok)
docker-compose --profile dev --profile ngrok up -d
# Access at: https://bright-pleasing-marlin.ngrok-free.app

# Or use Serveo (no signup required)
docker-compose --profile dev --profile serveo up -d
docker logs serveo-tunnel  # Get your public URL
```

> 📖 **Complete Docker Guide**: See [`DOCKER_COMPLETE_GUIDE.md`](./DOCKER_COMPLETE_GUIDE.md) for detailed instructions

---

### Option 2: Automated Setup (Traditional)

```bash
# Clone the repository
git clone https://github.com/Interns-MQI-25/project-interns.git
cd project-interns

# Run setup script
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### Option 3: Manual Setup

#### Prerequisites
- **Node.js** 20+ ([Download](https://nodejs.org/))
- **MySQL** 8.0+ ([Download](https://dev.mysql.com/downloads/))
- **npm** or **yarn** package manager

#### Installation Steps

1. **Clone and Install Dependencies**
   ```bash
   git clone https://github.com/Interns-MQI-25/project-interns.git
   cd project-interns
   npm install
   ```

2. **Database Setup**
   ```bash
   # Login to MySQL
   mysql -u root -p
   
   # Create database and import schema
   CREATE DATABASE IF NOT EXISTS product_management_system;
   USE product_management_system;
   SOURCE sql/database.sql;
   EXIT;
   ```

3. **Environment Configuration**
   
   Create `.env` file:
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
   
   # Email Configuration (Optional for local)
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-gmail-app-password
   ```

4. **Start the Application**
   ```bash
   # Development mode (with auto-reload)
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Access the System**
   
   🌐 **Open your browser**: [http://localhost:3000](http://localhost:3000)

## 🔑 Default Login Credentials

### Admin Account
- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@company.com`

### Sample Employee Accounts
- **john.doe** / `password123` (Monitor)
- **jane.smith** / `password123`
- **mike.wilson** / `password123` (Monitor)
- **sarah.johnson** / `password123`

> ⚠️ **Important**: Change default passwords immediately after first login!

## 📁 Project Structure

```
project-interns/
├── � docker-compose.yml           # Docker services configuration
├── 🐳 Dockerfile                   # Application container definition
├── �📄 app.yaml                    # Google App Engine configuration
├── 📄 server.js                   # Main application entry point
├── 📄 package.json                # Dependencies and scripts
├── 📚 DOCKER_COMPLETE_GUIDE.md    # Comprehensive Docker guide
├── 📁 src/                        # Application source code
│   ├── 📁 routes/                 # Express routes
│   │   ├── adminRoutes.js         # Admin functionality
│   │   ├── employeeRoutes.js      # Employee functionality
│   │   ├── monitorRoutes.js       # Monitor functionality
│   │   └── commonRoutes.js        # Authentication & common routes
│   ├── 📁 middleware/             # Custom middleware
│   └── 📁 utils/                  # Utility functions
│       ├── emailService.js        # Email notification service
│       └── fileUpload.js          # File upload handling
├── 📁 views/                      # EJS templates
│   ├── 📁 auth/                   # Login/Register pages
│   ├── 📁 employee/               # Employee dashboard
│   ├── 📁 monitor/                # Monitor dashboard
│   ├── 📁 admin/                  # Admin dashboard
│   └── 📁 partials/               # Reusable components
├── 📁 public/                     # Static assets
│   ├── 📁 css/                    # Stylesheets
│   ├── 📁 js/                     # Client-side JavaScript
│   └── 📁 images/                 # Images and icons
├── 📁 sql/                        # Database files
│   └── database.sql               # Database schema and sample data
├── 📁 uploads/                    # File upload storage
│   └── products/                  # Product attachments
└── 📄 .env                        # Environment variables
```

## 🔄 User Workflows

### Employee Registration Flow
```
User Registration → Email Confirmation → Admin Review → Approval/Rejection → Email Notification → Login Access
```

### Product Request Flow
```
Employee Request → Monitor Review → Approval/Rejection → Product Assignment → Email Notification
```

### File Management Flow
```
Monitor Upload → File Validation → Storage → Database Record → Employee Access
```

## 📊 Database Schema

### Core Tables
- **`users`** - User accounts and authentication
- **`employees`** - Employee details and department mapping
- **`departments`** - Organizational departments
- **`products`** - Product catalog and inventory
- **`product_requests`** - Employee product requests
- **`product_assignments`** - Approved product assignments
- **`product_attachments`** - File attachments for products
- **`registration_requests`** - Pending user registrations
- **`stock_history`** - Inventory movement tracking
- **`monitor_assignments`** - Monitor role assignments

## 🌐 API Endpoints

### Authentication
- `GET /login` - Login page
- `POST /login` - Process login
- `GET /register` - Registration page
- `POST /register` - Process registration with email notifications
- `GET /logout` - User logout

### Employee Routes
- `GET /employee/dashboard` - Employee dashboard
- `GET /employee/records` - Assignment history
- `GET /employee/requests` - Request management
- `GET /employee/stock` - Available stock with file access
- `POST /employee/request-product` - Submit product request
- `GET /employee/download-attachment/:id` - Download files

### Monitor Routes
- `GET /monitor/dashboard` - Monitor dashboard
- `GET /monitor/approvals` - Pending requests
- `GET /monitor/stock` - Inventory management
- `POST /monitor/add-product` - Add products with file uploads
- `POST /monitor/process-request` - Approve/reject requests
- `DELETE /monitor/api/attachment/:id` - Delete attachments

### Admin Routes
- `GET /admin/dashboard` - Admin dashboard with analytics
- `GET /admin/employees` - Employee management
- `GET /admin/registration-requests` - Registration approvals
- `POST /admin/process-registration` - Approve/reject/reactivate/delete
- `DELETE /admin/api/attachment/:id` - Full file management

## 📧 Email Service Configuration

### Gmail SMTP Setup
1. **Enable 2-Factor Authentication** on Gmail
2. **Generate App Password**:
   - Google Account → Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Configure Environment Variables**:
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-character-app-password
   ```

### Email Features
- ✅ Registration confirmation to users
- ✅ Multi-admin notifications for new registrations
- ✅ Approval/rejection notifications
- ✅ HTML email templates with branding

## 📎 File Attachment System

### Supported File Types
- **Images**: JPG, JPEG, PNG, GIF, WebP
- **Documents**: PDF, DOC, DOCX, XLS, XLSX, CSV, TXT
- **Limits**: 10MB per file, maximum 10 files per upload

### User Permissions
- **Monitors**: Upload files during product creation
- **Admins**: Full file management (upload, view, delete)
- **Employees**: View and download only

## 🚨 Troubleshooting

### Common Issues

**Database Connection Error:**
```bash
# Check MySQL service
sudo systemctl status mysql

# Verify credentials in .env
# Ensure database exists
mysql -u root -p -e "SHOW DATABASES;"
```

**Port Already in Use:**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

**Email Service Issues:**
- Verify Gmail 2FA is enabled
- Check app password is correct (16 characters)
- Ensure EMAIL_USER and EMAIL_PASS are set

**File Upload Problems:**
- Check file size (max 10MB)
- Verify file type is supported
- Ensure uploads directory exists and is writable

## 🚀 Deployment

For production deployment on Google Cloud Platform, see:
📖 **[GCP_DEPLOYMENT_GUIDE.md](./GCP_DEPLOYMENT_GUIDE.md)**

### 🐳 Docker Deployment

#### Docker Hub
The application is available as a pre-built Docker image:

- **Repository**: [`priyanshuksharma/project-interns`](https://hub.docker.com/r/priyanshuksharma/project-interns)
- **Tags**: `latest`, `v1.0.0`
- **Image Size**: ~248MB

```bash
# Pull from Docker Hub
docker pull priyanshuksharma/project-interns:latest

# Run with custom environment
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=your-db-host \
  -e DB_USER=your-db-user \
  -e DB_PASSWORD=your-db-password \
  priyanshuksharma/project-interns:latest
```

#### Local Docker Development
```bash
# Complete development environment with database
docker-compose --profile dev up -d

# Production-ready deployment
docker-compose --profile production up -d

# With global access tunneling
docker-compose --profile dev --profile ngrok up -d
```

### Quick Deploy to GCP
```bash
# Deploy to App Engine
gcloud app deploy app.yaml

# View logs
gcloud app logs tail -s default
```

## 🔒 Security Features

- ✅ **Password Hashing**: bcryptjs with salt rounds
- ✅ **Session Management**: Secure Express sessions
- ✅ **SQL Injection Protection**: Parameterized queries
- ✅ **XSS Protection**: EJS template escaping
- ✅ **File Validation**: Type and size restrictions
- ✅ **Role-based Access Control**: Granular permissions
- ✅ **HTTPS Enforcement**: Cloud deployment security

## 📈 Performance Features

- ✅ **Database Connection Pooling**: Efficient MySQL connections
- ✅ **Auto-scaling**: Google App Engine scaling
- ✅ **Caching**: Session-based user state caching
- ✅ **Optimized Queries**: Indexed database operations
- ✅ **Responsive Design**: Mobile-optimized interface
- ✅ **Docker Containerization**: Lightweight, portable deployment
- ✅ **Global Access Tunneling**: ngrok, Serveo, Cloudflare integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- **Repository**: [GitHub Issues](https://github.com/Interns-MQI-25/project-interns/issues)
- **Production App**: [https://mqi-interns-467405.uc.r.appspot.com/](https://mqi-interns-467405.uc.r.appspot.com/)
- **Live Link**: [https://mqi-ims.uc.r.appspot.com](https://mqi-ims.uc.r.appspot.com)
- **Documentation**: This README and deployment guide

## 📝 License

This project is part of the **MQI Internship Program 2025**.

## 📋 Changelog

### Version 2.0.0 (Current)
- ✅ Email notification system with Gmail SMTP
- ✅ File attachment system for products
- ✅ Multi-admin support for notifications
- ✅ Enhanced registration management
- ✅ Google Cloud Platform deployment
- ✅ Comprehensive security improvements

### Version 1.0.0
- ✅ Initial release with role-based access
- ✅ Product management workflow
- ✅ Responsive web interface
- ✅ Database schema and migrations

---

**🎉 Ready to get started?**

- **Local Development**: [http://localhost:3000](http://localhost:3000)
- **Production App**: [https://mqi-interns-467405.uc.r.appspot.com/](https://mqi-interns-467405.uc.r.appspot.com/)
- **Live Link**: [https://mqi-ims.uc.r.appspot.com](https://mqi-ims.uc.r.appspot.com)
- **Admin Login**: `admin` / `admin123`
# Test: GitHub Actions authentication fix
# Fix: Added required App Engine permissions
