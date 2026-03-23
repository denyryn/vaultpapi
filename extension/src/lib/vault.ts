// Vault service - manages the local vault state
// Handles encrypting/decrypting and syncing with the server

import { VaultAPIClient, VaultEntry, VaultData } from "./api";
import { encryptVault, decryptVault } from "./crypto";
import { vaultCache, session } from "./storage";
import { generateId } from "./utils";

export class VaultService {
  private client: VaultAPIClient;
  private masterPassword: string;
  private vault: VaultData | null = null;
  private currentVersion: number = 1;

  constructor(client: VaultAPIClient, masterPassword: string) {
    this.client = client;
    this.masterPassword = masterPassword;
  }

  // Load and decrypt vault from server
  async load(): Promise<VaultData> {
    const serverVault = await this.client.getVault();
    this.currentVersion = serverVault.version;

    // Cache encrypted blob in session
    await vaultCache.setEncryptedBlob(serverVault.encrypted_blob);

    // Decrypt
    const decrypted = await decryptVault<VaultData>(
      serverVault.encrypted_blob,
      this.masterPassword
    );
    this.vault = decrypted;
    return this.vault;
  }

  // Load from session cache (faster, no network)
  async loadFromCache(): Promise<VaultData | null> {
    const blob = await vaultCache.getEncryptedBlob();
    if (!blob) return null;

    try {
      const decrypted = await decryptVault<VaultData>(
        blob,
        this.masterPassword
      );
      this.vault = decrypted;
      return this.vault;
    } catch {
      return null;
    }
  }

  // Save vault to server (encrypt first)
  async save(): Promise<void> {
    if (!this.vault) throw new Error("no_vault_loaded");

    const encrypted = await encryptVault(this.vault, this.masterPassword);
    const result = await this.client.saveVault(encrypted, this.currentVersion);

    this.currentVersion = result.version;
    await vaultCache.setEncryptedBlob(result.encrypted_blob);
  }

  getEntries(): VaultEntry[] {
    return this.vault?.entries ?? [];
  }

  // Find entries matching a URL/hostname
  findForUrl(url: string): VaultEntry[] {
    if (!this.vault) return [];

    try {
      const hostname = new URL(url).hostname.replace(/^www\./, "");
      return this.vault.entries.filter((e) => {
        if (!e.url) return false;
        try {
          const entryHost = new URL(
            e.url.startsWith("http") ? e.url : `https://${e.url}`
          ).hostname.replace(/^www\./, "");
          return entryHost === hostname || entryHost.endsWith(`.${hostname}`);
        } catch {
          return false;
        }
      });
    } catch {
      return [];
    }
  }

  async addEntry(
    entry: Omit<VaultEntry, "id" | "created_at" | "updated_at">
  ): Promise<VaultEntry> {
    if (!this.vault) this.vault = { entries: [], version: 1 };

    const now = Date.now();
    const newEntry: VaultEntry = {
      ...entry,
      id: generateId(),
      created_at: now,
      updated_at: now,
    };

    this.vault.entries.push(newEntry);
    await this.save();
    return newEntry;
  }

  async updateEntry(
    id: string,
    updates: Partial<Omit<VaultEntry, "id" | "created_at">>
  ): Promise<void> {
    if (!this.vault) throw new Error("no_vault_loaded");

    const idx = this.vault.entries.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error("entry_not_found");

    this.vault.entries[idx] = {
      ...this.vault.entries[idx],
      ...updates,
      updated_at: Date.now(),
    };
    await this.save();
  }

  async deleteEntry(id: string): Promise<void> {
    if (!this.vault) throw new Error("no_vault_loaded");
    this.vault.entries = this.vault.entries.filter((e) => e.id !== id);
    await this.save();
  }

  // Import entries in bulk (used for browser migration)
  async importEntries(
    entries: Omit<VaultEntry, "id" | "created_at" | "updated_at">[]
  ): Promise<number> {
    if (!this.vault) this.vault = { entries: [], version: 1 };

    const now = Date.now();
    let imported = 0;

    for (const entry of entries) {
      // Skip duplicates (same username + URL)
      const isDuplicate = this.vault.entries.some(
        (e) =>
          e.username === entry.username &&
          e.url === entry.url
      );

      if (!isDuplicate) {
        this.vault.entries.push({
          ...entry,
          id: generateId(),
          created_at: now,
          updated_at: now,
        });
        imported++;
      }
    }

    if (imported > 0) await this.save();
    return imported;
  }

  // Initialize an empty vault (first time setup)
  async initializeEmpty(): Promise<void> {
    this.vault = { entries: [], version: 1 };
    await this.save();
  }
}

// Helper to get VaultService from session state
export async function getVaultService(): Promise<VaultService | null> {
  const { token, masterPassword, instanceUrl } = await chrome.storage.session.get([
    "token",
    "masterPassword",
  ]).then((s) => s as { token?: string; masterPassword?: string; instanceUrl?: string });

  const url = await chrome.storage.local
    .get("instanceUrl")
    .then((d) => d.instanceUrl as string | undefined);

  if (!token || !masterPassword || !url) return null;

  const client = new VaultAPIClient(url, token);
  return new VaultService(client, masterPassword);
}
