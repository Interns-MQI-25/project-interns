# 🔧 GitHub Secrets Setup Guide

## ⚠️ Authentication Error Resolution

If you're seeing this error:
```
google-github-actions/auth failed with: the GitHub Action workflow must specify exactly one of "workload_identity_provider" or "credentials_json"!
```

This means the required GitHub secrets are not configured. Follow this guide to fix it.

## 🎯 Quick Fix Steps

### 1. **Navigate to Repository Secrets**
Go to: `https://github.com/Interns-MQI-25/project-interns/settings/secrets/actions`

Or:
1. Go to your GitHub repository
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions**
4. Click **New repository secret**

### 2. **Add Required Secrets**

#### **Primary Secret (Required)**
```
Name: GCP_SA_KEY
Value: [Your Google Cloud Service Account JSON key - see below for how to create]
```

#### **Database Secrets**
```
Name: DEV_DB_USER
Value: root

Name: DEV_DB_PASSWORD  
Value: [Your development database password]

Name: DEV_DB_NAME
Value: ims_development

Name: STAGING_DB_USER
Value: root

Name: STAGING_DB_PASSWORD
Value: [Your staging database password]

Name: STAGING_DB_NAME
Value: ims_staging

Name: PROD_DB_USER
Value: root

Name: PROD_DB_PASSWORD
Value: [Your production database password]

Name: PROD_DB_NAME
Value: ims_production
```

## 🔑 Creating Google Cloud Service Account Key

### Step 1: Create Service Account
```powershell
# Set your project ID (PowerShell)
$PROJECT_ID = "mqi-ims"

# Create service account
gcloud iam service-accounts create github-actions-sa `
    --description="GitHub Actions Service Account for CI/CD" `
    --display-name="GitHub Actions" `
    --project=$PROJECT_ID
```

**For Bash/Linux users:**
```bash
# Set your project ID (Bash)
export PROJECT_ID="mqi-ims"

# Create service account
gcloud iam service-accounts create github-actions-sa \
    --description="GitHub Actions Service Account for CI/CD" \
    --display-name="GitHub Actions" \
    --project=$PROJECT_ID
```

### Step 2: Grant Required Permissions
```powershell
# App Engine deployment permission
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" `
    --role="roles/appengine.deployer"

# Cloud SQL client permission
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" `
    --role="roles/cloudsql.client"

# Storage admin permission (for file uploads)
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" `
    --role="roles/storage.admin"

# Service Account User permission (required for App Engine)
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" `
    --role="roles/iam.serviceAccountUser"

# Compute Instance Admin permission (for App Engine deployments)
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" `
    --role="roles/compute.instanceAdmin.v1"
```

**For Bash/Linux users:**
```bash
# App Engine deployment permission
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/appengine.deployer"

# Cloud SQL client permission
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client"

# Storage admin permission (for file uploads)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

# Service Account User permission (required for App Engine)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"

# Compute Instance Admin permission (for App Engine deployments)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/compute.instanceAdmin.v1"
```

### Step 3: Create and Download Key
```powershell
# Create JSON key file
gcloud iam service-accounts keys create github-actions-key.json `
    --iam-account=github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com

# Display the key content (copy this for GitHub)
Get-Content github-actions-key.json
```

**For Bash/Linux users:**
```bash
# Create JSON key file
gcloud iam service-accounts keys create github-actions-key.json \
    --iam-account=github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com

# Display the key content (copy this)
cat github-actions-key.json
```

### Step 4: Add Key to GitHub
1. Copy the entire JSON content from the file
2. Go to GitHub repository → Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `GCP_SA_KEY`
5. Value: Paste the entire JSON content
6. Click "Add secret"

## 🛡️ Security Best Practices

### Key Management
- ✅ Never commit the JSON key file to your repository
- ✅ Delete the local key file after adding to GitHub: `rm github-actions-key.json`
- ✅ Rotate service account keys regularly (every 90 days)
- ✅ Use principle of least privilege for permissions

### Service Account Security
```bash
# Check current permissions
gcloud projects get-iam-policy $PROJECT_ID \
    --flatten="bindings[].members" \
    --format="table(bindings.role)" \
    --filter="bindings.members:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com"

# List all keys for the service account
gcloud iam service-accounts keys list \
    --iam-account=github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com
```

## 🧪 Testing the Setup

### 1. Verify Secrets Are Added
1. Go to your repository on GitHub
2. Settings → Secrets and variables → Actions
3. You should see:
   - ✅ `GCP_SA_KEY`
   - ✅ `DEV_DB_USER`, `DEV_DB_PASSWORD`, `DEV_DB_NAME`
   - ✅ `STAGING_DB_USER`, `STAGING_DB_PASSWORD`, `STAGING_DB_NAME`
   - ✅ `PROD_DB_USER`, `PROD_DB_PASSWORD`, `PROD_DB_NAME`

### 2. Test Workflow
```bash
# Push a small change to trigger the workflow
echo "# Test" >> README.md
git add README.md
git commit -m "Test: Trigger GitHub Actions with new secrets"
git push origin gcp-deploy-win
```

### 3. Monitor the Workflow
1. Go to your repository on GitHub
2. Click **Actions** tab
3. Watch the "CI/CD Pipeline" workflow run
4. The "🔍 Validate Required Secrets" job should pass
5. Deployment jobs should now authenticate successfully

## 🔍 Troubleshooting

### Common Issues

#### Secret Not Found
```
Error: Context access might be invalid: GCP_SA_KEY
```
**Solution**: Secret name must be exactly `GCP_SA_KEY` (case-sensitive)

#### Invalid JSON Key
```
Error: Error parsing JSON credentials
```
**Solution**: Ensure the entire JSON object is copied, including `{` and `}`

#### Permission Denied
```
Error: User does not have permission to access the Google Cloud resource
```
**Solution**: 
1. Verify service account has required roles
2. Check project ID matches in workflow
3. Ensure service account is in the correct project

#### Key Expired
```
Error: Service account key expired
```
**Solution**: Generate a new service account key and update the secret

### Debug Commands

```bash
# Test service account authentication locally
gcloud auth activate-service-account --key-file=github-actions-key.json
gcloud projects list

# Check App Engine status
gcloud app describe --project=$PROJECT_ID

# Test Cloud SQL connection
gcloud sql instances describe product-management-db --project=$PROJECT_ID
```

## 📋 Checklist

Before triggering the workflow, ensure:

- [ ] Google Cloud Service Account created
- [ ] Service Account has required permissions
- [ ] JSON key generated and downloaded
- [ ] `GCP_SA_KEY` secret added to GitHub repository
- [ ] All database secrets configured
- [ ] Local key file deleted for security
- [ ] Project ID matches in workflow environment variables

## 🚀 Next Steps

After setting up secrets:

1. **Test the CI/CD Pipeline**
   - Make a small commit to `gcp-deploy-win` branch
   - Monitor the GitHub Actions workflow
   - Verify deployment to development environment

2. **Configure Additional Environments**
   - Set up staging environment secrets if using `final-monitor1` branch
   - Configure production secrets if deploying to `main` branch

3. **Monitor and Maintain**
   - Set calendar reminder to rotate keys every 90 days
   - Monitor workflow runs for any authentication issues
   - Review and audit service account permissions quarterly

---

**Quick Links:**
- [Repository Secrets](https://github.com/Interns-MQI-25/project-interns/settings/secrets/actions)
- [Google Cloud Console](https://console.cloud.google.com)
- [GitHub Actions Logs](https://github.com/Interns-MQI-25/project-interns/actions)

**Status**: 🔄 Waiting for secrets configuration
**Last Updated**: January 2025
