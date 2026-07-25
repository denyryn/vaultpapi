// Storage abstraction for Chrome extension
// Uses chrome.storage.session for sensitive in-memory data (cleared on browser close)
// Uses chrome.storage.local for non-sensitive persistent data

import browser from 'webextension-polyfill';

export interface SessionData {
  token: string;
  masterPassword: string; // held in session only, never persisted
  userEmail: string;
  userId: string;
  vaultVersion: number;
  pendingSave?: {
    username: string;
    password: string;
    url: string;
    domain: string;
  };
}

export interface PersistentConfig {
  instanceUrl: string;
  userEmail: string;
  // Token stored here for re-auth checks, masterPassword NEVER stored
  hasAccount: boolean;
}

// SESSION storage (cleared when browser closes - for sensitive data)
export const session = {
  async get(): Promise<Partial<SessionData>> {
    const items = await browser.storage.session.get(null);
    return items as Partial<SessionData>;
  },

  async set(data: Partial<SessionData>): Promise<void> {
    await browser.storage.session.set(data);
  },

  async clear(): Promise<void> {
    await browser.storage.session.clear();
  },

  async getToken(): Promise<string | null> {
    const data = await session.get();
    return data.token ?? null;
  },

  async getMasterPassword(): Promise<string | null> {
    const data = await session.get();
    return data.masterPassword ?? null;
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await session.getToken();
    return token !== null;
  },
};

// LOCAL storage (persistent - for non-sensitive config)
export const local = {
  async get(): Promise<Partial<PersistentConfig>> {
    const items = await browser.storage.local.get(null);
    return items as Partial<PersistentConfig>;
  },

  async set(data: Partial<PersistentConfig>): Promise<void> {
    await browser.storage.local.set(data);
  },

  async clear(): Promise<void> {
    await browser.storage.local.clear();
  },

  async getInstanceUrl(): Promise<string | null> {
    const data = await local.get();
    return data.instanceUrl ?? null;
  },

  async isConfigured(): Promise<boolean> {
    const url = await local.getInstanceUrl();
    return url !== null && url.trim() !== "";
  },
};

// Vault cache in session storage (encrypted blob cached locally to avoid re-fetching)
export const vaultCache = {
  async getEncryptedBlob(): Promise<string | null> {
    const items = await browser.storage.session.get(["cachedVaultBlob"]);
    return (items.cachedVaultBlob as string) ?? null;
  },

  async setEncryptedBlob(blob: string): Promise<void> {
    await browser.storage.session.set({ cachedVaultBlob: blob });
  },

  async clear(): Promise<void> {
    await browser.storage.session.remove(["cachedVaultBlob"]);
  },
};
