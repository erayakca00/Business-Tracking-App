-- Create database
CREATE DATABASE business_tracking;

-- Create user
CREATE USER dev_user WITH PASSWORD 'dev_password' SUPERUSER;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE business_tracking TO dev_user;
