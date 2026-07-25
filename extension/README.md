# VaultPAPI Extension

A Chrome/Edge/Firefox/Zen browser extension for [VaultPAPI](../server) — the self-hosted, zero-knowledge password manager.

## Features

- 🔒 **Zero-knowledge encryption** — AES-256-GCM with PBKDF2 key derivation (600k iterations). The server never sees your master password or plaintext data.
- 🔐 **Autofill** — Detects login forms and offers to fill saved credentials
- 💾 **Save prompt** — Asks to save credentials after you log in to a site
- 🔑 **Password generator** — Configurable length, charset, with strength meter
- 📥 **Browser migration** — Import from Chrome, Firefox, Safari, Edge, Bitwarden, 1Password, LastPass CSV exports
- 🔄 **Vault sync** — Syncs encrypted vault with your self-hosted instance
- 🔍 **Search** — Fast local search across all vault entries

## Architecture

```
src/
├── popup/                    # React popup UI (400×560px)
│   ├── screens/
│   │   ├── SetupScreen.tsx   # Instance URL configuration
│   │   ├── AuthScreen.tsx    # Login / Register
│   │   └── VaultScreen.tsx   # Main vault (list, search, tabs)
│   └── components/
│       ├── EntryDetail.tsx   # View/edit/delete an entry
│       ├── AddEntryModal.tsx # Add new entry
│       ├── GeneratorPanel.tsx # Password generator
│       └── MigrateModal.tsx  # Browser import wizard
├── content/
│   └── content.ts            # Injected: autofill, save prompts
├── background/
│   └── background.ts         # Service worker: vault cache, message bus
└── lib/
    ├── api.ts                # VaultPAPI HTTP client
    ├── crypto.ts             # AES-256-GCM, PBKDF2, password gen/strength
    ├── storage.ts            # chrome.storage.session / .local abstraction
    ├── vault.ts              # VaultService — CRUD + encrypt/decrypt
    └── utils.ts              # CSV parser, clipboard, misc
```

## Security Design

| Concern | Approach |
|---|---|
| Vault encryption | AES-256-GCM, key derived via PBKDF2-SHA256 (600k iters, 32-byte salt) |
| Master password storage | `chrome.storage.session` only — cleared when browser closes, never written to disk |
| JWT token | `chrome.storage.session` — in-memory, same lifetime as browser session |
| Instance URL / email | `chrome.storage.local` — non-sensitive config only |
| Autofill injection | Uses native input setter to trigger React/framework events correctly |
| Clipboard | Web Crypto API `clipboard.writeText`, fallback `execCommand` |
| CSV import | Parsed entirely client-side, file never sent anywhere |

### Storage scope

```
chrome.storage.session   ← token, masterPassword, cachedVaultBlob
                            (cleared on browser close)

chrome.storage.local     ← instanceUrl, userEmail
                            (persistent, non-sensitive)
```

## Getting Started

### Prerequisites

- Node.js 18+
- A running [VaultPAPI server](../server/README.md)

### Build

**Chrome/Edge:**
```bash
npm install
npm run build
```

Output is in `dist/`.

**Firefox/Zen:**
```bash
npm install
npm run build:firefox
```

Output is in `dist-firefox/`.

### Load in Chrome/Edge

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` directory

### Load in Firefox/Zen

1. Build Firefox version: `npm run build:firefox`
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**
4. Select `dist-firefox/manifest.json`

Output is in `dist-firefox/`.

### Development (watch mode)

```bash
npm run dev
```

Vite rebuilds on every file change. Reload the extension in `chrome://extensions` or `about:debugging` after each build.

## First-time Setup

1. Click the VaultPAPI icon in the toolbar
2. Enter your instance URL (e.g. `https://vault.yourdomain.com` or `http://localhost:30144`)
3. Click **Connect** — the extension health-checks the server
4. **Register** a new account or **Sign in** to an existing one
5. Your vault is created and encrypted immediately

## Importing from Browser

1. Export passwords from your browser as CSV:
   - **Chrome/Edge**: `chrome://password-manager/settings` → Export
   - **Firefox**: Menu → Passwords → ⋯ → Export Logins
   - **Safari**: Preferences → Passwords → ⋯ → Export All Passwords
2. In the extension: Vault tab → "Import from browser" (bottom bar)
3. Follow the wizard — drop or select the CSV
4. **Delete the CSV file** from your machine immediately after

Supported CSV formats: Chrome, Edge, Firefox, Safari, Bitwarden, 1Password, LastPass.

## Autofill & Save Prompt

The content script runs on all pages and:

- **Detects password fields** — shows a VaultPAPI autofill dropdown when you focus a password input, if matching entries exist
- **Detects form submissions** — after logging in somewhere new, shows a "Save password?" prompt in the top-right corner

The save prompt only appears if:
1. You are authenticated
2. The submitted username doesn't already exist in your vault for that domain

## Configuration

No config files needed. All settings live in the extension storage:

| Setting | Where | Description |
|---|---|---|
| Instance URL | `chrome.storage.local` | Your VaultPAPI server URL |
| Email | `chrome.storage.local` | Remembered for the login form |
| Auth token | `chrome.storage.session` | JWT, cleared on browser close |
| Master password | `chrome.storage.session` | Encryption key, never persisted |

## CORS

Your VaultPAPI server must allow requests from the extension origin. Add to your server config:

```
Access-Control-Allow-Origin: chrome-extension://<your-extension-id>
```

Or for development, allow all origins. The extension ID is shown in `chrome://extensions`.

## License

See project root license file.
