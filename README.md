# Asset Management System

A comprehensive web-based asset management system built with Node.js, Express, EJS, MySQL2, and Tailwind CSS. This system provides role-based access control for employees, managers, and administrators to efficiently manage organizational assets.

## Features

### 🎯 Role-Based Access Control
- **Employees**: Request assets, view assignment history, browse available stock
- **Managers**: Approve/reject employee requests, view approval records, monitor stock
- **Administrators**: Complete inventory control, direct asset assignment, process returns

### 🚀 Key Functionality
- **Asset Request System**: Employees can request assets with approval workflow
- **Inventory Management**: Real-time stock tracking with low-stock alerts
- **Assignment Tracking**: Complete history of asset assignments and returns
- **Responsive Design**: Mobile-friendly interface using Tailwind CSS
- **RESTful Architecture**: Clean API design following REST principles

## Technology Stack

- **Backend**: Node.js, Express.js
- **Frontend**: EJS templating, Tailwind CSS
- **Database**: MySQL2
- **Authentication**: Session-based with bcrypt password hashing
- **UI Components**: Font Awesome icons, responsive design

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL Server
- npm or yarn package manager

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd project-manage
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   - Create a MySQL database named `asset_management`
   - Import the database schema:
   ```bash
   mysql -u root -p asset_management < database.sql
   ```
   - Update database credentials in `app.js` (lines 12-17)

4. **Create default users**
   - Run the following commands to create hashed passwords for default users:
   ```bash
   node create-users.js
   ```

5. **Start the application**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

6. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`

## Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Manager | manager1 | manager123 |
| Employee | employee1 | employee123 |

## Quick Start

### Automated Setup (Recommended)

**Linux/macOS:**
```bash
chmod +x scripts/linux/setup.sh && ./scripts/linux/setup.sh
```

**Windows:**
```cmd
scripts\windows\setup.bat
```

### Manual Setup
1. Start MySQL server
2. Create database: `CREATE DATABASE asset_management;`
3. Run: `npm install && node create-users.js && npm run dev`
4. Visit: `http://localhost:8080`
5. Login with any of the default credentials above

## Project Structure

```
project-manage/
├── app.js                 # Main application file
├── package.json           # Dependencies and scripts
├── database.sql           # Database schema and sample data
├── create-users.js        # Script to create default users
├── docker/                # Docker configuration files
│   ├── Dockerfile         # Container definition
│   ├── docker-compose.yml # Multi-container setup
│   ├── healthcheck.js     # Health monitoring
│   ├── docker-init.sql    # Database initialization
│   ├── .dockerignore      # Docker build exclusions
│   ├── DOCKER.md          # Docker documentation
│   └── README.md          # Docker directory guide
├── scripts/               # Setup and deployment scripts
│   ├── linux/             # Linux/macOS scripts
│   │   ├── setup.sh       # Development setup
│   │   ├── docker-deploy.sh # Docker deployment
│   │   └── README.md      # Linux scripts guide
│   ├── windows/           # Windows scripts
│   │   ├── setup.bat      # Basic Windows setup
│   │   ├── setup.ps1      # PowerShell setup
│   │   ├── docker-deploy.bat # Windows Docker deployment
│   │   └── README.md      # Windows scripts guide
│   └── README.md          # Scripts overview
├── views/                 # EJS templates
│   ├── login.ejs          # Login page
│   ├── error.ejs          # Error page
│   ├── employee/          # Employee views
│   │   ├── dashboard.ejs
│   │   ├── records.ejs
│   │   ├── requests.ejs
│   │   ├── stock.ejs
│   │   └── account.ejs
│   ├── manager/           # Manager views
│   │   ├── dashboard.ejs
│   │   ├── approvals.ejs
│   │   ├── records.ejs
│   │   ├── stock.ejs
│   │   └── account.ejs
│   └── admin/             # Admin views
│       ├── dashboard.ejs
│       ├── products.ejs
│       ├── assign.ejs
│       ├── return.ejs
│       └── stock.ejs
└── public/                # Static assets
    └── styles.css         # Custom CSS
```

## API Endpoints

### Authentication
- `GET /login` - Login page
- `POST /login` - Process login
- `POST /logout` - Logout user

