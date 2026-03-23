import React, { useState } from "react";
import { VaultEntry } from "../../lib/api";
import { getFaviconUrl, timeAgo } from "../../lib/utils";
import { passwordStrength } from "../../lib/crypto";

interface Props {
  entry: VaultEntry;
  onBack: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<VaultEntry>) => void;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
}

export function EntryDetail({ entry, onBack, onDelete, onUpdate, onCopy, copiedId }: Props) {
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editTitle, setEditTitle] = useState(entry.title);
  const [editUsername, setEditUsername] = useState(entry.username);
  const [editPassword, setEditPassword] = useState(entry.password);
  const [editUrl, setEditUrl] = useState(entry.url || "");
  const [editNotes, setEditNotes] = useState(entry.notes || "");
  const [saving, setSaving] = useState(false);

  const favicon = entry.url ? getFaviconUrl(entry.url) : null;
  const strength = passwordStrength(entry.password);

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdate(entry.id, {
        title: editTitle,
        username: editUsername,
        password: editPassword,
        url: editUrl,
        notes: editNotes,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: 560,
        background: "#050505",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          borderBottom: "1px solid #111",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: "#555",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontFamily: "inherit",
            padding: "4px 0",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {!editing ? (
            <>
              <button
                onClick={() => setEditing(true)}
                style={{
                  background: "#111",
                  border: "1px solid #1a1a1a",
                  borderRadius: 6,
                  padding: "5px 10px",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#888",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Edit
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#333",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditTitle(entry.title);
                  setEditUsername(entry.username);
                  setEditPassword(entry.password);
                  setEditUrl(entry.url || "");
                  setEditNotes(entry.notes || "");
                }}
                style={{
                  background: "none",
                  border: "1px solid #1a1a1a",
                  borderRadius: 6,
                  padding: "5px 10px",
                  fontSize: 11,
                  color: "#555",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "5px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#000",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px" }}>
        {/* Title / icon */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 44,
              height: 44,
              background: "#0e0e0e",
              border: "1px solid #1a1a1a",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              fontSize: 16,
              fontWeight: 700,
              color: "#333",
              flexShrink: 0,
            }}
          >
            {favicon ? (
              <img src={favicon} width={20} height={20} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              entry.title.charAt(0).toUpperCase()
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={{
                  width: "100%",
                  background: "#0e0e0e",
                  border: "1px solid #2a2a2a",
                  borderRadius: 6,
                  padding: "6px 10px",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#fff",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            ) : (
              <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", letterSpacing: "-0.02em" }}>
                {entry.title}
              </div>
            )}
            <div style={{ fontSize: 11, color: "#333", marginTop: 2 }}>
              Updated {timeAgo(entry.updated_at)}
            </div>
          </div>
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <DetailField
            label="Username"
            value={editing ? editUsername : entry.username}
            editing={editing}
            onChange={setEditUsername}
            onCopy={() => onCopy(entry.username, `un-${entry.id}`)}
            copied={copiedId === `un-${entry.id}`}
            monospace
          />

          {/* Password field with strength */}
          <div
            style={{
              background: "#0a0a0a",
              border: "1px solid #111",
              borderRadius: 8,
              padding: "10px 12px",
              marginBottom: 2,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#333", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Password
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: "none", border: "none", color: "#444", cursor: "pointer", padding: 2, display: "flex" }}
                >
                  {showPassword ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => onCopy(entry.password, `pw-${entry.id}`)}
                  style={{ background: "none", border: "none", color: copiedId === `pw-${entry.id}` ? "#22c55e" : "#444", cursor: "pointer", padding: 2, display: "flex", transition: "color 0.15s" }}
                >
                  {copiedId === `pw-${entry.id}` ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {editing ? (
              <input
                type="text"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                style={{
                  width: "100%",
                  background: "#111",
                  border: "1px solid #2a2a2a",
                  borderRadius: 5,
                  padding: "6px 8px",
                  fontSize: 12,
                  color: "#fff",
                  outline: "none",
                  fontFamily: "'Geist Mono', monospace",
                }}
              />
            ) : (
              <div
                style={{
                  fontSize: 13,
                  color: "#fff",
                  fontFamily: "'Geist Mono', monospace",
                  letterSpacing: "0.05em",
                  wordBreak: "break-all",
                }}
              >
                {showPassword ? entry.password : "•".repeat(Math.min(entry.password.length, 24))}
              </div>
            )}
            {/* Strength bar */}
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 2, background: "#1a1a1a", borderRadius: 1, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${strength.score}%`,
                    background: strength.color,
                    borderRadius: 1,
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <div style={{ fontSize: 10, color: strength.color, fontWeight: 600, minWidth: 40, textAlign: "right" }}>
                {strength.label}
              </div>
            </div>
          </div>

          <DetailField
            label="URL"
            value={editing ? editUrl : (entry.url || "—")}
            editing={editing}
            onChange={setEditUrl}
            link={!editing && !!entry.url}
            url={entry.url}
          />

          <DetailField
            label="Notes"
            value={editing ? editNotes : (entry.notes || "—")}
            editing={editing}
            onChange={setEditNotes}
            multiline
          />
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 10,
          }}
        >
          <div
            style={{
              background: "#0a0a0a",
              border: "1px solid #1a1a1a",
              borderRadius: 12,
              padding: 20,
              width: "100%",
              maxWidth: 280,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 8 }}>
              Delete entry?
            </div>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
              This will permanently remove <strong style={{ color: "#888" }}>{entry.title}</strong> from your vault.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => onDelete(entry.id)}
                style={{
                  flex: 1,
                  background: "rgba(239,68,68,0.15)",
                  color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 6,
                  padding: "8px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  flex: 1,
                  background: "#111",
                  color: "#888",
                  border: "1px solid #1a1a1a",
                  borderRadius: 6,
                  padding: "8px",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailField({
  label,
  value,
  editing,
  onChange,
  onCopy,
  copied,
  monospace,
  multiline,
  link,
  url,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange?: (v: string) => void;
  onCopy?: () => void;
  copied?: boolean;
  monospace?: boolean;
  multiline?: boolean;
  link?: boolean;
  url?: string;
}) {
  return (
    <div
      style={{
        background: "#0a0a0a",
        border: "1px solid #111",
        borderRadius: 8,
        padding: "10px 12px",
        marginBottom: 2,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#333", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {label}
        </div>
        {onCopy && (
          <button
            onClick={onCopy}
            style={{ background: "none", border: "none", color: copied ? "#22c55e" : "#333", cursor: "pointer", padding: 2, display: "flex", transition: "color 0.15s" }}
          >
            {copied ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            )}
          </button>
        )}
        {link && url && (
          <a href={url} target="_blank" rel="noreferrer"
            style={{ color: "#333", display: "flex", textDecoration: "none" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        )}
      </div>
      {editing && onChange ? (
        multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              background: "#111",
              border: "1px solid #2a2a2a",
              borderRadius: 5,
              padding: "6px 8px",
              fontSize: 12,
              color: "#fff",
              outline: "none",
              fontFamily: "inherit",
              resize: "none",
            }}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: "100%",
              background: "#111",
              border: "1px solid #2a2a2a",
              borderRadius: 5,
              padding: "6px 8px",
              fontSize: 12,
              color: "#fff",
              outline: "none",
              fontFamily: monospace ? "'Geist Mono', monospace" : "inherit",
            }}
          />
        )
      ) : (
        <div
          style={{
            fontSize: 13,
            color: value === "—" ? "#333" : "#fff",
            fontFamily: monospace ? "'Geist Mono', monospace" : "inherit",
            wordBreak: "break-all",
          }}
        >
          {value}
        </div>
      )}
    </div>
  );
}
