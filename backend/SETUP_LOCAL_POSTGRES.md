# Quick Setup for Local PostgreSQL (No Password Required)

## Run these commands in PowerShell AS ADMINISTRATOR:

### Step 1: Backup and modify pg_hba.conf
```powershell
# Backup the original file
Copy-Item "C:\Program Files\PostgreSQL\17\data\pg_hba.conf" "C:\Program Files\PostgreSQL\17\data\pg_hba.conf.backup"

# Replace scram-sha-256 with trust for localhost
(Get-Content "C:\Program Files\PostgreSQL\17\data\pg_hba.conf") -replace 'scram-sha-256', 'trust' | Set-Content "C:\Program Files\PostgreSQL\17\data\pg_hba.conf"
```

### Step 2: Restart PostgreSQL
```powershell
Restart-Service postgresql-x64-17
```

### Step 3: Create database and user (no password needed now)
```powershell
cd "C:\Users\docto\OneDrive\Masaüstü\Business Tracking App\backend"

# Create database and user
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -f setup-local-db.sql

# Run schema migration
Get-Content src/database/migrations/initial-schema.sql | & "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U dev_user -d business_tracking
```

### Step 4: Test Node.js connection
```powershell
node test-db-connection.js
```

---

**Note:** Trust authentication is fine for local development. For production, you'd use proper passwords and scram-sha-256.
