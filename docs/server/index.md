# VaultPAPI Server

A production-grade, security-critical Go backend for a self-hosted, zero-knowledge password manager.

## Architecture

The server implements a zero-knowledge architecture where:

- All sensitive data (vault contents) is encrypted client-side
- The server only stores and returns encrypted blobs
- The server NEVER has access to plaintext passwords or encryption keys

## Tech Stack

- **Language:** Go (latest stable)
- **HTTP:** net/http (no heavy frameworks)
- **Database:** PostgreSQL with pgx driver
- **Auth:** JWT with HMAC-SHA256

## Project Structure

```
server/
├── cmd/vaultpapi/main.go          # Application entry point
├── internal/
│   ├── auth/service.go            # Authentication (register, login, JWT)
│   ├── config/config.go           # Configuration management
│   ├── crypto/password.go         # Argon2id password hashing
│   ├── httphandlers/handlers.go   # HTTP handlers and middleware
│   ├── storage/postgres.go        # PostgreSQL storage layer
│   └── vault/service.go          # Vault operations
├── migrations/001_initial.sql     # Database schema
├── config.yaml                   # Default configuration
├── go.mod                        # Go module definition
└── go.sum                        # Dependency checksums
```

## Getting Started

### Prerequisites

- Go 1.21+
- PostgreSQL 12+

### Installation

1. Clone the repository
2. Navigate to the server directory:
   ```bash
   cd server
   ```

3. Install dependencies:
   ```bash
   go mod download
   ```

4. Configure the database connection:
   ```bash
   export DB_CONNECTION_STRING="postgres://user:pass@localhost:5432/vaultpapi?sslmode=disable"
   export JWT_SECRET="your-secure-secret-key-at-least-32-bytes"
   ```

5. Run migrations and start the server:
   ```bash
   go run ./cmd/vaultpapi -migrate
   ```

### Running without migrations flag

If tables already exist:
```bash
go run ./cmd/vaultpapi
```

### Build binary

```bash
go build -o vaultpapi ./cmd/vaultpapi
./vaultpapi -migrate
```

## API Endpoints

### Authentication

#### POST /v1/auth/register

Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "StrongP@ssw0rd!"
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
```

**Error Codes:**
- `400 invalid_email` - Email format is invalid
- `400 weak_password` - Password does not meet requirements (min 12 chars, upper, lower, digit, special)
- `409 user_exists` - Email already registered

#### POST /v1/auth/login

Authenticate and receive a JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "StrongP@ssw0rd!"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Error Codes:**
- `401 invalid_credentials` - Email or password is incorrect

### Vault Operations

All vault endpoints require authentication via Bearer token:
```
Authorization: Bearer <token>
```

#### GET /v1/vault

Retrieve the user's encrypted vault.

**Response (200 OK):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "encrypted_blob": "base64-encoded-encrypted-data...",
  "version": 5,
  "updated_at": "2024-01-15T12:00:00Z"
}
```

**Error Codes:**
- `401 missing_token` - No Authorization header
- `401 invalid_token` - Token is invalid or malformed
- `401 token_expired` - JWT has expired
- `404 vault_not_found` - No vault exists for user

#### PUT /v1/vault

Save (replace) the user's encrypted vault.

**Request:**
```json
{
  "encrypted_blob": "base64-encoded-encrypted-data...",
  "version": 5
}
```

The `version` field is optional. If provided, optimistic locking is used to detect conflicts.

**Response (200 OK):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "encrypted_blob": "base64-encoded-encrypted-data...",
  "version": 6,
  "updated_at": "2024-01-15T12:05:00Z"
}
```

**Error Codes:**
- `400 empty_vault` - encrypted_blob is empty
- `400 missing_encrypted_blob` - encrypted_blob field is missing
- `413 vault_too_large` - encrypted_blob exceeds 10MB limit

### Health Check

#### GET /health

**Response (200 OK):**
```json
{"status": "ok"}
```

## Usage Examples

### Register a new user

```bash
curl -X POST http://localhost:8080/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"StrongP@ssw0rd!"}'
```

### Login

```bash
curl -X POST http://localhost:8080/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"StrongP@ssw0rd!"}'
```

### Save vault

```bash
curl -X PUT http://localhost:8080/v1/vault \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{"encrypted_blob":"base64data..."}'
```

### Retrieve vault

```bash
curl http://localhost:8080/v1/vault \
  -H "Authorization: Bearer <your-jwt-token>"
```

## Error Handling

All errors return JSON with a single `error` field:

```json
{"error": "error_code"}
```

No internal error details are exposed to clients.

## Graceful Shutdown

The server handles SIGINT and SIGTERM signals for graceful shutdown:

1. Stops accepting new connections
2. Waits for existing requests to complete (up to shutdown_time)
3. Closes database connections
