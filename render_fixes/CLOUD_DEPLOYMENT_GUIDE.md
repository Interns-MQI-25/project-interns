# Cloud Deployment Guide - Inventory Management System

## Quick Deployment Options

### Option 1: Google Cloud Platform (Recommended)

#### Prerequisites
```bash
# Install Google Cloud SDK
# Windows: Download from https://cloud.google.com/sdk/docs/install
# Linux/Mac: curl https://sdk.cloud.google.com | bash

# Login and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

#### Step 1: Create Cloud SQL Database
```bash
# Create Cloud SQL instance
gcloud sql instances create inventory-db \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create product_management_system \
  --instance=inventory-db

# Create user
gcloud sql users create appuser \
  --instance=inventory-db \
  --password=SecurePassword123
```

#### Step 2: Create app.yaml
```yaml
runtime: nodejs20
service: default

env_variables:
  NODE_ENV: 'production'
  DB_HOST: '/cloudsql/YOUR_PROJECT_ID:us-central1:inventory-db'
  DB_USER: 'appuser'
  DB_PASSWORD: 'SecurePassword123'
  DB_NAME: 'product_management_system'
  SESSION_SECRET: 'your-secure-session-secret-2025'
  EMAIL_USER: 'your-email@gmail.com'
  EMAIL_PASS: 'your-gmail-app-password'

beta_settings:
  cloud_sql_instances: YOUR_PROJECT_ID:us-central1:inventory-db

automatic_scaling:
  min_instances: 1
  max_instances: 3
```

#### Step 3: Deploy
```bash
# Deploy to App Engine
gcloud app deploy app.yaml --quiet

# View your app
gcloud app browse
```

#### Step 4: Setup Admin Users
```bash
# Visit your deployed app URL + /setup
# Example: https://YOUR_PROJECT_ID.uc.r.appspot.com/setup
```

---

### Option 2: Heroku (Fastest Setup)

#### Step 1: Install Heroku CLI
```bash
# Download from https://devcenter.heroku.com/articles/heroku-cli
# Login
heroku login
```

#### Step 2: Create Heroku App
```bash
# Create app
heroku create your-inventory-app

# Add MySQL addon
heroku addons:create jawsdb:kitefin

# Get database URL
heroku config:get JAWSDB_URL
```

#### Step 3: Configure Environment Variables
```bash
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=your-secure-session-secret
heroku config:set EMAIL_USER=your-email@gmail.com
heroku config:set EMAIL_PASS=your-gmail-app-password
```

#### Step 4: Create Procfile
```
web: node server.js
```

#### Step 5: Deploy
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

---

### Option 3: AWS (Elastic Beanstalk)

#### Step 1: Install AWS CLI and EB CLI
```bash
# Install AWS CLI
pip install awscli

# Install EB CLI
pip install awsebcli

# Configure AWS
aws configure
```

#### Step 2: Initialize Elastic Beanstalk
```bash
eb init
# Select Node.js platform
# Choose your region
```

#### Step 3: Create RDS Database
```bash
# Create RDS MySQL instance through AWS Console
# Or use CLI:
aws rds create-db-instance \
  --db-instance-identifier inventory-db \
  --db-instance-class db.t3.micro \
  --engine mysql \
  --master-username admin \
  --master-user-password SecurePassword123 \
  --allocated-storage 20
```

#### Step 4: Deploy
```bash
eb create production
eb deploy
```

---

### Option 4: Docker + Cloud Run (Google Cloud)

#### Step 1: Create Dockerfile
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

#### Step 2: Build and Deploy
```bash
# Build image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/inventory-app

# Deploy to Cloud Run
gcloud run deploy inventory-app \
  --image gcr.io/YOUR_PROJECT_ID/inventory-app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## Environment Variables Setup

Create `.env.production` file:
```env
NODE_ENV=production
DB_HOST=your-cloud-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=product_management_system
DB_PORT=3306
SESSION_SECRET=your-super-secure-session-secret-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
PORT=3000
```

## Database Migration

### Import your local database to cloud:
```bash
# Export local database
mysqldump -u root -p product_management_system > local_backup.sql

# For Google Cloud SQL:
gcloud sql import sql inventory-db gs://your-bucket/local_backup.sql \
  --database=product_management_system

# For other platforms, use their respective import tools
```

## SSL/HTTPS Setup

Most cloud platforms provide automatic HTTPS. For custom domains:

### Google Cloud:
```bash
# Map custom domain
gcloud app domain-mappings create your-domain.com

# SSL certificate is automatic
```

### Heroku:
```bash
# Add custom domain
heroku domains:add your-domain.com

# SSL is automatic with paid plans
```

## Monitoring Setup

### Google Cloud:
```bash
# Enable monitoring
gcloud services enable monitoring.googleapis.com

# View logs
gcloud app logs tail -s default
```

### Health Check Endpoint
Add to your server.js:
```javascript
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

## Quick Start Commands

### For Google Cloud (Recommended):
```bash
# 1. Clone your project
git clone https://github.com/Interns-MQI-25/project-interns.git
cd project-interns

# 2. Create app.yaml (use template above)
# 3. Deploy
gcloud app deploy

# 4. Setup admin users
# Visit: https://YOUR_PROJECT_ID.uc.r.appspot.com/setup
```

### For Heroku (Fastest):
```bash
# 1. Create Procfile
echo "web: node server.js" > Procfile

# 2. Deploy
heroku create your-app-name
git push heroku main

# 3. Setup database and visit /setup endpoint
```

## Cost Estimates

- **Google Cloud**: $5-20/month (free tier available)
- **Heroku**: $7-25/month 
- **AWS**: $10-30/month
- **Docker + Cloud Run**: $0-15/month

## Support & Troubleshooting

### Common Issues:
1. **Database connection**: Check firewall rules and connection strings
2. **Environment variables**: Verify all required vars are set
3. **File uploads**: Configure cloud storage for production
4. **Session issues**: Use secure session secrets

### Debug Commands:
```bash
# Google Cloud logs
gcloud app logs tail -s default

# Heroku logs  
heroku logs --tail

# AWS logs
eb logs
```

Choose **Google Cloud Platform** for the best balance of features, cost, and ease of deployment.