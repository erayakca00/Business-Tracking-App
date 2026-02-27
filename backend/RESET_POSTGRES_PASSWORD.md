# PostgreSQL Password Reset Guide for Windows

## Step 1: Find pg_hba.conf
The file is located at: `C:\Program Files\PostgreSQL\17\data\pg_hba.conf`

## Step 2: Edit pg_hba.conf
1. Open `pg_hba.conf` with Administrator privileges (Right-click Notepad → Run as Administrator)
2. Find the line that looks like:
   ```
   host    all             all             127.0.0.1/32            scram-sha-256
   ```
3. Change `scram-sha-256` to `trust`:
   ```
   host    all             all             127.0.0.1/32            trust
   ```
4. Save the file

## Step 3: Restart PostgreSQL Service
Open PowerShell as Administrator and run:
```powershell
Restart-Service postgresql-x64-17
```

## Step 4: Reset Password
Now you can connect without a password:
```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres
```

Then in psql, run:
```sql
ALTER USER postgres WITH PASSWORD 'your_new_password';
\q
```

## Step 5: Restore Security
1. Edit `pg_hba.conf` again
2. Change `trust` back to `scram-sha-256`
3. Restart PostgreSQL service again

## Alternative: Use pgAdmin
If you have pgAdmin installed, you can use it to manage users without needing the postgres password.

---

**Quick Option:** If you just want to proceed with development, we can skip the postgres user entirely and create our dev_user directly using pgAdmin or by keeping trust authentication for local development.
