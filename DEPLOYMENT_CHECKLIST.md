# 🚀 App Engine Deployment Checklist

## Pre-Deployment Requirements

### ✅ Google Cloud Setup
- [ ] Google Cloud account created
- [ ] Project `mqi-interns-467405` exists and billing is enabled
- [ ] Google Cloud CLI installed and authenticated
- [ ] Project set: `gcloud config set project mqi-interns-467405`

### ✅ Files Ready
- [x] `app.yaml` configured
- [x] `package.json` updated with dependencies
- [x] `.gcloudignore` configured
- [x] Deployment script created

## 🚀 Quick Deployment Commands

### Option 1: Automated Deployment (Recommended)
```bash
# Make script executable
chmod +x deploy-appengine.sh

# Run deployment
./deploy-appengine.sh
```

### Option 2: Manual Deployment
```bash
# 1. Set project
gcloud config set project mqi-interns-467405

# 2. Enable APIs
gcloud services enable appengine.googleapis.com sqladmin.googleapis.com

# 3. Create App Engine app (if first time)
gcloud app create --region=us-central

# 4. Deploy
gcloud app deploy
```

## 📋 Database Configuration
- **Instance Name**: `product-management-db`
- **Region**: `us-central1`
- **Database**: `product_management_system`
- **User**: `sigma`
- **Password**: `sigma`

## 🔧 Post-Deployment Steps
1. Visit your app URL (provided after deployment)
2. Go to `/setup-database` to initialize the database
3. Login with admin credentials:
   - Email: `admin@company.com`
   - Password: `admin123`

## 📊 Monitoring Commands
```bash
# View logs
gcloud app logs tail -s default

# Browse app
gcloud app browse

# View Cloud SQL instances
gcloud sql instances list
```

## 🆘 Troubleshooting
- If deployment fails, check logs: `gcloud app logs tail -s default`
- If database connection fails, verify Cloud SQL instance is running
- For permission issues, ensure billing is enabled and APIs are activated
