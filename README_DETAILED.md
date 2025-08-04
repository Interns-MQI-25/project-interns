# Marquardt India Pvt. Ltd.

A comprehensive web-based product management system built with Express.js, Node.js, and MySQL, featuring role-based access control for employees, monitors, and administrators.

## Features

### User Roles

1. **Employees**
   - View personal information and department details
   - Request products for projects
   - View request status and history
   - Browse available stock
   - Access account management

2. **Monitors**
   - View all employee information
   - Approve/reject product requests
   - Manage inventory (add, assign, return products)
   - Generate reports
   - View request history

3. **Administrators**
   - Manage all employees (create, edit, delete)
   - Assign/unassign monitor roles (max 4 monitors)
   - Approve new employee registrations
   - View system-wide history and reports
   - Manage stock and inventory

## Technology Stack

- **Frontend**: HTML5, Tailwind CSS, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Template Engine**: EJS
- **Authentication**: Sessions with bcryptjs
- **Styling**: Tailwind CSS with custom components

## Installation

### Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/Interns-MQI-25/project-interns.git
   cd project-interns
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   - Create a MySQL database named `product_management_system`
   - Import the database schema:
     ```bash
     mysql -u your_username -p product_management_system < database.sql
     ```

4. **Environment Configuration**
   - Update the `.env` file with your database credentials:
     ```env
     DB_HOST=localhost
     DB_USER=your_username
     DB_PASSWORD=your_password
     DB_NAME=product_management_system
     SESSION_SECRET=your_secret_key
     PORT=3000
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
   - Default admin credentials: `admin` / `admin` (change immediately)

## Project Structure

```
project-interns/
├── views/                  # EJS templates
│   ├── auth/              # Authentication pages
│   ├── employee/          # Employee dashboard and pages
│   ├── monitor/           # Monitor dashboard and pages
│   ├── admin/             # Admin dashboard and pages
│   └── partials/          # Reusable components
├── public/                # Static assets
│   ├── css/              # Stylesheets
│   └── js/               # Client-side JavaScript
├── database.sql          # Database schema and initial data
├── server.js             # Main application file
├── package.json          # Dependencies and scripts
├── tailwind.config.js    # Tailwind CSS configuration
└── .env                  # Environment variables
```

## Key Features

### Authentication & Authorization
- Secure login/logout system
- Role-based access control
- Session management
- Registration approval workflow

### Employee Management
- User creation and management
- Department assignment
- Role assignment (employee/monitor)
- Account activation/deactivation

### Product Management
- Inventory tracking
- Product requests workflow
- Approval/rejection system
- Stock level monitoring
- Assignment history

### Reporting & Analytics
- Request history
- Stock reports
- Assignment tracking
- Monitor activity logs

## Database Schema

The system uses the following main tables:
- `users` - User accounts and roles
- `employees` - Employee details and department mapping
- `departments` - Department information
- `products` - Product inventory
- `product_requests` - Employee product requests
- `product_assignments` - Approved product assignments
- `monitor_assignments` - Monitor role assignments
- `registration_requests` - Pending user registrations
- `stock_history` - Inventory movement tracking

## API Endpoints

### Authentication
- `GET /login` - Login page
- `POST /login` - Process login
- `GET /register` - Registration page
- `POST /register` - Process registration
- `GET /logout` - Logout

### Employee Routes
- `GET /employee/dashboard` - Employee dashboard
- `GET /employee/records` - Assignment history
- `GET /employee/requests` - Request management
- `GET /employee/stock` - Available stock
- `POST /employee/request-product` - Submit product request

### Monitor Routes
- `GET /monitor/dashboard` - Monitor dashboard
- `GET /monitor/approvals` - Pending requests
- `GET /monitor/inventory` - Inventory management
- `POST /monitor/process-request` - Approve/reject requests
- `POST /monitor/add-product` - Add new products

### Admin Routes
- `GET /admin/dashboard` - Admin dashboard
- `GET /admin/employees` - Employee management
- `GET /admin/registration-requests` - Pending registrations
- `POST /admin/process-registration` - Approve/reject registrations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security Considerations

- Passwords are hashed using bcryptjs
- Session-based authentication
- Role-based access control
- SQL injection prevention using parameterized queries
- XSS protection through EJS escaping

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please create an issue in the GitHub repository or contact the development team.

## Changelog

### Version 1.0.0
- Initial release
- Complete user role system
- Product management workflow
- Responsive web interface
- Database schema and migrations
