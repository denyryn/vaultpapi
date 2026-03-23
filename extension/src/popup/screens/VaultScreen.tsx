import React, { useState, useEffect, useRef } from "react";
import { VaultAPIClient, VaultEntry } from "../../lib/api";
import { VaultService } from "../../lib/vault";
import { session, local } from "../../lib/storage";
import { generatePassword, passwordStrength } from "../../lib/crypto";
import { copyToClipboard, getFaviconUrl, parseBrowserPasswordsCSV, timeAgo } from "../../lib/utils";
import { EntryDetail } from "../components/EntryDetail";
import { AddEntryModal } from "../components/AddEntryModal";
import { GeneratorPanel } from "../components/GeneratorPanel";
import { MigrateModal } from "../components/MigrateModal";

interface Props {
  onLogout: () => void;
}

type ActiveTab = "vault" | "generator" | "settings";

export function VaultScreen({ onLogout }: Props) {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<VaultEntry | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMigrateModal, setShowMigrateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("vault");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [vaultSvc, setVaultSvc] = useState<VaultService | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [instanceUrl, setInstanceUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    try {
      const sessionData = await session.get();
      const config = await local.get();

      if (!sessionData.token || !sessionData.masterPassword || !config.instanceUrl) {
        onLogout();
        return;
      }

      setUserEmail(sessionData.userEmail || config.userEmail || "");
      setInstanceUrl(config.instanceUrl);

      const client = new VaultAPIClient(config.instanceUrl, sessionData.token);
      const svc = new VaultService(client, sessionData.masterPassword);

      // Try cache first for instant load
      const cached = await svc.loadFromCache();
      if (cached) {
        setEntries(cached.entries);
        setLoading(false);
      }

      // Then sync from server
      const fresh = await svc.load();
      setEntries(fresh.entries);
      setVaultSvc(svc);
      setLoading(false);
    } catch (e: unknown) {
      const err = e as Error;
      if (err.message === "vault_not_found") {
        // First time - create vault
        setEntries([]);
        setLoading(false);
      } else if (err.message?.includes("token") || err.message?.includes("expired")) {
        onLogout();
      } else {
        setError("Failed to load vault. Check your connection.");
        setLoading(false);
      }
    }
  }

  async function handleSync() {
    if (!vaultSvc || syncing) return;
    setSyncing(true);
    try {
      const fresh = await vaultSvc.load();
      setEntries(fresh.entries);
    } catch {
      setError("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleLogout() {
    chrome.runtime.sendMessage({ type: "LOGOUT" });
    await session.clear();
    onLogout();
  }

  async function handleCopy(text: string, id: string) {
    await copyToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function handleDeleteEntry(id: string) {
    if (!vaultSvc) return;
    await vaultSvc.deleteEntry(id);
    setEntries(vaultSvc.getEntries());
    setSelectedEntry(null);
  }

  async function handleUpdateEntry(id: string, updates: Partial<VaultEntry>) {
    if (!vaultSvc) return;
    await vaultSvc.updateEntry(id, updates);
    setEntries(vaultSvc.getEntries());
    const updated = vaultSvc.getEntries().find((e) => e.id === id);
    if (updated) setSelectedEntry(updated);
  }

  async function handleAddEntry(entry: Omit<VaultEntry, "id" | "created_at" | "updated_at">) {
    if (!vaultSvc) return;
    const newEntry = await vaultSvc.addEntry(entry);
    setEntries(vaultSvc.getEntries());
    setShowAddModal(false);
    setSelectedEntry(newEntry);
  }

  async function handleMigrateImport(csv: string): Promise<number> {
    if (!vaultSvc) return 0;
    const parsed = parseBrowserPasswordsCSV(csv);
    const count = await vaultSvc.importEntries(parsed);
    setEntries(vaultSvc.getEntries());
    return count;
  }

  const filtered = entries.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      e.username.toLowerCase().includes(q) ||
      e.url?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: 560,
          background: "#050505",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            border: "2px solid #1a1a1a",
            borderTop: "2px solid #fff",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <div style={{ fontSize: 12, color: "#333" }}>Decrypting vault...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (selectedEntry) {
    return (
      <EntryDetail
        entry={selectedEntry}
        onBack={() => setSelectedEntry(null)}
        onDelete={handleDeleteEntry}
        onUpdate={handleUpdateEntry}
        onCopy={handleCopy}
        copiedId={copiedId}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: 560,
        background: "#050505",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px 0",
          borderBottom: "1px solid #111",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div
              style={{
                width: 24,
                height: 24,
                background: "#fff",
                borderRadius: 5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#000"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                letterSpacing: "-0.02em",
              }}
            >
              VaultPAPI
            </span>
            <span
              style={{
                fontSize: 10,
                color: "#2a2a2a",
                background: "#111",
                border: "1px solid #1a1a1a",
                borderRadius: 4,
                padding: "1px 5px",
              }}
            >
              {entries.length}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {/* Sync */}
            <IconButton
              title="Sync"
              onClick={handleSync}
              spinning={syncing}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  animation: syncing ? "spin 1s linear infinite" : "none",
                }}
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </IconButton>

            {/* Add */}
            <IconButton title="Add entry" onClick={() => setShowAddModal(true)}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </IconButton>

            {/* Logout */}
            <IconButton title="Sign out" onClick={handleLogout}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </IconButton>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 0 }}>
          {([["vault", "Vault"], ["generator", "Generator"], ["settings", "Settings"]] as [ActiveTab, string][]).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: "none",
                border: "none",
                borderBottom: `2px solid ${activeTab === tab ? "#fff" : "transparent"}`,
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? "#fff" : "#444",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
                marginBottom: -1,
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* Content */}
      {activeTab === "vault" && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          {/* Search */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #0e0e0e" }}>
            <div style={{ position: "relative" }}>
              <svg
                style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vault..."
                style={{
                  width: "100%",
                  background: "#0a0a0a",
                  border: "1px solid #141414",
                  borderRadius: 7,
                  padding: "8px 8px 8px 32px",
                  fontSize: 12,
                  color: "#fff",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#444",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: 12,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Entry list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {error && (
              <div
                style={{
                  margin: 12,
                  padding: "10px 12px",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.15)",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#ef4444",
                }}
              >
                {error}
              </div>
            )}

            {filtered.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  gap: 12,
                  padding: 24,
                }}
              >
                {search ? (
                  <>
                    <div style={{ fontSize: 13, color: "#333" }}>No results for "{search}"</div>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        background: "#0e0e0e",
                        border: "1px solid #1a1a1a",
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#333"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
                        Your vault is empty
                      </div>
                      <div style={{ fontSize: 12, color: "#444" }}>
                        Add your first password or migrate from your browser
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => setShowAddModal(true)}
                        style={{
                          background: "#fff",
                          color: "#000",
                          border: "none",
                          borderRadius: 6,
                          padding: "8px 14px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Add entry
                      </button>
                      <button
                        onClick={() => setShowMigrateModal(true)}
                        style={{
                          background: "#111",
                          color: "#888",
                          border: "1px solid #1a1a1a",
                          borderRadius: 6,
                          padding: "8px 14px",
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Import from browser
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div>
                {filtered.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    onSelect={() => setSelectedEntry(entry)}
                    onCopyPassword={() => handleCopy(entry.password, `pw-${entry.id}`)}
                    copied={copiedId === `pw-${entry.id}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer bar */}
          {entries.length > 0 && (
            <div
              style={{
                borderTop: "1px solid #0e0e0e",
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontSize: 10, color: "#333" }}>
                {filtered.length} of {entries.length} entries
              </div>
              <button
                onClick={() => setShowMigrateModal(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#333",
                  fontSize: 10,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Import from browser
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "generator" && <GeneratorPanel />}
      {activeTab === "settings" && (
        <SettingsTab
          userEmail={userEmail}
          instanceUrl={instanceUrl}
          onLogout={handleLogout}
          onSwitchSetup={() => {
            local.clear();
            session.clear();
            onLogout();
          }}
        />
      )}

      {/* Modals */}
      {showAddModal && (
        <AddEntryModal
          onAdd={handleAddEntry}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showMigrateModal && (
        <MigrateModal
          onImport={handleMigrateImport}
          onClose={() => setShowMigrateModal(false)}
        />
      )}
    </div>
  );
}

// Entry row component
function EntryRow({
  entry,
  onSelect,
  onCopyPassword,
  copied,
}: {
  entry: VaultEntry;
  onSelect: () => void;
  onCopyPassword: () => void;
  copied: boolean;
}) {
  const favicon = entry.url ? getFaviconUrl(entry.url) : null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "9px 12px",
        gap: 10,
        cursor: "pointer",
        borderBottom: "1px solid #0a0a0a",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#0a0a0a")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
      onClick={onSelect}
    >
      {/* Favicon / Avatar */}
      <div
        style={{
          width: 30,
          height: 30,
          background: "#0e0e0e",
          border: "1px solid #1a1a1a",
          borderRadius: 7,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          fontSize: 11,
          fontWeight: 700,
          color: "#444",
        }}
      >
        {favicon ? (
          <img
            src={favicon}
            width={16}
            height={16}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          entry.title.charAt(0).toUpperCase()
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "#fff",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginBottom: 2,
          }}
        >
          {entry.title}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#444",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {entry.username}
        </div>
      </div>

      {/* Quick copy */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCopyPassword();
        }}
        title="Copy password"
        style={{
          background: "none",
          border: "none",
          color: copied ? "#22c55e" : "#333",
          cursor: "pointer",
          padding: 4,
          display: "flex",
          alignItems: "center",
          transition: "color 0.15s",
          flexShrink: 0,
        }}
      >
        {copied ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        )}
      </button>
    </div>
  );
}

// Settings tab
function SettingsTab({
  userEmail,
  instanceUrl,
  onLogout,
  onSwitchSetup,
}: {
  userEmail: string;
  instanceUrl: string;
  onLogout: () => void;
  onSwitchSetup: () => void;
}) {
  const domain = (() => {
    try {
      return new URL(instanceUrl).hostname;
    } catch {
      return instanceUrl;
    }
  })();

  return (
    <div style={{ padding: "16px 16px", overflowY: "auto", flex: 1 }}>
      {/* Account */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "#333",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Account
        </div>
        <div
          style={{
            background: "#0a0a0a",
            border: "1px solid #141414",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <SettingsRow label="Email" value={userEmail} />
          <SettingsRow label="Instance" value={domain} />
        </div>
      </div>

      {/* Security */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "#333",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Security
        </div>
        <div
          style={{
            background: "#0a0a0a",
            border: "1px solid #141414",
            borderRadius: 8,
            padding: "12px",
            fontSize: 12,
            color: "#444",
            lineHeight: 1.6,
          }}
        >
          <div style={{ marginBottom: 6, color: "#555" }}>🔒 Zero-knowledge architecture</div>
          <div style={{ fontSize: 11 }}>
            Your vault is encrypted with AES-256-GCM using a key derived from your master password via PBKDF2 (600,000 iterations). The server never receives your master password or plaintext data.
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={onSwitchSetup}
          style={{
            background: "#0a0a0a",
            color: "#888",
            border: "1px solid #141414",
            borderRadius: 8,
            padding: "11px 14px",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "inherit",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
          </svg>
          Change instance URL
        </button>
        <button
          onClick={onLogout}
          style={{
            background: "rgba(239,68,68,0.06)",
            color: "#ef4444",
            border: "1px solid rgba(239,68,68,0.12)",
            borderRadius: 8,
            padding: "11px 14px",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "inherit",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        borderBottom: "1px solid #0e0e0e",
      }}
    >
      <div style={{ fontSize: 12, color: "#555" }}>{label}</div>
      <div style={{ fontSize: 12, color: "#fff", fontFamily: "'Geist Mono', monospace" }}>
        {value}
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  title,
  spinning,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  spinning?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: "none",
        border: "1px solid transparent",
        borderRadius: 6,
        width: 28,
        height: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#555",
        cursor: "pointer",
        transition: "all 0.1s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "#111";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "#1e1e1e";
        (e.currentTarget as HTMLButtonElement).style.color = "#fff";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "none";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
        (e.currentTarget as HTMLButtonElement).style.color = "#555";
      }}
    >
      {children}
    </button>
  );
}
