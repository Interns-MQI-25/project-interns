# 🏠 Local Development Environment Setup

This guide will help you set up the Marquardt IMS application for local development.

## 📋 Prerequisites

- **Node.js 20+** - [Download here](https://nodejs.org/)
- **MySQL 8.0+** or **MariaDB** - [MySQL Download](https://dev.mysql.com/downloads/) | [MariaDB Download](https://mariadb.org/download/)
- **Git** - [Download here](https://git-scm.com/)

## 🚀 Quick Setup

### Option 1: Automated Setup (Recommended)

**For Windows (PowerShell):**
```powershell
npm run setup-local-win
```

**For macOS/Linux (Bash):**
```bash
npm run setup-local
```

### Option 2: Manual Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Interns-MQI-25/project-interns.git
   cd project-interns
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.local .env
   ```

4. **Update database credentials in `.env`:**
   ```bash
   DB_HOST=localhost
   DB_USER=your_mysql_username
   DB_PASSWORD=your_mysql_password
   DB_NAME=product_management_system
   ```

5. **Initialize the database:**
   ```bash
   npm run setup-db
   ```

6. **Start the application:**
   ```bash
   npm run dev
   ```

## 🗄️ Database Setup

### Local MySQL/MariaDB Setup

1. **Start MySQL service:**
   ```bash
   # Windows (using MySQL Installer service)
   net start mysql80
   
   # macOS (using Homebrew)
   brew services start mysql
   
   # Linux (using systemd)
   sudo systemctl start mysql
   ```

2. **Create database and user:**
   ```sql
   mysql -u root -p
   
   CREATE DATABASE product_management_system;
   CREATE USER 'sigma'@'localhost' IDENTIFIED BY 'sigma';
   GRANT ALL PRIVILEGES ON product_management_system.* TO 'sigma'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

3. **Run database setup:**
   ```bash
   npm run setup-db
   ```

## 🔧 Environment Configuration

### Local Development (`.env`)
```bash
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_USER=sigma
DB_PASSWORD=sigma
DB_NAME=product_management_system
DB_PORT=3306
SESSION_SECRET=local-dev-secret-key-2025-marquardt
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
ADMIN_EMAIL=admin@yourcompany.com
```

### Available Scripts

| Script | Purpose |
|--------|---------|
| `npm start` | Start application in production mode |
| `npm run dev` | Start application in development mode |
| `npm run setup-db` | Initialize database schema |
| `npm run setup-local` | Automated local setup (bash) |
| `npm run setup-local-win` | Automated local setup (PowerShell) |

## 🌐 Accessing the Application

Once started, the application will be available at:
- **Local:** http://localhost:3000
- **Network:** http://your-ip:3000

### Default Admin Account
After running `npm run setup-db`, you can create an admin account using:
```bash
node create-admin.js
```

## 📁 Project Structure

```
project-interns/
├── .env.local          # Local development template
├── .env.deployment     # Deployment configuration
├── .env.example        # Environment template
├── server.js           # Main application file
├── setup-db.js         # Database setup script
├── setup-local.sh      # Linux/Mac setup script
├── setup-local.ps1     # Windows setup script
├── src/                # Source code
├── views/              # EJS templates
├── public/             # Static assets
├── uploads/            # File uploads
└── sql/                # Database scripts
```

## 🔗 Integration with GitHub Actions

The local environment files are designed to work seamlessly with the GitHub Actions deployment pipeline:

1. **`.env.deployment`** - Contains all deployment configurations
2. **Environment-specific variables** - Automatically loaded during CI/CD
3. **Consistent configuration** - Same structure for local and cloud environments

## 🐛 Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
# Check MySQL service status
mysql --version
mysql -u sigma -p product_management_system

# Restart MySQL service
sudo systemctl restart mysql  # Linux
brew services restart mysql   # macOS
net stop mysql80 && net start mysql80  # Windows
```

**2. Port Already in Use**
```bash
# Find process using port 3000
lsof -i :3000          # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process or change PORT in .env
PORT=3001
```

**3. Permission Issues**
```bash
# Fix file permissions
chmod +x setup-local.sh
chmod +x scripts/*.sh

# Windows PowerShell execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the error logs in the console
3. Ensure all prerequisites are installed
4. Contact the development team

## 🔄 Deployment

To deploy your changes:
1. Commit your changes to the repository
2. Push to the `gcp-deploy-win` branch
3. GitHub Actions will automatically deploy to Google Cloud

```bash
git add .
git commit -m "Your changes"
git push origin gcp-deploy-win
```
