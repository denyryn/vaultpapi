# Security Architecture

VaultPAPI implements a zero-knowledge architecture designed with the assumption that the server can be compromised. All sensitive operations occur client-side.

## Core Principles

1. **Zero-Knowledge**: Server never sees plaintext passwords or vault contents
2. **Minimal Trust**: Assume server can be compromised; design for worst case
3. **Explicitness**: No hidden behavior, no reflection, no magic
4. **Safe Practices**: No panic, always return (T, error), handle all errors
5. **Dependency Minimization**: Prefer standard library, justify external deps

## Extension Security

### Vault Encryption

| Concern | Approach |
|---------|----------|
| Vault encryption | AES-256-GCM, key derived via PBKDF2-SHA256 (600k iters, 32-byte salt) |
| Master password storage | `chrome.storage.session` only — cleared when browser closes, never written to disk |
| JWT token | `chrome.storage.session` — in-memory, same lifetime as browser session |
| Instance URL / email | `chrome.storage.local` — non-sensitive config only |
| Autofill injection | Uses native input setter to trigger React/framework events correctly |
| Clipboard | Web Crypto API `clipboard.writeText`, fallback `execCommand` |
| CSV import | Parsed entirely client-side, file never sent anywhere |

### Storage Scope

```
chrome.storage.session   ← token, masterPassword, cachedVaultBlob
                            (cleared on browser close)

chrome.storage.local     ← instanceUrl, userEmail
                            (persistent, non-sensitive)
```

## Server Security

### Password Hashing (Server-side)

- Argon2id with strong parameters:
  - Memory: 64MB
  - Iterations: 3
  - Parallelism: 4
  - Key length: 32 bytes
  - Salt: 16 bytes (randomly generated)

### JWT Tokens

- Algorithm: HMAC-SHA256
- Default expiry: 24 hours
- Claims: user_id, email, iat, exp, iss

### Rate Limiting

- Configurable requests per time window
- Default: 100 requests per minute per IP
- Automatic cleanup of expired entries

### Request Validation

- Maximum request size: 1MB (configurable)
- Strict email validation
- Password strength requirements:
  - Minimum 12 characters
  - Maximum 128 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one digit
  - At least one special character

### Security Headers

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Cache-Control: no-store`

### Timing Attack Prevention

- Constant-time password comparison
- Deliberate delay on failed login attempts
- Constant-time email existence check

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Extension)                       │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │ Master      │───▶│ PBKDF2       │───▶│ AES-256-GCM   │  │
│  │ Password    │    │ (600k iters) │    │ Encryption    │  │
│  └─────────────┘    └──────────────┘    └───────────────┘  │
│                                                  │          │
└──────────────────────────────────────────────────┼──────────┘
                                                   │
                              Encrypted blob sent to server │
                                                   ▼
┌─────────────────────────────────────────────────────────────┐
│                     Server                                  │
│  Stores ONLY encrypted data - never sees plaintext          │
└─────────────────────────────────────────────────────────────┘
```

## Threat Model

### Protected Against

- Server database compromise (vault data encrypted)
- Network eavesdropping (TLS + encrypted payload)
- Brute force (high-iteration key derivation)
- Rainbow tables (unique per-user salt)

### Not Protected Against

- Compromised client device (master password in memory)
- Keylogger/malware on client
- Phishing attacks
- Compromised browser extension
