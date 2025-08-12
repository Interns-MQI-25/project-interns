# GitHub Actions Workflows

This directory contains automated workflows for the Marquardt India Inventory Management System.

## 🔄 Available Workflows

### 1. **CI/CD Pipeline** (`ci-cd.yml`)
**Triggers:** Push/PR to main branches
- ✅ **Testing & Linting** - Code quality checks
- ✅ **Database Validation** - SQL schema validation  
- 🚀 **Multi-Environment Deployment**
  - `gcp-deploy-win` → Development environment
  - `final-monitor1` → Staging environment
  - `main` → Production environment
- 🩺 **Health Checks** - Post-deployment validation

### 2. **Database Operations** (`database-ops.yml`) 
**Triggers:** Manual workflow dispatch
- 🗄️ **Setup** - Initialize database schema
- 🔄 **Migration** - Run database migrations
- 💾 **Backup** - Create database backups
- 🔄 **Restore** - Restore from backup
- 🗑️ **Reset** - Reset database (dev only)

### 3. **Code Quality** (`code-quality.yml`)
**Triggers:** Push/PR to main branches
- 🔍 **ESLint Analysis** - JavaScript linting
- 📊 **Code Complexity** - Analyze code metrics
- 🔒 **Security Scan** - Check for vulnerabilities
- 🏗️ **Architecture Analysis** - Project structure review

### 4. **Documentation** (`documentation.yml`)
**Triggers:** Push to main, manual dispatch
- 📚 **API Documentation** - Generate route documentation
- 🗄️ **Database Schema** - Document table structures
- 🚀 **Deployment Guide** - Create deployment instructions
- 🔧 **Setup Guide** - Generate installation docs

### 5. **Monitoring** (`monitoring.yml`)
**Triggers:** Scheduled (every 30 minutes), manual
- 🩺 **Health Checks** - Application availability
- 🔐 **Authentication Testing** - Login flow validation
- 📊 **Performance Metrics** - Response time monitoring
- 🔒 **Security Headers** - Security configuration check
- 🔐 **SSL Certificate** - Certificate expiration monitoring

### 6. **Release** (`release.yml`)
**Triggers:** Git tags (`v*.*.*`), manual dispatch
- 📋 **Changelog Generation** - Automatic release notes
- 📦 **Release Package** - Create deployment archive
- 📊 **Release Metrics** - Code statistics
- 🚀 **GitHub Release** - Publish release with assets

## 🔧 Setup Requirements

### GitHub Secrets
Configure these secrets in your repository settings:

#### **Google Cloud Platform**
```
GCP_SA_KEY          # Service account JSON key
```

#### **Database Credentials**
```
# Development
DEV_DB_USER         # Development database user
DEV_DB_PASSWORD     # Development database password  
DEV_DB_NAME         # Development database name

# Staging
STAGING_DB_USER     # Staging database user
STAGING_DB_PASSWORD # Staging database password
STAGING_DB_NAME     # Staging database name

# Production
PROD_DB_USER        # Production database user
PROD_DB_PASSWORD    # Production database password
PROD_DB_NAME        # Production database name
```

### GitHub Environments
Create these environments in your repository:
- `development` - For dev deployments
- `staging` - For staging deployments  
- `production` - For production deployments (with protection rules)

## 🌍 Environment Strategy

### **Development** (`gcp-deploy-win` branch)
- Automatic deployment on push
- Service: `dev`
- URL: `https://dev-dot-mqi-ims.uc.r.appspot.com`

### **Staging** (`final-monitor1` branch)  
- Automatic deployment on push
- Service: `staging`
- URL: `https://staging-dot-mqi-ims.uc.r.appspot.com`

### **Production** (`main` branch)
- Automatic deployment on push
- Service: `default`
- URL: `https://mqi-ims.uc.r.appspot.com`
- Requires approval for sensitive operations

## 🚀 Usage Examples

### Deploy to Development
```bash
git checkout gcp-deploy-win
git add .
git commit -m "feat: new feature"
git push origin gcp-deploy-win
```

### Run Database Migration
1. Go to **Actions** tab
2. Select **Database Operations**
3. Click **Run workflow**
4. Choose operation: `migrate`
5. Choose environment: `production`

### Create a Release
```bash
git tag v1.0.0
git push origin v1.0.0
```

### Manual Health Check
1. Go to **Actions** tab
2. Select **Monitoring & Health Checks**
3. Click **Run workflow** 
4. Choose environment to check

## 📊 Monitoring Dashboard

The workflows provide continuous monitoring:

- ✅ **Application Health** - Every 30 minutes
- 📈 **Performance Metrics** - Response times
- 🔒 **Security Status** - Headers and SSL
- 📱 **Mobile Compatibility** - Cross-device testing

## 🛠️ Troubleshooting

### Common Issues

**1. Deployment Failures**
- Check GCP service account permissions
- Verify database connection strings
- Review App Engine quotas

**2. Database Connection Issues**  
- Validate Cloud SQL instance status
- Check firewall rules
- Verify credentials in secrets

**3. Test Failures**
- Review code quality issues
- Check ESLint configuration
- Update dependencies

### Workflow Status

Monitor workflow status at:
- Repository **Actions** tab
- Badge status in README
- Email notifications (if configured)

## 📚 Additional Resources

- [Google App Engine Documentation](https://cloud.google.com/appengine/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)

---

**Last Updated:** Auto-generated by Documentation workflow