### Employee Routes
- `GET /employee/dashboard` - Employee dashboard
- `GET /employee/records` - Assignment history
- `GET /employee/requests` - Request management
- `POST /employee/requests` - Submit new request
- `GET /employee/stock` - View available products
- `GET /employee/account` - Account settings

### Manager Routes
- `GET /manager/dashboard` - Manager dashboard
- `GET /manager/approvals` - Pending approvals
- `POST /manager/approvals/:id` - Approve/reject request
- `GET /manager/records` - Approval history
- `GET /manager/stock` - Inventory overview
- `GET /manager/account` - Account settings

### Admin Routes
- `GET /admin/dashboard` - Admin dashboard
- `GET /admin/products` - Product management
- `POST /admin/products` - Add new product
- `GET /admin/assign` - Direct assignment
- `POST /admin/assign` - Process assignment
- `GET /admin/return` - Return management
- `POST /admin/return/:id` - Process return
- `GET /admin/stock` - Complete inventory

## Database Schema

### Users Table
- `id` - Primary key
- `username` - Unique username
- `password` - Hashed password
- `name` - Full name
- `role` - User role (employee/manager/admin)
- `created_at` - Account creation timestamp

### Products Table
- `id` - Primary key
- `name` - Product name
- `description` - Product description
- `quantity` - Available quantity
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Requests Table
- `id` - Primary key
- `employee_id` - Foreign key to users
- `product_id` - Foreign key to products
- `quantity` - Requested quantity
- `reason` - Request justification
- `status` - Request status (pending/approved/rejected)
- `approved_by` - Foreign key to approving manager
- `created_at` - Request timestamp
- `approved_at` - Approval timestamp
- `returned` - Return status (boolean)
- `returned_at` - Return timestamp

## Security Features

- **Password Hashing**: bcrypt for secure password storage
- **Session Management**: Express sessions for user authentication
- **Role-Based Access**: Middleware to restrict access by user role
- **Input Validation**: Server-side validation for all forms
- **SQL Injection Prevention**: Parameterized queries with MySQL2

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure MySQL server is running
   - Check database credentials in `app.js`
   - Verify database `asset_management` exists

2. **Cannot Create Users**
   - Run database schema first: `mysql -u root -p asset_management < database.sql`
   - Check MySQL user permissions

3. **Port Already in Use**
   - Change port in `app.js` or kill process using port 3000
   - Use `lsof -ti:3000 | xargs kill -9` to free port

4. **Login Issues**
   - Ensure you ran `node create-users.js` to create users
   - Check browser console for JavaScript errors

### Development Tips

- Use `npm run dev` for development with nodemon auto-restart
- Check `console.log` outputs in terminal for debugging
- Use browser developer tools to inspect network requests
- Test with different user roles to verify access controls

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## License

This project is licensed under the ISC License.

## Changelog

### Version 1.0.0
- Initial release with complete asset management functionality
- Role-based access control for employees, managers, and administrators
- Responsive design with Tailwind CSS
- RESTful API architecture
- Comprehensive inventory management system

## Detailed System Explanation

### 🏗️ System Architecture

#### **Application Stack Overview**
The Asset Management System follows a traditional three-tier architecture:

**Presentation Tier (Frontend)**
- **EJS Templates**: Server-side rendered views with embedded JavaScript for dynamic content
- **Tailwind CSS**: Utility-first CSS framework providing responsive design capabilities
- **Font Awesome**: Professional icon library for enhanced UI/UX
- **Responsive Design**: Mobile-first approach ensuring cross-device compatibility

**Application Tier (Backend)**
- **Node.js Runtime**: JavaScript server environment with event-driven, non-blocking I/O
- **Express.js Framework**: Minimalist web framework providing robust routing and middleware
- **Session Management**: Express-session with secure configuration for user state management
- **Authentication**: bcrypt password hashing with role-based access control middleware

**Data Tier (Database)**
- **MySQL Database**: Relational database with ACID compliance for data integrity
- **MySQL2 Driver**: Modern Promise-based MySQL driver with prepared statement support
- **Normalized Schema**: Efficient data structure minimizing redundancy and ensuring consistency

#### **Security Architecture**

