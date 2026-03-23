// Storage abstraction for Chrome extension
// Uses chrome.storage.session for sensitive in-memory data (cleared on browser close)
// Uses chrome.storage.local for non-sensitive persistent data

export interface SessionData {
  token: string;
  masterPassword: string; // held in session only, never persisted
  userEmail: string;
  userId: string;
  vaultVersion: number;
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
    return new Promise((resolve) => {
      chrome.storage.session.get(null, (items) => {
        resolve(items as Partial<SessionData>);
      });
    });
  },

  async set(data: Partial<SessionData>): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.session.set(data, resolve);
    });
  },

  async clear(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.session.clear(resolve);
    });
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
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (items) => {
        resolve(items as Partial<PersistentConfig>);
      });
    });
  },

  async set(data: Partial<PersistentConfig>): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  },

  async clear(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.clear(resolve);
    });
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
    return new Promise((resolve) => {
      chrome.storage.session.get(["cachedVaultBlob"], (items) => {
        resolve((items.cachedVaultBlob as string) ?? null);
      });
    });
  },

  async setEncryptedBlob(blob: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.session.set({ cachedVaultBlob: blob }, resolve);
    });
  },

  async clear(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.session.remove(["cachedVaultBlob"], resolve);
    });
  },
};
