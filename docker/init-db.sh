#!/bin/bash
set -e

# This script runs when the PostgreSQL container is first initialized
# It ensures the dev_user is created with the correct password encryption

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Ensure the user exists with md5 password
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'dev_user') THEN
            CREATE USER dev_user WITH PASSWORD 'dev_password';
        ELSE
            ALTER USER dev_user WITH PASSWORD 'dev_password';
        END IF;
    END
    \$\$;
    
    -- Grant all privileges
    GRANT ALL PRIVILEGES ON DATABASE business_tracking TO dev_user;
    GRANT ALL ON SCHEMA public TO dev_user;
EOSQL

echo "dev_user has been configured successfully"
