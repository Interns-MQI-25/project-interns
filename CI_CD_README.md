# GitHub Actions CI/CD Workflow

This project includes a comprehensive GitHub Actions workflow that automatically tests the application across multiple Node.js versions and includes database testing.

## Workflow Overview

The CI/CD pipeline consists of two main jobs:

### 1. Build Job
- **Runs on**: Ubuntu Latest
- **Node.js versions**: 18.x, 20.x, 22.x
- **Steps**:
  - Checkout code
  - Setup Node.js with npm caching
  - Install dependencies (`npm ci`)
  - Build project (if build script exists)
  - Run tests
  - Security audit check
  - Code linting (if lint script exists)

### 2. Database Test Job
- **Runs on**: Ubuntu Latest with MySQL 8.0 service
- **Node.js version**: 20.x
- **Database**: MySQL 8.0 with test database
- **Steps**:
  - Setup MySQL service container
  - Install dependencies
  - Wait for MySQL to be ready
  - Setup test database with schema
  - Run database-specific tests

## Triggers

The workflow triggers on:
- **Push** to `main` or `admin` branches
- **Pull requests** targeting `main` or `admin` branches

## Test Scripts

### Basic Tests (`npm test`)
Located in `test/basic.test.js`:
- Module loading verification
- bcrypt functionality testing
- Express app creation
- Environment configuration checks

### Database Tests (`npm run test:db`)
Located in `test/db.test.js`:
- Database connectivity verification
- Table structure validation
- Basic query operations testing
- Admin system verification

## Environment Variables

For database testing, the following environment variables are used:
- `DB_HOST`: Database host (default: 127.0.0.1)
- `DB_PORT`: Database port (default: 3306)
- `DB_USER`: Database user (default: sigma)
- `DB_PASSWORD`: Database password (default: sigma)
- `DB_NAME`: Database name (default: product_management_system_test)

## Local Testing

To run tests locally:

```bash
# Run basic tests
npm test

# Run database tests (requires MySQL running)
npm run test:db

# Run linting (if configured)
npm run lint

# Run build (if configured)
npm run build
```

## MySQL Service Configuration

The workflow automatically:
1. Starts a MySQL 8.0 container
2. Creates a test database with credentials:
   - Root password: `root`
   - Test database: `product_management_system_test`
   - Test user: `sigma` / `sigma`
3. Waits for MySQL to be ready
4. Imports the database schema from `database.sql`

## Security Features

- **npm audit**: Checks for security vulnerabilities in dependencies
- **Credential isolation**: Test database uses separate credentials
- **Clean environment**: Each workflow run uses a fresh environment

## Customization

To customize the workflow:
1. Edit `.github/workflows/node.js.yml`
2. Modify Node.js versions in the matrix strategy
3. Add or remove test scripts in `package.json`
4. Update database configuration as needed

## Status Badges

Add this badge to your README to show build status:

```markdown
![Node.js CI](https://github.com/Interns-MQI-25/project-interns/workflows/Node.js%20CI/badge.svg)
```

## Troubleshooting

### Common Issues:
1. **Tests failing**: Check that all dependencies are properly installed
2. **Database connection errors**: Verify MySQL service is running and credentials are correct
3. **Build failures**: Ensure all required files are present in the repository

### Debug Tips:
- Check the Actions tab in your GitHub repository for detailed logs
- Review the workflow file for proper syntax and configuration
- Ensure test files are executable and properly structured
