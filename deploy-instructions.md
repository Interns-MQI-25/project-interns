# Google App Engine Deployment Instructions

## Prerequisites
1. Google Cloud SDK installed
2. Google Cloud project created
3. Cloud SQL MySQL instance created

## Setup Steps

### 1. Update app.yaml
Replace the placeholders in `app.yaml`:
```yaml
env_variables:
  DB_HOST: /cloudsql/YOUR-PROJECT-ID:REGION:INSTANCE-NAME
  DB_USER: root
  DB_PASSWORD: YOUR-DB-PASSWORD
  DB_NAME: product_management_system
  SESSION_SECRET: your-production-session-secret

beta_settings:
  cloud_sql_instances: YOUR-PROJECT-ID:REGION:INSTANCE-NAME
```

### 2. Deploy Commands
```bash
# Copy GCP files
cp package-gcp.json package.json
cp server-gcp.js server.js

# Deploy to App Engine
gcloud app deploy

# View logs
gcloud app logs tail -s default
```

### 3. Access Application
- URL: https://YOUR-PROJECT-ID.appspot.com
- Admin Login: GuddiS / Welcome@MQI

### 4. Database Setup
The database will auto-initialize on first startup with:
- Admin user: GuddiS
- Password: Welcome@MQI
- Basic tables created automatically

## Troubleshooting
- Check Cloud SQL connection string
- Verify database permissions
- Monitor App Engine logs