# Deployment Guide: Render & TiDB Cloud

This guide details the step-by-step process used to successfully deploy the Inventory Management System using **Render** (for hosting) and **TiDB Cloud** (for the database).

## 1. Prerequisites

- GitHub Repository with the latest project code.
- Account on [Render.com](https://render.com/).
- Account on [TiDB Cloud](https://tidbcloud.com/).
- Node.js installed locally.

## 2. TiDB Cloud (Database) Setup

1.  **Create a Cluster**:
    - Log in to TiDB Cloud.
    - Create a new "Serverless" cluster (Free Tier is sufficient).
    - Region: Select the one closest to you (e.g., Singapore/Mumbai).
2.  **Get Credentials**:
    - Go to "Connect" in your cluster dashboard.
    - Select "Connect with Code" -> "Node.js".
    - Copy the following details:
      - **Host** (e.g., `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`)
      - **Port** (usually `4000`)
      - **User** (e.g., `yqep7JdX.root`)
      - **Password**
      - **Database Name** (default is often `test`)

## 3. Codebase Preparation (Already Completed)

We made specific updates to the code to support cloud databases:

- **SSL Support**: Added `ssl: { rejectUnauthorized: false }` to `server.js`, `setup-db.js`, and `config/database.js` to allow secure connections to TiDB.
- **Environment Variables**: Updated config files to accept standard keys like `DB_USERNAME`, `DB_DATABASE`, `DB_HOST`.
- **Setup Script**: Updated `setup-db.js` to use TiDB credentials as defaults for easier initialization.

## 4. Initialize the Cloud Database

Before deploying the app, the database needs to be created and seeded with tables and the admin user.

1.  **Run Setup Locally**:
    Run the `setup-db.js` script from your local machine. It is pre-configured (in the code) to connect to your TiDB instance.

    ```bash
    node setup-db.js
    ```

    _Output should confirm: `✅ Database setup complete!`_

2.  **Patch/Fix Schema (If Connection Errors Occur)**:
    If logs show "Unknown column" errors (e.g., `is_active`, `asset_type`), we ran specific patch scripts. Ensure your database has these columns.

    - We ran `node scripts/fix_db_cloud.js` and `node scripts/fix_db_cloud_v2.js` to ensure columns like `is_active`, `asset_type`, and `is_available` exist.

3.  **Verify Admin User**:
    Ensure the admin user exists. Our setup script creates:
    - **Username**: `admin`
    - **Password**: `admin` (or `admin123` depending on the run)
    - _Alternative User Created_: `GuddiS` / `Welcome@123`

## 5. Deploy to Render

1.  **Create Web Service**:
    - In Render Dashboard, click "New" -> "Web Service".
    - Connect your GitHub repository (`project-interns`).
2.  **Configure Service**:
    - **Name**: `project-interns` (or your choice)
    - **Region**: Singapore (match DB if possible)
    - **Branch**: `main`
    - **Runtime**: `Node`
    - **Build Command**: `npm install`
    - **Start Command**: `node server.js`
3.  **Environment Variables**:
    Add the following variables in the "Environment" tab:
    - `NODE_ENV`: `production`
    - `DB_HOST`: `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`
    - `DB_PORT`: `4000`
    - `DB_USER`: `yqep7Jd558B1uEm.root`
    - `DB_PASSWORD`: `xASxSG7DJSxAjSFv`
    - `DB_NAME`: `test`
    - `SESSION_SECRET`: (Any random long string)
4.  **Deploy**:
    - Click "Create Web Service".
    - Wait for the "Live" badge.

## 6. Verification

1.  Go to your Render URL: `https://project-interns.onrender.com`
2.  Login with:
    - **Username**: `GuddiS` (or `admin`)
    - **Password**: `Welcome@123` (or `admin`)
3.  Check the "Dashboard" to ensure charts load (verifies database read access).

## 7. Troubleshooting

- **"Unknown Column" Error**: Run the patch scripts locally (`node scripts/fix_db_cloud.js`) to update the cloud schema.
- **Login Fails**: Check database for user existence using `scripts/check_and_fix_users.js`.
