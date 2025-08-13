# Configuration Files Directory

This directory contains all YAML configuration files for the project, organized by environment and purpose.

## 📁 Directory Structure

```
config/
├── README.md                    # This file
├── app.yaml                     # Main production App Engine configuration
├── app-dev.yaml                 # Development environment configuration
├── app-staging.yaml             # Staging environment configuration
├── app-production.yaml          # Production environment configuration (generated)
├── app_copy.yaml               # Backup/copy of original configuration
├── app_secure.yaml             # Secure configuration template
└── app-dev-test.yaml           # Development test configuration
```

## 🎯 Configuration Files

### Primary Configurations

- **`app.yaml`** - Main production configuration file
  - Used for production deployments
  - Service: `default`
  - Environment: `production`

- **`app-dev.yaml`** - Development environment
  - Used for development deployments  
  - Service: `dev`
  - Environment: `development`
  - Deployed to: `https://dev-dot-mqi-ims.uc.r.appspot.com`

- **`app-staging.yaml`** - Staging environment
  - Used for staging deployments
  - Service: `staging` 
  - Environment: `staging`
  - Deployed to: `https://staging-dot-mqi-ims.uc.r.appspot.com`

### Generated Configurations

- **`app-production.yaml`** - Generated production config
  - Created by setup scripts from `.env.deployment`
  - Contains environment-specific variables
  - Alternative to manually maintained `app.yaml`

### Backup/Template Files

- **`app_copy.yaml`** - Backup copy of original configuration
- **`app_secure.yaml`** - Template for secure configuration
- **`app-dev-test.yaml`** - Test configuration for development

## 🔧 Usage

### Manual Generation
Generate configuration files using the setup scripts:

**PowerShell (Windows):**
```powershell
.\setup-github-env.ps1 -Generate
```

**Bash (Linux/macOS):**
```bash
./setup-github-env.sh
```

### GitHub Actions
The CI/CD pipeline automatically uses configurations from this directory:

- **Development branch (`gcp-deploy-win`)**: Uses `config/app-dev.yaml`
- **Staging branch (`final-monitor1`)**: Uses `config/app-staging.yaml`  
- **Production branch (`main`)**: Uses `config/app.yaml`

## 🔐 Environment Variables

All configuration files use environment variables from:
- **Local Development**: `.env.local`
- **GitHub Actions**: `.env.deployment`

### Common Variables
```yaml
env_variables:
  NODE_ENV: 'development|staging|production'
  DB_HOST: '/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME'
  DB_USER: 'database_username'
  DB_PASSWORD: 'database_password'
  DB_NAME: 'database_name'
  SESSION_SECRET: 'session_secret_key'
  EMAIL_USER: 'email@gmail.com'
  EMAIL_PASS: 'email_app_password'
  ADMIN_EMAIL: 'admin@company.com'
```

## 🚀 Deployment Flow

1. **Local Development**
   - Use `.env.local` for local database connection
   - Test with local MySQL/MariaDB

2. **Development Deployment**
   - Push to `gcp-deploy-win` branch
   - Uses `config/app-dev.yaml`
   - Deploys to `dev` service

3. **Staging Deployment**
   - Push to `final-monitor1` branch
   - Uses `config/app-staging.yaml`
   - Deploys to `staging` service

4. **Production Deployment**
   - Push to `main` branch
   - Uses `config/app.yaml`
   - Deploys to `default` service

## 📝 Configuration Management

### Best Practices
1. **Version Control**: All configuration files are tracked in Git
2. **Environment Separation**: Each environment has its own configuration
3. **Secret Management**: Use GitHub Secrets for sensitive data
4. **Validation**: Setup scripts validate configuration before deployment

### File Naming Convention
- `app.yaml` - Primary production configuration
- `app-{environment}.yaml` - Environment-specific configurations
- `app_{type}.yaml` - Special purpose configurations (backup, secure, etc.)

## 🔍 Troubleshooting

### Common Issues
1. **Missing Configuration**: Run setup scripts to generate missing files
2. **Environment Variables**: Check `.env.deployment` for correct values
3. **Service Names**: Ensure service names match across environments
4. **Cloud SQL**: Verify Cloud SQL instance names and connection strings

### Validation
```powershell
# Validate all configurations
.\setup-github-env.ps1 -Validate

# Generate and validate
.\setup-github-env.ps1
```

## 📚 Related Files
- `/.env.deployment` - Deployment environment variables
- `/.env.local` - Local development environment variables
- `/.env.example` - Environment variables template
- `/setup-github-env.ps1` - PowerShell setup script
- `/setup-github-env.sh` - Bash setup script
- `/.github/workflows/ci-cd.yml` - CI/CD pipeline configuration
