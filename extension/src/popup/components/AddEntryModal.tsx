import React, { useState } from "react";
import { VaultEntry } from "../../lib/api";
import { generatePassword, passwordStrength } from "../../lib/crypto";

interface Props {
  onAdd: (entry: Omit<VaultEntry, "id" | "created_at" | "updated_at">) => void;
  onClose: () => void;
  prefill?: { url?: string; username?: string; password?: string; title?: string };
}

export function AddEntryModal({ onAdd, onClose, prefill }: Props) {
  const [title, setTitle] = useState(prefill?.title || "");
  const [url, setUrl] = useState(prefill?.url || "");
  const [username, setUsername] = useState(prefill?.username || "");
  const [password, setPassword] = useState(prefill?.password || "");
  const [notes, setNotes] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = passwordStrength(password);

  function handleGenerate() {
    setPassword(
      generatePassword({
        length: 20,
        uppercase: true,
        lowercase: true,
        digits: true,
        special: true,
      })
    );
    setShowPassword(true);
  }

  async function handleSubmit() {
    if (!title.trim()) { setError("Title is required"); return; }
    if (!username.trim()) { setError("Username is required"); return; }
    if (!password.trim()) { setError("Password is required"); return; }

    setSaving(true);
    try {
      await onAdd({ title: title.trim(), username: username.trim(), password, url: url.trim(), notes });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        flexDirection: "column",
        zIndex: 20,
      }}
    >
      <div
        style={{
          flex: 1,
          background: "#050505",
          marginTop: 40,
          borderRadius: "12px 12px 0 0",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid #1a1a1a",
          borderBottom: "none",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid #111",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>New entry</div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#444",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
              padding: 2,
            }}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <FormField label="Title *" value={title} onChange={setTitle} placeholder="Google, GitHub, etc." />
            <FormField label="URL" value={url} onChange={setUrl} placeholder="https://example.com" type="url" />
            <FormField label="Username / Email *" value={username} onChange={setUsername} placeholder="you@example.com" />

            {/* Password field */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#444", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
                Password *
              </label>
              <div style={{ position: "relative", marginBottom: 6 }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  style={{
                    width: "100%",
                    background: "#0e0e0e",
                    border: "1px solid #1e1e1e",
                    borderRadius: 8,
                    padding: "10px 72px 10px 12px",
                    fontSize: 12,
                    color: "#fff",
                    outline: "none",
                    fontFamily: "'Geist Mono', monospace",
                  }}
                />
                <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 4 }}>
                  <button onClick={() => setShowPassword(!showPassword)} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", padding: 2, display: "flex" }}>
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
                  <button onClick={handleGenerate} title="Generate strong password" style={{ background: "none", border: "none", color: "#444", cursor: "pointer", padding: 2, display: "flex" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                    </svg>
                  </button>
                </div>
              </div>
              {password && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 2, background: "#1a1a1a", borderRadius: 1, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${strength.score}%`, background: strength.color, borderRadius: 1, transition: "width 0.3s" }} />
                  </div>
                  <div style={{ fontSize: 10, color: strength.color, fontWeight: 600, minWidth: 40, textAlign: "right" }}>{strength.label}</div>
                </div>
              )}
            </div>

            <FormField label="Notes" value={notes} onChange={setNotes} placeholder="Optional notes..." multiline />
          </div>

          {error && (
            <div style={{ marginTop: 10, fontSize: 12, color: "#ef4444", padding: "8px 10px", background: "rgba(239,68,68,0.08)", borderRadius: 6, border: "1px solid rgba(239,68,68,0.15)" }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #111" }}>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              width: "100%",
              background: saving ? "#111" : "#fff",
              color: saving ? "#444" : "#000",
              border: "none",
              borderRadius: 8,
              padding: "11px",
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {saving ? "Saving..." : "Add to vault"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#444", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          style={{
            width: "100%",
            background: "#0e0e0e",
            border: "1px solid #1e1e1e",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 12,
            color: "#fff",
            outline: "none",
            fontFamily: "inherit",
            resize: "none",
          }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%",
            background: "#0e0e0e",
            border: "1px solid #1e1e1e",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 12,
            color: "#fff",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
      )}
    </div>
  );
}
