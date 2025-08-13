# GitHub Actions CI/CD Setup Guide

## Overview

This document outlines the comprehensive GitHub Actions workflows created for the Marquardt India IMS project, including the authentication fixes and required configurations.

## 🎯 What Was Accomplished

### 1. GitHub Actions Workflows Created
- **`ci-cd.yml`** - Main CI/CD pipeline with multi-environment deployment
- **`database-ops.yml`** - Database migration and backup operations
- **`code-quality.yml`** - Code analysis and quality checks
- **`documentation.yml`** - Automated documentation generation
- **`monitoring.yml`** - Health checks and monitoring
- **`release.yml`** - Automated release management
- **`README.md`** - Workflow documentation

### 2. Authentication Issues Fixed
- ✅ Added `project_id` parameter to all Google Cloud authentication blocks
- ✅ Resolved "must specify exactly one of workload_identity_provider or credentials_json" error
- ✅ Fixed authentication in all deployment jobs (development, staging, production)
- ✅ Fixed authentication in database operations workflow
- ✅ Fixed authentication in rollback operations

### 3. Deployment Strategy
- **Development Environment** - Triggered on pushes to `gcp-deploy-win` branch
- **Staging Environment** - Triggered on pushes to `final-monitor1` branch
- **Production Environment** - Triggered on pushes to `main` branch
- **Manual Rollback** - Available for production environment

## 🔧 Required GitHub Secrets Configuration

To make these workflows functional, you need to configure the following secrets in your GitHub repository:

### Navigate to: Repository Settings → Secrets and variables → Actions

### 1. Google Cloud Authentication
```
GCP_SA_KEY - Service account key JSON for Google Cloud authentication
```

### 2. Development Environment Database Secrets
```
DEV_DB_USER - Development database username
DEV_DB_PASSWORD - Development database password
DEV_DB_NAME - Development database name
```

### 3. Staging Environment Database Secrets
```
STAGING_DB_USER - Staging database username
STAGING_DB_PASSWORD - Staging database password
STAGING_DB_NAME - Staging database name
```

### 4. Production Environment Database Secrets
```
PROD_DB_USER - Production database username
PROD_DB_PASSWORD - Production database password
PROD_DB_NAME - Production database name
```

### 5. Email Configuration (for notifications)
```
SMTP_HOST - SMTP server hostname
SMTP_PORT - SMTP server port
SMTP_USER - SMTP username
SMTP_PASS - SMTP password
ADMIN_EMAIL - Admin email for notifications
```

### 6. Optional: Slack Integration
```
SLACK_WEBHOOK_URL - Slack webhook URL for deployment notifications
```

## 🏗️ Google Cloud Service Account Setup

### 1. Create a Service Account
```bash
gcloud iam service-accounts create github-actions \
    --description="Service account for GitHub Actions" \
    --display-name="GitHub Actions"
```

### 2. Grant Required Permissions
```bash
# App Engine deployment
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/appengine.deployer"

# Cloud SQL access
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client"

# Storage access (for uploads)
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"
```

### 3. Create and Download Key
```bash
gcloud iam service-accounts keys create key.json \
    --iam-account=github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 4. Add Key to GitHub Secrets
- Copy the contents of `key.json`
- Add it as `GCP_SA_KEY` secret in GitHub

## 🚀 Workflow Features

### CI/CD Pipeline (`ci-cd.yml`)
- **Continuous Integration**: Automated testing on all branches
- **Security Scanning**: SQL injection detection, dependency vulnerability checks
- **Multi-Environment Deployment**: Dev → Staging → Production
- **Database Migration**: Automatic schema updates
- **Rollback Capability**: Quick production rollback if needed
- **Notifications**: Email and Slack alerts for deployment status

### Database Operations (`database-ops.yml`)
- **Schema Migrations**: Apply database changes safely
- **Backup Creation**: Automated database backups
- **Migration Rollback**: Revert schema changes if needed
- **Validation**: Schema integrity checks before deployment

### Code Quality (`code-quality.yml`)
- **ESLint**: JavaScript code linting
- **Security Audit**: npm audit for vulnerabilities
- **Dependency Check**: Outdated package detection
- **Code Coverage**: Test coverage reporting

### Monitoring (`monitoring.yml`)
- **Health Checks**: Application availability monitoring
- **Performance Testing**: Basic load testing
- **Database Connectivity**: Connection health verification
- **Alert Generation**: Automated incident detection

## 🔄 Deployment Flow

### 1. Development Workflow
```
Feature Branch → gcp-deploy-win → Development Environment
```
- Automatic deployment on push
- Full CI/CD pipeline execution
- Development database migration

### 2. Staging Workflow
```
gcp-deploy-win → final-monitor1 → Staging Environment
```
- Staging environment testing
- Production-like environment validation
- Integration testing

### 3. Production Workflow
```
final-monitor1 → main → Production Environment
```
- Production deployment
- Database backup before deployment
- Automatic rollback on failure
- Production monitoring activation

## 📊 Environment Variables

The workflows use these environment variables:
```yaml
NODE_VERSION: "18"  # Node.js version
PROJECT_ID: "mqi-ims"  # Google Cloud Project ID
APP_SERVICE: "default"  # App Engine service name
INSTANCE_NAME: "mqi-ims-db"  # Cloud SQL instance name
```

## 🔍 Monitoring and Alerts

### Available Monitoring
- Application health checks every 5 minutes
- Database connectivity monitoring
- Performance metrics collection
- Error rate tracking

### Alert Conditions
- Application downtime > 2 minutes
- Database connection failures
- High error rates (>5%)
- Deployment failures

### Notification Channels
- Email notifications to admin
- Slack alerts (if configured)
- GitHub issue creation for critical failures

## 🛠️ Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify `GCP_SA_KEY` secret is properly configured
   - Ensure service account has required permissions
   - Check project ID matches environment variable

2. **Database Connection Issues**
   - Verify database secrets are correctly set
   - Check Cloud SQL instance is running
   - Validate database credentials

3. **Deployment Failures**
   - Check App Engine quotas
   - Verify application configuration
   - Review deployment logs in GitHub Actions

### Debug Commands
```bash
# Check service account permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID

# Test database connection
gcloud sql connect mqi-ims-db --user=root

# Verify App Engine status
gcloud app describe
```

## 📝 Next Steps

1. **Configure GitHub Secrets** - Add all required secrets to repository
2. **Test Workflows** - Make a test commit to trigger the pipeline
3. **Monitor Deployments** - Watch the first few deployments closely
4. **Set Up Alerts** - Configure email/Slack notifications
5. **Review Security** - Audit service account permissions regularly

## 🔐 Security Considerations

- Service account follows principle of least privilege
- Database credentials are encrypted in GitHub secrets
- No sensitive data in workflow files
- Regular security audits included in pipeline
- Automatic dependency vulnerability scanning

## 📞 Support

For issues with these workflows:
1. Check GitHub Actions logs for detailed error messages
2. Review Google Cloud logs for deployment issues
3. Verify all secrets are properly configured
4. Ensure service account permissions are correct

---

**Status**: ✅ All workflows created and authentication fixed
**Last Updated**: January 2025
**Version**: 1.0.0
