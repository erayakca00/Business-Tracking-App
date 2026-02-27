# pgAdmin Connection Troubleshooting

## ✅ Verified Database Credentials

The PostgreSQL database is running correctly with these credentials:

| Setting | Value |
|---------|-------|
| **Host** | `localhost` |
| **Port** | `5432` |
| **Database** | `business_tracking` |
| **Username** | `dev_user` |
| **Password** | `dev_password` |

## Common Issues & Solutions

### 1. Password Authentication Failed

**If you see "password authentication failed for user dev_user":**

✅ **Double-check the password**: Make sure you're typing `dev_password` (not `dev_user`)

✅ **Clear saved passwords**: In pgAdmin, if you saved an incorrect password:
   - Right-click the server → Properties
   - Go to Connection tab
   - Re-enter the password: `dev_password`
   - Save

✅ **Try connecting via command line first**:
```powershell
docker exec -it bt-postgres psql -U dev_user -d business_tracking
# When prompted, enter: dev_password
```

### 2. Connection Refused

**If you can't connect at all:**

✅ **Verify Docker is running**:
```powershell
docker ps | findstr postgres
```

You should see `bt-postgres` with status "Up"

✅ **Restart PostgreSQL container**:
```powershell
cd docker
docker compose restart postgres
```

### 3. pgAdmin-Specific Issues

**If pgAdmin won't accept the password:**

1. **Delete and recreate the server connection**:
   - Right-click the server → Remove Server
   - Create a new server connection from scratch

2. **Use these EXACT settings**:
   ```
   General Tab:
   - Name: Business Tracking

   Connection Tab:
   - Host: localhost
   - Port: 5432
   - Maintenance database: business_tracking
   - Username: dev_user
   - Password: dev_password
   
   ✅ Check "Save password"
   ```

3. **Click "Save" (not "Connect")**

## Alternative: Use Command Line

If pgAdmin continues to have issues, you can use the command line:

```powershell
# Connect to database
docker exec -it bt-postgres psql -U dev_user -d business_tracking

# Inside psql, useful commands:
\dt                    # List all tables
\d users              # Describe users table
SELECT * FROM users;  # View all users
\q                    # Quit
```

## Verify Connection Works

Run this to confirm the database is accessible:

```powershell
docker exec bt-postgres psql -U dev_user -d business_tracking -c "SELECT current_database(), current_user;"
```

Expected output:
```
 current_database | current_user 
------------------+--------------
 business_tracking | dev_user
```

## Still Having Issues?

The database is confirmed working. If pgAdmin still won't connect:

1. Try restarting pgAdmin
2. Try using a different database tool (e.g., DBeaver, DataGrip)
3. Use the Docker command line method above
4. Verify no firewall is blocking port 5432

The credentials are definitely correct: `dev_user` / `dev_password`
