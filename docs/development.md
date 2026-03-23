# Development Guide

## Prerequisites

### Extension Development
- Node.js 18+
- Chrome or Edge browser

### Server Development
- Go 1.21+
- PostgreSQL 12+

## Local Development Setup

### 1. Start PostgreSQL

```bash
# Using Docker
docker run -d \
  --name vaultpapi-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=vaultpapi \
  -p 5432:5432 \
  postgres:15
```

### 2. Start the Server

```bash
cd server

export DB_CONNECTION_STRING="postgres://postgres:postgres@localhost:5432/vaultpapi?sslmode=disable"
export JWT_SECRET="dev-secret-key-at-least-32-bytes"

go run ./cmd/vaultpapi -migrate
```

### 3. Build the Extension

```bash
cd extension

npm install
npm run dev
```

### 4. Load Extension in Browser

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `extension/dist/`

## Development Workflow

### Extension (Watch Mode)

```bash
cd extension
npm run dev
```

Vite rebuilds on every file change. Reload the extension in `chrome://extensions` after each build.

### Server (Hot Reload)

For Go, consider using [air](https://github.com/air-verse/air) for hot reload:

```bash
go install github.com/air-verse/air@latest
cd server
air
```

## Testing

### Extension

```bash
cd extension
npm test
```

### Server

```bash
cd server
go test ./...
```

## Project Dependencies

### Server Dependencies

| Package | Purpose |
|---------|---------|
| github.com/golang-jwt/jwt/v5 | JWT generation and validation |
| github.com/google/uuid | UUID generation |
| github.com/jackc/pgx/v5 | PostgreSQL driver |
| golang.org/x/crypto | Argon2id password hashing |
| gopkg.in/yaml.v3 | YAML configuration parsing |

## Code Style

- Run `go fmt` before committing Go code
- Use meaningful variable and function names
- Add comments for complex logic
- Handle all errors explicitly
- Write tests for new functionality

## Debugging

### Extension

- Use `console.log` for debugging
- Check `chrome://extensions` for errors
- Inspect service worker in DevTools

### Server

- Use `fmt.Println` or a logger for debug output
- Check server logs for errors
- Use `curl` to test API endpoints directly