**Authentication Layer**
```javascript
// Password hashing with bcrypt
const hashedPassword = await bcrypt.hash(password, 10);

// Session configuration
app.use(session({
  secret: 'asset-management-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
```

**Authorization Middleware**
- Role-based access control (RBAC) implemented through custom middleware
- Route protection ensuring users can only access authorized resources
- Session validation on every request to protected endpoints

**Data Protection**
- SQL injection prevention through parameterized queries
- Input validation and sanitization on all user inputs
- Environment variable management for sensitive configuration

### 🔄 Detailed Workflow Processes

#### **Asset Request Workflow**

**1. Request Initiation (Employee)**
```
Employee Dashboard → Browse Stock → Select Item → Fill Request Form
↓
System validates availability and user permissions
↓
Creates pending request record in database
↓
Sends notification to appropriate manager
```

**2. Approval Process (Manager)**
```
Manager Dashboard → View Pending Requests → Review Details
↓
Manager evaluates business justification and stock availability
↓
Decision: Approve/Reject with optional comments
↓
System updates request status and inventory (if approved)
↓
Employee receives notification of decision
```

**3. Asset Assignment (Automatic/Admin)**
```
Approved Request → Inventory Update → Assignment Record Creation
↓
Stock quantity automatically decremented
↓
Assignment tracking record created
↓
Employee can view assigned assets in dashboard
```

**4. Return Process (Admin)**
```
Employee initiates return → Admin processes return → Inventory restored
↓
Return record created with timestamp
↓
Stock quantity incremented
↓
Assignment marked as returned
```

#### **Inventory Management Process**

**Stock Monitoring**
- Real-time inventory tracking with automatic updates
- Low-stock alerts when quantities fall below thresholds
- Complete audit trail of all inventory movements

**Product Lifecycle**
```
Product Creation → Stock Management → Assignment Tracking → Return Processing
     ↓                    ↓                    ↓                    ↓
Admin adds new      Stock levels        Assignment to       Return and
products with       monitored and       employees with      inventory
descriptions        updated in          approval workflow   restoration
and quantities      real-time
```

### 🎯 Role-Based Access Control (RBAC) Implementation

#### **Permission Matrix**

| Feature | Employee | Manager | Admin |
|---------|----------|---------|-------|
| View Dashboard | ✅ | ✅ | ✅ |
| Request Assets | ✅ | ❌ | ✅ |
| Approve Requests | ❌ | ✅ | ✅ |
| Add Products | ❌ | ❌ | ✅ |
| Direct Assignment | ❌ | ❌ | ✅ |
| Process Returns | ❌ | ❌ | ✅ |
| View All Records | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ✅ |

#### **Route Protection Implementation**
```javascript
// Middleware to check authentication
function requireAuth(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Middleware to check specific roles
function requireRole(role) {
  return (req, res, next) => {
    if (req.session.user && req.session.user.role === role) {
      next();
    } else {
      res.status(403).render('error', { message: 'Access denied' });
    }
  };
}
```

### 📊 Database Schema Deep Dive

#### **Entity Relationship Model**

**Users Table Structure**
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,  -- bcrypt hashed
  name VARCHAR(100) NOT NULL,
  role ENUM('employee', 'manager', 'admin') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Products Table Structure**
```sql
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  quantity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Requests Table Structure**
```sql
CREATE TABLE requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  approved_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL,
  returned BOOLEAN DEFAULT FALSE,
  returned_at TIMESTAMP NULL,
  FOREIGN KEY (employee_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);
```

#### **Data Relationships**
- **One-to-Many**: Users → Requests (employee relationship)
- **One-to-Many**: Users → Requests (manager approval relationship)
- **One-to-Many**: Products → Requests
- **Referential Integrity**: Foreign key constraints ensure data consistency

### 🎨 User Interface Design Principles

#### **Responsive Design Implementation**
```css
/* Mobile-first approach with Tailwind CSS */
.dashboard-grid {
  @apply grid grid-cols-1 gap-4;
}

@media (min-width: 768px) {
  .dashboard-grid {
    @apply grid-cols-2;
  }
}

