# VaultPAPI

A self-hosted, zero-knowledge password manager consisting of a Go backend server and a Chrome/Edge browser extension.

## Features

- **Zero-knowledge encryption** — AES-256-GCM with PBKDF2 key derivation (600k iterations)
- **Autofill** — Detects login forms and fills saved credentials
- **Save prompt** — Asks to save credentials after login
- **Password generator** — Configurable length and charset with strength meter
- **Browser migration** — Import from Chrome, Firefox, Safari, Edge, Bitwarden, 1Password, LastPass
- **Vault sync** — Encrypted vault synced with self-hosted instance

## Architecture

```
vaultpapi/
├── extension/          # Chrome/Edge browser extension
│   └── dist/          # Built extension (load in browser)
├── server/            # Go backend
│   ├── cmd/           # Application entry point
│   ├── internal/      # Core services
│   ├── migrations/    # Database schema
│   └── config.yaml   # Configuration
└── docs/              # Documentation
```

## Quick Start

### 1. Start the Server

```bash
cd server

# Configure database
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/vaultpapi?sslmode=disable"
export JWT_SECRET="your-secure-secret-key-at-least-32-bytes"

# Run migrations and start server
go run ./cmd/vaultpapi -migrate
```

### 2. Load the Extension

```bash
cd extension
npm install
npm run build
```

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `extension/dist/`

### 3. Connect

1. Click the VaultPAPI icon in the toolbar
2. Enter your instance URL (e.g. `http://localhost:8080`)
3. Click **Connect**
4. **Register** a new account or **Sign in**

## Documentation

- [Documentation](docs/index.md)
- [Extension Guide](docs/extension/index.md)
- [Server Guide](docs/server/index.md)
- [Security](docs/security.md)
- [Deployment](docs/deployment.md)
- [Development](docs/development.md)

## Security

The server implements a zero-knowledge architecture:

- All sensitive data is encrypted client-side
- Server only stores and returns encrypted blobs
- Server NEVER has access to plaintext passwords or encryption keys

| Component | Encryption |
|-----------|------------|
| Extension | AES-256-GCM with PBKDF2-SHA256 (600k iterations) |
| Server | Argon2id password hashing |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /v1/auth/register` | Register new user |
| `POST /v1/auth/login` | Authenticate and get JWT |
| `GET /v1/vault` | Retrieve encrypted vault |
| `PUT /v1/vault` | Save encrypted vault |
| `GET /health` | Health check |

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret (min 32 bytes) |
| `PORT` | Server port (default: 8080) |
| `RATE_LIMIT_REQUESTS` | Requests per minute per IP |

### CORS

For browser extension access, add to server config:

```
Access-Control-Allow-Origin: chrome-extension://<your-extension-id>
```

## License

See project license file.
