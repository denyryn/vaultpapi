# VaultPAPI Documentation

VaultPAPI is a self-hosted, zero-knowledge password manager consisting of a Go backend server and a browser extension for Chrome/Edge.

## Overview

VaultPAPI implements a zero-knowledge architecture where:
- All sensitive data (vault contents) is encrypted client-side
- The server only stores and returns encrypted blobs
- The server NEVER has access to plaintext passwords or encryption keys

## Project Structure

```
vaultpapi/
├── extension/          # Chrome/Edge browser extension
│   ├── src/
│   │   ├── popup/      # React popup UI
│   │   ├── content/    # Content script (autofill, save prompts)
│   │   ├── background/ # Service worker
│   │   └── lib/        # Shared utilities
│   └── dist/           # Built extension
├── server/             # Go backend
│   ├── cmd/vaultpapi/  # Application entry point
│   ├── internal/       # Core services
│   ├── migrations/     # Database schema
│   └── config.yaml     # Configuration
└── docs/               # Documentation
```

## Components

### [Server](./server/index.md)
Go backend providing authentication and encrypted vault storage.

### [Extension](./extension/index.md)
Chrome/Edge browser extension with autofill, password generation, and vault sync.

### [Security](./security.md)
Detailed security architecture and implementation details.

## Quick Start

1. Set up the server: [Server Setup](./server/index.md#getting-started)
2. Build the extension: [Extension Setup](./extension/index.md#getting-started)
3. Connect extension to server and start using your vault

## Features

| Feature | Description |
|---------|-------------|
| Zero-knowledge encryption | AES-256-GCM with PBKDF2 (600k iterations) |
| Autofill | Detects login forms and fills credentials |
| Save prompts | Asks to save credentials after login |
| Password generator | Configurable length and charset |
| Browser migration | Import from Chrome, Firefox, Safari, Edge, Bitwarden, 1Password, LastPass |
| Vault sync | Encrypted vault synced with self-hosted instance |
| Local search | Fast search across all vault entries |

## License

See project root license file.