@media (min-width: 1024px) {
  .dashboard-grid {
    @apply grid-cols-3;
  }
}
```

#### **User Experience Features**
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Accessible Design**: Semantic HTML with proper ARIA labels
- **Visual Feedback**: Loading states, success/error messages, and status indicators
- **Intuitive Navigation**: Role-specific menus and breadcrumb navigation

### 🚀 API Design and Implementation

#### **RESTful Endpoint Structure**
```
Authentication:
POST /login          - User authentication
POST /logout         - Session termination

Employee Resources:
GET  /employee/dashboard    - Dashboard view
GET  /employee/requests     - Request management
POST /employee/requests     - Submit new request
GET  /employee/stock        - Available inventory

Manager Resources:
GET  /manager/approvals     - Pending approvals
POST /manager/approvals/:id - Process approval
GET  /manager/records       - Approval history

Admin Resources:
GET  /admin/products        - Product management
POST /admin/products        - Add new product
POST /admin/assign          - Direct assignment
POST /admin/return/:id      - Process return
```

#### **Error Handling Strategy**
```javascript
// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});
```

### 🔧 Development and Deployment

#### **Environment Configuration**
```javascript
// Environment variables for configuration
const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'asset_management'
  },
  session: {
    secret: process.env.SESSION_SECRET || 'default-secret'
  },
  port: process.env.PORT || 3000
};
```

#### **Development Workflow**
1. **Local Development**: Nodemon for automatic server restart
2. **Database Management**: SQL scripts for schema and seed data
3. **Testing**: Manual testing with different user roles
4. **Version Control**: Git workflow with feature branches

#### **Performance Considerations**
- **Database Indexing**: Primary keys and foreign keys for query optimization
- **Connection Pooling**: Efficient database connection management
- **Session Storage**: In-memory for development, Redis recommended for production
- **Caching Strategy**: EJS template caching for improved performance

### 📈 Scalability and Future Enhancements

#### **Horizontal Scaling Preparation**
- **Stateless Design**: Session data can be externalized to Redis
- **Database Optimization**: Query optimization and indexing strategies
- **Load Balancing**: Express.js supports multiple instances behind load balancer

#### **Potential Enhancements**
- **Real-time Notifications**: WebSocket integration for instant updates
- **Advanced Reporting**: Analytics dashboard with charts and metrics
- **File Upload**: Asset images and documentation attachment
- **API Documentation**: OpenAPI/Swagger documentation
- **Unit Testing**: Jest/Mocha test suite implementation
- **CI/CD Pipeline**: Automated testing and deployment

### Linux/Mac Setup
```bash
# Make scripts executable
chmod +x scripts/linux/*.sh

# Run complete setup
./scripts/linux/setup.sh
```

### Windows Setup

**Option 1: Using Batch File (setup.bat)**
```cmd
scripts\windows\setup.bat
```

**Option 2: Using PowerShell (setup.ps1) - Recommended**
```powershell
# If you get execution policy errors, first run:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then run the setup:
.\scripts\windows\setup.ps1
```

## Docker Deployment

### Quick Docker Setup
```bash
# Using Docker Compose (from project root)
cd docker && docker-compose up -d

# Manual Docker build
docker build -f docker/Dockerfile -t asset-management .
docker run -d -p 8080:8080 asset-management
```

### Deploy to Docker Hub

**Linux/Mac:**
```bash
./scripts/linux/docker-deploy.sh
```

**Windows:**
```cmd
scripts\windows\docker-deploy.bat
```

### Windows-Specific Notes

**Prerequisites for Windows:**
- **Node.js**: Download from [nodejs.org](https://nodejs.org/)
- **MySQL Server**: Download from [MySQL Downloads](https://dev.mysql.com/downloads/mysql/)
- **Git** (optional): Download from [git-scm.com](https://git-scm.com/)

**Common Windows Issues:**

1. **PowerShell Execution Policy**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **MySQL PATH Issues**
   - Add MySQL bin directory to your system PATH
   - Usually: `C:\Program Files\MySQL\MySQL Server 8.0\bin`

3. **Port Already in Use**
   ```cmd
   # Find process using port 8080
   netstat -ano | findstr :8080
   
   # Kill the process (replace PID with actual process ID)
   taskkill /PID <PID> /F
   ```

4. **Database Connection Issues**
   - Ensure MySQL service is running
   - Check Windows Services (`services.msc`)
   - Verify credentials in `.env` file