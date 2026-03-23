import React, { useState, useRef } from "react";

interface Props {
  onImport: (csv: string) => Promise<number>;
  onClose: () => void;
}

type Step = "info" | "upload" | "result";

export function MigrateModal({ onImport, onClose }: Props) {
  const [step, setStep] = useState<Step>("info");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      setError("Please select a .csv file exported from your browser.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File is too large (max 10MB).");
      return;
    }

    setError(null);
    setImporting(true);

    try {
      const text = await file.text();
      const count = await onImport(text);
      setImported(count);
      setStep("result");
    } catch (e) {
      setError("Failed to parse the CSV file. Make sure it's a valid browser password export.");
    } finally {
      setImporting(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {step === "upload" && (
              <button
                onClick={() => { setStep("info"); setError(null); }}
                style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: "2px 4px 2px 0", display: "flex" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
            )}
            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
              {step === "info" ? "Import from browser" : step === "upload" ? "Upload export file" : "Import complete"}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 2 }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {step === "info" && (
            <div>
              <p style={{ fontSize: 12, color: "#555", lineHeight: 1.6, marginBottom: 20 }}>
                You can import passwords saved in Chrome, Firefox, Safari, or Edge by exporting them as a CSV file first.
              </p>

              {/* Browser steps */}
              {[
                {
                  browser: "Chrome / Edge",
                  icon: "🌐",
                  steps: [
                    "Open chrome://password-manager/settings",
                    'Click "Export passwords"',
                    "Save the .csv file",
                  ],
                },
                {
                  browser: "Firefox",
                  icon: "🦊",
                  steps: [
                    "Open Menu → Passwords",
                    'Click the "⋯" menu → "Export Logins"',
                    "Save the .csv file",
                  ],
                },
                {
                  browser: "Safari",
                  icon: "🧭",
                  steps: [
                    "Open Safari → Preferences → Passwords",
                    'Click "⋯" → "Export All Passwords"',
                    "Save the .csv file",
                  ],
                },
              ].map(({ browser, icon, steps }) => (
                <div
                  key={browser}
                  style={{
                    background: "#0a0a0a",
                    border: "1px solid #141414",
                    borderRadius: 8,
                    padding: "12px",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{icon}</span>
                    {browser}
                  </div>
                  <ol style={{ paddingLeft: 16, margin: 0 }}>
                    {steps.map((s, i) => (
                      <li key={i} style={{ fontSize: 11, color: "#444", lineHeight: 1.8 }}>{s}</li>
                    ))}
                  </ol>
                </div>
              ))}

              {/* Security note */}
              <div
                style={{
                  background: "rgba(234,179,8,0.06)",
                  border: "1px solid rgba(234,179,8,0.12)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginTop: 12,
                  marginBottom: 20,
                  display: "flex",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 12, flexShrink: 0 }}>⚠️</div>
                <div style={{ fontSize: 11, color: "#7a6a2a", lineHeight: 1.5 }}>
                  The exported CSV contains your plaintext passwords. Delete it immediately after import.
                </div>
              </div>

              <button
                onClick={() => setStep("upload")}
                style={{
                  width: "100%",
                  background: "#fff",
                  color: "#000",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                I have the CSV file
              </button>
            </div>
          )}

          {step === "upload" && (
            <div>
              <p style={{ fontSize: 12, color: "#444", lineHeight: 1.6, marginBottom: 16 }}>
                Select or drag the exported CSV file. It will be parsed locally — the file is never uploaded.
              </p>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? "#555" : "#1e1e1e"}`,
                  borderRadius: 10,
                  padding: "32px 20px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: dragOver ? "#0a0a0a" : "transparent",
                  transition: "all 0.15s",
                  marginBottom: 16,
                }}
              >
                {importing ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        border: "2px solid #1a1a1a",
                        borderTop: "2px solid #fff",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    <div style={{ fontSize: 12, color: "#444" }}>Parsing and encrypting...</div>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
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
                        margin: "0 auto 12px",
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#666", marginBottom: 4 }}>
                      Drop CSV file here
                    </div>
                    <div style={{ fontSize: 11, color: "#333" }}>or click to browse</div>
                  </>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleInputChange}
                style={{ display: "none" }}
              />

              {error && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#ef4444",
                    padding: "10px 12px",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.15)",
                    borderRadius: 6,
                  }}
                >
                  {error}
                </div>
              )}

              <div
                style={{
                  fontSize: 11,
                  color: "#2a2a2a",
                  marginTop: 12,
                  lineHeight: 1.6,
                }}
              >
                Supports exports from: Chrome, Edge, Firefox, Safari, Bitwarden, 1Password, LastPass
              </div>
            </div>
          )}

          {step === "result" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 16 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>

              <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6, letterSpacing: "-0.02em" }}>
                {imported > 0 ? `${imported} password${imported === 1 ? "" : "s"} imported` : "Nothing new to import"}
              </div>

              <div style={{ fontSize: 12, color: "#444", lineHeight: 1.6, marginBottom: 24, maxWidth: 260 }}>
                {imported > 0
                  ? "Your passwords have been encrypted and saved to your VaultPAPI vault."
                  : "All passwords in the CSV already exist in your vault. No duplicates were added."}
              </div>

              {/* Security reminder */}
              <div
                style={{
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.12)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  marginBottom: 20,
                  width: "100%",
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: "#ef4444", marginBottom: 4 }}>
                  🗑️ Delete the CSV file
                </div>
                <div style={{ fontSize: 11, color: "#7a3a3a", lineHeight: 1.5 }}>
                  The exported CSV contains your plaintext passwords. Delete it from your computer now.
                </div>
              </div>

              <button
                onClick={onClose}
                style={{
                  width: "100%",
                  background: "#fff",
                  color: "#000",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
