# Docker Services for Business Tracking App

This directory contains Docker Compose configuration for local development.

## Services

### PostgreSQL (Port 5432)
- **Image:** postgres:15-alpine
- **Database:** business_tracking
- **User:** dev_user
- **Password:** dev_password

### Redis (Port 6379)
- **Image:** redis:7-alpine
- **Purpose:** Caching and session storage

### MinIO (Ports 9000, 9001)
- **Image:** minio/minio:latest
- **Console:** http://localhost:9001
- **API:** http://localhost:9000
- **Credentials:** minioadmin / minioadmin

## Usage

Start all services:
```bash
docker compose up -d
```

Stop all services:
```bash
docker compose down
```

View logs:
```bash
docker compose logs -f
```

Check service status:
```bash
docker compose ps
```

## Accessing Services

- **PostgreSQL:** `psql -h localhost -p 5432 -U dev_user -d business_tracking`
- **Redis:** `redis-cli -h localhost -p 6379`
- **MinIO Console:** http://localhost:9001
