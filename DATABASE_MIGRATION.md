# Database Migration Guide for Google Cloud SQL

## Quick Migration Commands

### Option 1: Using Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to SQL > Your Instance > Query
3. Copy and paste the following SQL:

```sql
-- Add description column (ignore error if it already exists)
ALTER TABLE products 
ADD COLUMN description TEXT;

-- Add updated_at column (ignore error if it already exists)
ALTER TABLE products 
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Update existing records to set updated_at to added_at for consistency
UPDATE products 
SET updated_at = added_at 
WHERE updated_at IS NULL;
```

### Option 2: Using gcloud command
```bash
# Connect to your Cloud SQL instance
gcloud sql connect YOUR_INSTANCE_NAME --user=root

# Then run the SQL commands above
```

### Option 3: Using Cloud SQL Proxy
```bash
# Start the proxy
cloud_sql_proxy -instances=YOUR_PROJECT:YOUR_REGION:YOUR_INSTANCE=tcp:3306

# In another terminal, connect with MySQL client
mysql -h 127.0.0.1 -u root -p YOUR_DATABASE_NAME

# Then run the SQL commands above
```

## Verification
After running the migration, verify the columns were added:
```sql
DESCRIBE products;
```

You should see `description` and `updated_at` columns in the output.

## Notes
- The migrations are safe to run multiple times
- If columns already exist, you'll get an error but it won't affect the database
- Make sure to backup your database before running migrations in production
