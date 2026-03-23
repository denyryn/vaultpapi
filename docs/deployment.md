# Deployment Guide

## Docker

Use the provided `docker-compose.yml` for local development:

```bash
docker-compose up -d
```

This starts:
- PostgreSQL 15 on port 5432
- VaultPAPI server on port 8080

### Production Docker

Build and run the server container:

```bash
cd server
docker build -t vaultpapi .
docker run -d \
  --name vaultpapi \
  -p 8080:8080 \
  -e DB_CONNECTION_STRING="postgres://user:pass@host:5432/vaultpapi?sslmode=require" \
  -e JWT_SECRET="your-secure-secret" \
  vaultpapi
```

## Server Configuration

### config.yaml

```yaml
database:
  connection_string: "postgres://postgres:postgres@localhost:5432/vaultpapi?sslmode=disable"
  max_conns: 10
  min_conns: 2

server:
  port: "8080"
  read_timeout: 15s
  write_timeout: 15s
  idle_timeout: 60s
  shutdown_time: 30s

jwt:
  secret: "change-this-to-a-secure-secret-at-least-32-bytes"
  expiry_duration: 24h
  issuer: "vaultpapi"

security:
  rate_limit_requests: 100
  rate_limit_window: 1m
  max_request_size: 1048576
  extension_id: "chrome-extension://<extension-id>"
```

### Environment Variables

Environment variables override config.yaml values:

| Variable | Description |
|----------|-------------|
| `DB_CONNECTION_STRING` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT signing (min 32 bytes) |
| `DB_MAX_CONNS` | Maximum database connections |
| `PORT` | Server port |
| `RATE_LIMIT_REQUESTS` | Requests per rate limit window |

## Database Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash BYTEA NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vaults table
CREATE TABLE vaults (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encrypted_blob BYTEA NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## CORS Configuration

Your VaultPAPI server must allow requests from the extension origin. Add to your server config:

```
Access-Control-Allow-Origin: chrome-extension://<your-extension-id>
```

Or for development, allow all origins. The extension ID is shown in `chrome://extensions`.

## Production Deployment Checklist

### Server

- [ ] Generate strong JWT secret (32+ bytes)
- [ ] Configure PostgreSQL with SSL in production
- [ ] Set up reverse proxy (nginx, Caddy) with TLS
- [ ] Configure rate limiting appropriately
- [ ] Enable security headers
- [ ] Set up monitoring/logging
- [ ] Configure backup strategy for PostgreSQL

### Extension

- [ ] Note extension ID for CORS configuration
- [ ] Deploy server with valid TLS certificate
- [ ] Test autofill functionality
- [ ] Test vault sync
- [ ] Verify CSV import works

### Security

- [ ] Use HTTPS in production
- [ ] Rotate JWT secret periodically
- [ ] Review rate limiting settings
- [ ] Enable database encryption at rest
- [ ] Set up firewall rules
- [ ] Regular security audits
