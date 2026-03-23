// Background service worker
// Handles: token management, vault sync messages, autofill coordination

import { VaultAPIClient } from "../lib/api";
import { VaultService } from "../lib/vault";
import { session, local } from "../lib/storage";

// Message types between extension components
export type Message =
    | { type: "GET_VAULT_ENTRIES_FOR_URL"; url: string }
    | { type: "GET_FULL_ENTRY"; id: string }
    | {
          type: "SAVE_NEW_ENTRY";
          entry: {
              title: string;
              url: string;
              username: string;
              password: string;
          };
      }
    | { type: "GET_AUTH_STATUS" }
    | { type: "VAULT_UPDATED" }
    | { type: "LOGOUT" };

let vaultService: VaultService | null = null;

async function getOrCreateVaultService(): Promise<VaultService | null> {
    const sessionData = await session.get();
    const config = await local.get();

    if (
        !sessionData.token ||
        !sessionData.masterPassword ||
        !config.instanceUrl
    ) {
        return null;
    }

    if (!vaultService) {
        const client = new VaultAPIClient(
            config.instanceUrl,
            sessionData.token,
        );
        vaultService = new VaultService(client, sessionData.masterPassword);

        const cached = await vaultService.loadFromCache();
        if (!cached) {
            try {
                await vaultService.load();
            } catch {
                vaultService = null;
                return null;
            }
        }
    }

    return vaultService;
}

chrome.runtime.onMessage.addListener(
    (message: Message, _sender, sendResponse) => {
        handleMessage(message)
            .then(sendResponse)
            .catch((err) => {
                sendResponse({ error: err.message || "unknown_error" });
            });
        return true;
    },
);

async function handleMessage(message: Message): Promise<unknown> {
    switch (message.type) {
        case "GET_AUTH_STATUS": {
            const authenticated = await session.isAuthenticated();
            const config = await local.get();
            return {
                authenticated,
                instanceUrl: config.instanceUrl,
                email: config.userEmail,
            };
        }

        case "GET_VAULT_ENTRIES_FOR_URL": {
            const svc = await getOrCreateVaultService();
            if (!svc) return { entries: [] };
            const entries = svc.findForUrl(message.url);
            return { entries };
        }

        case "GET_FULL_ENTRY": {
            const svc = await getOrCreateVaultService();
            if (!svc) return { error: "not_authenticated" };
            const entry = svc.getEntries().find((e) => e.id === message.id);
            if (!entry) return { error: "entry_not_found" };
            return { entry };
        }

        case "SAVE_NEW_ENTRY": {
            const svc = await getOrCreateVaultService();
            if (!svc) return { error: "not_authenticated" };
            const entry = await svc.addEntry({ ...message.entry, notes: "" });
            return { success: true, entry };
        }

        case "VAULT_UPDATED": {
            vaultService = null;
            return { success: true };
        }

        case "LOGOUT": {
            vaultService = null;
            await session.clear();
            return { success: true };
        }

        default:
            return { error: "unknown_message_type" };
    }
}

chrome.storage.session.onChanged.addListener((changes) => {
    if (changes.token || changes.masterPassword) {
        vaultService = null;
    }
});

export {};
