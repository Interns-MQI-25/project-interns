# Modular Structure Documentation

## Overview
The application has been refactored into a modular structure to improve maintainability and organization. All routes have been separated into different modules based on user roles.

## Directory Structure

```
src/
├── middleware/
│   └── auth.js                 # Authentication middleware (requireAuth, requireRole)
└── routes/
    ├── commonRoutes.js         # Shared routes (login, register, dashboard, API endpoints)
    ├── adminRoutes.js          # Admin-specific routes
    ├── employeeRoutes.js       # Employee-specific routes
    └── monitorRoutes.js        # Monitor-specific routes
```

## File Descriptions

### `src/middleware/auth.js`
Contains authentication and authorization middleware:
- `requireAuth`: Validates user session and database presence
- `requireRole`: Checks if user has required role permissions

### `src/routes/commonRoutes.js`
Contains routes that are shared across roles:
- Authentication routes (`/login`, `/register`, `/logout`)
- Password management routes
- Main dashboard route (`/dashboard`)
- API endpoints (`/api/stock/search`)

### `src/routes/adminRoutes.js`
Contains admin-specific routes (all prefixed with `/admin`):
- `/employees` - Employee management
- `/monitors` - Monitor management
- `/stock` - Stock management for admins
- `/history` - System history
- `/registration-requests` - Registration approval
- `/dashboard-stats` - API for dashboard statistics
- Employee creation, status management, and bulk operations

### `src/routes/employeeRoutes.js`
Contains employee-specific routes (all prefixed with `/employee`):
- `/records` - View assignment records
- `/account` - Account details
- `/requests` - Product request management
- `/stock` - View available stock
- Product request submission and return functionality

### `src/routes/monitorRoutes.js`
Contains monitor-specific routes (all prefixed with `/monitor`):
- `/approvals` - Product request approvals
- `/inventory` - Inventory management
- `/stock` - Stock management for monitors
- `/records` - Monitor assignment records
- Request processing and product addition functionality

## Benefits of the New Structure

1. **Better Organization**: Related routes are grouped together
2. **Easier Maintenance**: Changes to specific user role functionality are isolated
3. **Improved Readability**: Smaller, focused files are easier to understand
4. **Reduced Conflicts**: Multiple developers can work on different modules simultaneously
5. **Better Testing**: Individual modules can be tested independently

## Usage

The main `server.js` file now imports and uses these modules:

```javascript
// Import route modules
const commonRoutes = require('./src/routes/commonRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const employeeRoutes = require('./src/routes/employeeRoutes');
const monitorRoutes = require('./src/routes/monitorRoutes');

// Use route modules
app.use('/', commonRoutes(pool, requireAuth, requireRole));
app.use('/admin', adminRoutes(pool, requireAuth, requireRole));
app.use('/employee', employeeRoutes(pool, requireAuth, requireRole));
app.use('/monitor', monitorRoutes(pool, requireAuth, requireRole));
```

## Migration Notes

- The original `server.js` has been backed up as `server_backup.js`
- All existing functionality has been preserved
- No changes to frontend views or API endpoints
- Database connections and middleware configuration remain the same

## Adding New Routes

To add new routes:

1. **For role-specific routes**: Add to the appropriate role file (`adminRoutes.js`, `employeeRoutes.js`, or `monitorRoutes.js`)
2. **For shared routes**: Add to `commonRoutes.js`
3. **For new middleware**: Add to `src/middleware/`

Each route module exports a function that takes `(pool, requireAuth, requireRole)` parameters and returns an Express router.
