# Google Cloud Platform (GCP) App Engine Deployment Guide

This directory contains all the necessary files to deploy the Asset Management System to Google Cloud Platform using Google App Engine and Cloud SQL.

## 📋 Prerequisites

Before deploying, ensure you have:

1.  **Google Cloud Platform Account**
    *   Create an account at [console.cloud.google.com](https://console.cloud.google.com)
    *   Create a new project or select an existing one. This guide assumes the project ID is `mqi-interns-467308`.
    *   **Note**: Deployment scripts use `mqi-ims`. Ensure consistency.

2.  **Google Cloud CLI**
    *   Install from: https://cloud.google.com/sdk/docs/install
    *   Authenticate: `gcloud auth login`
    *   Set project: `gcloud config set project mqi-ims`

3.  **Billing Account**
    *   Enable billing for your GCP project. This is required for App Engine and Cloud SQL.

## 🚀 Quick Deployment

### Option 1: Automated Deployment (Recommended)

If you have a `gcp/deploy.sh` script, you can run it:
```bash
# Make the script executable
chmod +x gcp/deploy.sh

# Run the deployment script
./gcp/deploy.sh
```

### Option 2: Manual Deployment

```bash
# 1. Enable required APIs
gcloud services enable appengine.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable secretmanager.googleapis.com

# 2. Create Cloud SQL instance
gcloud sql instances create product-management-db  \
    --database-version=MYSQL_8_0 \
    --tier=db-f1-micro \
    --region=us-central1

# 3. Create database
gcloud sql databases create product_management_system --instance=product-management-db 
gcloud sql users create sigma --instance=product-management-db  --password=sigma
gcloud sql users set-password sigma --instance=product-management-db  --password=sigma
 
# 4. Import schema
## The import command requires the SQL file to be in a Google Cloud Storage bucket.
##
## Step 4a: Create a Cloud Storage bucket (only needs to be done once).
## Replace 'rdt-pu-db' with a globally unique name.
gcloud storage buckets create gs://rdt-pu-db
## Step 4b: Copy the local SQL file to the bucket.
gcloud storage cp sql/database.sql gs://rdt-pu-db/
## Step 4c: Import from the bucket.
gcloud sql import sql product-management-db  gs://rdt-pu-db/database.sql --database=product_management_system

# 5. Create Secrets in Secret Manager
echo -n "sigma" | gcloud secrets create db-password --data-file=- --replication-policy="automatic"
echo -n "replace-with-a-long-random-string-for-sessions" | gcloud secrets create session-secret --data-file=- --replication-policy="automatic"

# 6. Grant App Engine permission to access secrets
PROJECT_NUMBER=$(gcloud projects describe mqi-ims --format='get(projectNumber)')
gcloud projects add-iam-policy-binding mqi-ims \
    --member="serviceAccount:${PROJECT_NUMBER}@appspot.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# 7. Create App Engine app
gcloud app create --region=us-central1

# 8. Deploy
gcloud app deploy app.yaml --project=mqi-ims
```

## 🔧 Configuration Files

### `app.yaml`
Google App Engine configuration file that defines:
- Runtime environment (Node.js 20)
- Environment variables (including secure secrets)
- Cloud SQL connection
- Scaling settings

### `database.sql`
Database initialization script that creates the schema and sample data.

### `.gcloudignore`
Specifies files to exclude from deployment (e.g., `node_modules`, local configs, deployment scripts).

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Users/Devices │────│  App Engine     │────│   Cloud SQL     │
│                 │    │  (Node.js App)  │    │   (MySQL 8.0)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                                             ▲
         │                                             │
┌─────────────────┐                           ┌─────────────────┐
│ Secret Manager  │                           │  Cloud Storage  │
│ (Credentials)   │                           │ (Static Files)  │
└─────────────────┘                           └─────────────────┘
```

## 🔐 Secure Environment Variables

Sensitive credentials like the database password and session secret are **not** stored in `app.yaml`. They are loaded securely from **Google Secret Manager**.

The `app.yaml` file references these secrets:
```yaml
env_variables:
  NODE_ENV: production
  DB_HOST: /cloudsql/mqi-interns-467308:us-central1:product-management-db 
  DB_USER: app_user
  DB_NAME: product_management_system
  # Secrets loaded from Secret Manager
  DB_PASSWORD: "projects/mqi-interns-467308/secrets/db-password/versions/latest"
  SESSION_SECRET: "projects/mqi-interns-467308/secrets/session-secret/versions/latest"
```

## 📊 Monitoring & Logs

### View Application Logs
```bash
# Real-time logs
gcloud app logs tail -s default

# Historical logs
gcloud app logs read -s default
```

### Monitoring Dashboard
- Visit: `https://console.cloud.google.com/appengine?project=mqi-interns-467308`
- Monitor: CPU, memory, requests, errors.

## 🛠️ Troubleshooting

### Common Issues

1.  **Database connection fails**
    - Check that the Cloud SQL instance `product-management-db ` is running.
    - Verify the App Engine service account has the `Cloud SQL Client` and `Secret Manager Secret Accessor` roles in IAM.
    - Ensure the secrets `db-password` and `session-secret` exist in Secret Manager.

2.  **App doesn't start (502/503 errors)**
    - Check logs for application errors: `gcloud app logs tail -s default`
    - Ensure all required environment variables are correctly referenced in `app.yaml`.

### Useful Commands
```bash
# Check deployment status
gcloud app versions list

# Access Cloud SQL
gcloud sql connect product-management-db  --user=root

# Update environment variables by redeploying
gcloud app deploy app.yaml --quiet
```

## 🔄 Updates & Maintenance

To deploy updates, simply run the deployment command again:
```bash
gcloud app deploy app.yaml
```

## 📱 Access Your Application

After deployment, your application will be available at:
- **URL**: `https://mqi-interns-467308.uc.r.appspot.com`

---

Happy deploying! 🚀