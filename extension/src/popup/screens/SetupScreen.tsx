import React, { useState } from "react";
import { VaultAPIClient } from "../../lib/api";
import { local } from "../../lib/storage";

interface Props {
  onComplete: () => void;
}

export function SetupScreen({ onComplete }: Props) {
  const [url, setUrl] = useState("http://localhost:8080");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleConnect() {
    if (!url.trim()) {
      setError("Please enter your instance URL");
      return;
    }

    let normalized = url.trim();
    if (!normalized.startsWith("http")) {
      normalized = `https://${normalized}`;
    }
    normalized = normalized.replace(/\/$/, "");

    setChecking(true);
    setError(null);

    try {
      const client = new VaultAPIClient(normalized);
      const healthy = await client.healthCheck();

      if (!healthy) {
        setError("Cannot reach the server. Is VaultPAPI running at this URL?");
        return;
      }

      setSuccess(true);
      await local.set({ instanceUrl: normalized });

      setTimeout(onComplete, 800);
    } catch (e) {
      setError("Connection failed. Check the URL and that CORS is configured.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 560,
        background: "#050505",
        padding: "0",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Grid background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(#111 1px, transparent 1px), linear-gradient(90deg, #111 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: 0.4,
        }}
      />

      {/* Top fade */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 200,
          background: "radial-gradient(ellipse at 50% -20%, #1a1a1a 0%, transparent 70%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "40px 28px 28px",
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                background: "#fff",
                borderRadius: 8,
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
                stroke="#000"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#fff",
                  letterSpacing: "-0.02em",
                }}
              >
                VaultPAPI
              </div>
              <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.06em" }}>
                ZERO-KNOWLEDGE VAULT
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "#fff",
              letterSpacing: "-0.03em",
              lineHeight: 1.3,
              marginBottom: 8,
            }}
          >
            Connect your instance
          </div>
          <div style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>
            Enter the URL of your self-hosted VaultPAPI server to get started.
          </div>
        </div>

        {/* Form */}
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 600,
              color: "#444",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Instance URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
            placeholder="https://vault.yourdomain.com"
            style={{
              width: "100%",
              background: "#0e0e0e",
              border: `1px solid ${error ? "#ef4444" : success ? "#22c55e" : "#1e1e1e"}`,
              borderRadius: 8,
              padding: "12px 14px",
              fontSize: 13,
              color: "#fff",
              outline: "none",
              fontFamily: "'Geist Mono', monospace",
              marginBottom: 16,
              transition: "border-color 0.15s",
            }}
          />

          {error && (
            <div
              style={{
                fontSize: 12,
                color: "#ef4444",
                marginBottom: 16,
                padding: "10px 12px",
                background: "rgba(239,68,68,0.08)",
                borderRadius: 6,
                border: "1px solid rgba(239,68,68,0.15)",
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                fontSize: 12,
                color: "#22c55e",
                marginBottom: 16,
                padding: "10px 12px",
                background: "rgba(34,197,94,0.08)",
                borderRadius: 6,
                border: "1px solid rgba(34,197,94,0.15)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              ✓ Server is reachable. Redirecting...
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={checking || success}
            style={{
              width: "100%",
              background: checking || success ? "#111" : "#fff",
              color: checking || success ? "#444" : "#000",
              border: "none",
              borderRadius: 8,
              padding: "12px",
              fontSize: 13,
              fontWeight: 600,
              cursor: checking || success ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {checking ? (
              <>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    border: "2px solid #333",
                    borderTop: "2px solid #888",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                Checking connection...
              </>
            ) : success ? (
              "Connected ✓"
            ) : (
              "Connect"
            )}
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>

        {/* Footer note */}
        <div
          style={{
            marginTop: 24,
            padding: "12px",
            background: "#0a0a0a",
            borderRadius: 8,
            border: "1px solid #141414",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#333",
              lineHeight: 1.6,
              letterSpacing: "0.01em",
            }}
          >
            🔒 All data is encrypted client-side before being sent to your
            server. VaultPAPI never has access to your plaintext passwords.
          </div>
        </div>
      </div>
    </div>
  );
}
