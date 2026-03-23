// Client-side cryptography for zero-knowledge vault
// The server NEVER sees plaintext - all encryption/decryption happens here
// Uses Web Crypto API (available in extension contexts)

const PBKDF2_ITERATIONS = 600_000; // OWASP 2023 recommendation
const SALT_LENGTH = 32; // bytes
const IV_LENGTH = 12; // bytes for AES-GCM
const KEY_LENGTH = 256; // bits

export interface EncryptedVault {
  // Base64-encoded ciphertext
  ciphertext: string;
  // Base64-encoded IV
  iv: string;
  // Base64-encoded salt (for key derivation)
  salt: string;
  // PBKDF2 iteration count (for future upgrades)
  iterations: number;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer.buffer;
}

// Derive an AES-256-GCM key from the master password using PBKDF2
async function deriveKey(
  masterPassword: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt vault data with the master password
export async function encryptVault(
  data: unknown,
  masterPassword: string
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(masterPassword, salt);

  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(data));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );

  const vault: EncryptedVault = {
    ciphertext: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv.buffer),
    salt: bufferToBase64(salt.buffer),
    iterations: PBKDF2_ITERATIONS,
  };

  // Encode the entire envelope as base64 for transport to server
  return btoa(JSON.stringify(vault));
}

// Decrypt vault data with the master password
export async function decryptVault<T>(
  encryptedBlob: string,
  masterPassword: string
): Promise<T> {
  const vault: EncryptedVault = JSON.parse(atob(encryptedBlob));

  const salt = new Uint8Array(base64ToBuffer(vault.salt));
  const iv = new Uint8Array(base64ToBuffer(vault.iv));
  const ciphertext = base64ToBuffer(vault.ciphertext);

  const key = await deriveKey(masterPassword, salt);

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(plaintext)) as T;
}

// Generate a strong random password
export function generatePassword(options: {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
  special: boolean;
}): string {
  const charsets: string[] = [];
  if (options.uppercase) charsets.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  if (options.lowercase) charsets.push("abcdefghijklmnopqrstuvwxyz");
  if (options.digits) charsets.push("0123456789");
  if (options.special) charsets.push("!@#$%^&*()-_=+[]{}|;:,.<>?");

  if (charsets.length === 0) charsets.push("abcdefghijklmnopqrstuvwxyz");

  const allChars = charsets.join("");
  const randomValues = crypto.getRandomValues(new Uint32Array(options.length));

  // Ensure at least one character from each required charset
  const result: string[] = [];
  for (const charset of charsets) {
    const idx = crypto.getRandomValues(new Uint32Array(1))[0] % charset.length;
    result.push(charset[idx]);
  }

  // Fill the rest randomly
  for (let i = result.length; i < options.length; i++) {
    result.push(allChars[randomValues[i] % allChars.length]);
  }

  // Fisher-Yates shuffle using crypto random values
  const shuffleValues = crypto.getRandomValues(new Uint32Array(result.length));
  for (let i = result.length - 1; i > 0; i--) {
    const j = shuffleValues[i] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join("");
}

// Calculate password strength score (0-100)
export function passwordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;

  if (password.length >= 12) score += 20;
  if (password.length >= 16) score += 10;
  if (password.length >= 20) score += 10;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[a-z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;

  // Penalize common patterns
  if (/(.)\1{2,}/.test(password)) score -= 10; // repeated chars
  if (/^[a-zA-Z]+$/.test(password)) score -= 10; // letters only
  if (/^[0-9]+$/.test(password)) score -= 20; // digits only

  score = Math.max(0, Math.min(100, score));

  if (score < 30) return { score, label: "Weak", color: "#ef4444" };
  if (score < 60) return { score, label: "Fair", color: "#f59e0b" };
  if (score < 80) return { score, label: "Good", color: "#84cc16" };
  return { score, label: "Strong", color: "#22c55e" };
}
