import React, { useState, useEffect } from "react";
import { VaultAPIClient } from "../../lib/api";
import { VaultService } from "../../lib/vault";
import { local, session } from "../../lib/storage";

interface Props {
  onSuccess: () => void;
  onSwitchSetup: () => void;
}

type Mode = "login" | "register";

export function AuthScreen({ onSuccess, onSwitchSetup }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmMaster, setConfirmMaster] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instanceUrl, setInstanceUrl] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showMaster, setShowMaster] = useState(false);

  useEffect(() => {
    local.get().then((config) => {
      if (config.instanceUrl) setInstanceUrl(config.instanceUrl);
      if (config.userEmail) setEmail(config.userEmail);
    });
  }, []);

  async function handleSubmit() {
    setError(null);

    if (!email || !password) {
      setError("Email and account password are required");
      return;
    }

    if (!masterPassword) {
      setError("Master password is required");
      return;
    }

    if (mode === "register") {
      if (masterPassword !== confirmMaster) {
        setError("Master passwords do not match");
        return;
      }
      if (masterPassword.length < 12) {
        setError("Master password must be at least 12 characters");
        return;
      }
    }

    setLoading(true);

    try {
      const client = new VaultAPIClient(instanceUrl);

      if (mode === "register") {
        await client.register(email, password);
      }

      const { token, user } = await client.login(email, password);
      client.setToken(token);

      // Store session data (in-memory only, cleared on browser close)
      await session.set({
        token,
        masterPassword: masterPassword,
        userEmail: user.email,
        userId: user.id,
        vaultVersion: 1,
      });

      await local.set({ userEmail: user.email, hasAccount: true });

      // Initialize vault if new account
      if (mode === "register") {
        const vaultSvc = new VaultService(client, masterPassword);
        await vaultSvc.initializeEmpty();
      }

      onSuccess();
    } catch (e: unknown) {
      const err = e as Error;
      const code = err.message;
      if (code === "user_exists") setError("An account with this email already exists");
      else if (code === "invalid_credentials") setError("Invalid email or password");
      else if (code === "weak_password") setError("Password must be at least 12 characters with upper, lower, digit and special character");
      else if (code === "invalid_email") setError("Invalid email address");
      else setError("Connection failed. Check your instance URL.");
    } finally {
      setLoading(false);
    }
  }

  const domain = instanceUrl
    ? (() => {
        try {
          return new URL(instanceUrl).hostname;
        } catch {
          return instanceUrl;
        }
      })()
    : "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 640,
        background: "#050505",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle noise texture overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 80% 20%, #111 0%, transparent 50%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "32px 28px 24px",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  background: "#fff",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="14"
                  height="14"
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
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#fff",
                  letterSpacing: "-0.02em",
                }}
              >
                VaultPAPI
              </span>
            </div>
            <button
              onClick={onSwitchSetup}
              style={{
                background: "none",
                border: "none",
                color: "#333",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
              </svg>
              {domain}
            </button>
          </div>

          {/* Mode toggle */}
          <div
            style={{
              display: "flex",
              background: "#0e0e0e",
              border: "1px solid #1a1a1a",
              borderRadius: 8,
              padding: 3,
              marginBottom: 20,
            }}
          >
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                style={{
                  flex: 1,
                  background: mode === m ? "#1a1a1a" : "transparent",
                  border: mode === m ? "1px solid #2a2a2a" : "1px solid transparent",
                  borderRadius: 6,
                  padding: "7px",
                  fontSize: 12,
                  fontWeight: mode === m ? 600 : 400,
                  color: mode === m ? "#fff" : "#555",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                  textTransform: "capitalize",
                }}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <div
            style={{
              fontSize: 19,
              fontWeight: 600,
              color: "#fff",
              letterSpacing: "-0.03em",
            }}
          >
            {mode === "login" ? "Unlock your vault" : "Get started"}
          </div>
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
          />
          <Field
            label="Account password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={setPassword}
            placeholder={mode === "login" ? "Your account password" : "Create account password (12+ chars)"}
            onToggleShow={() => setShowPassword(!showPassword)}
            showToggle
            showValue={showPassword}
          />
          <Field
            label="Master password"
            type={showMaster ? "text" : "password"}
            value={masterPassword}
            onChange={setMasterPassword}
            placeholder={mode === "login" ? "Your master password" : "Encrypts your vault locally"}
            onToggleShow={() => setShowMaster(!showMaster)}
            showToggle
            showValue={showMaster}
          />

          {mode === "register" && (
            <Field
              label="Confirm master password"
              type="password"
              value={confirmMaster}
              onChange={setConfirmMaster}
              placeholder="Repeat master password"
              onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && handleSubmit()}
            />
          )}

          <div
            style={{
              fontSize: 11,
              color: "#333",
              padding: "8px 10px",
              background: "#0a0a0a",
              borderRadius: 6,
              border: "1px solid #141414",
              marginTop: -4,
              lineHeight: 1.5,
            }}
          >
            {mode === "login"
              ? "Your master password decrypts your vault locally. It is never sent to the server."
              : "Your master password encrypts your vault. It is never sent to the server."}
          </div>

          {error && (
            <div
              style={{
                fontSize: 12,
                color: "#ef4444",
                padding: "10px 12px",
                background: "rgba(239,68,68,0.08)",
                borderRadius: 6,
                border: "1px solid rgba(239,68,68,0.15)",
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              background: loading ? "#111" : "#fff",
              color: loading ? "#444" : "#000",
              border: "none",
              borderRadius: 8,
              padding: "12px",
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              marginTop: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.15s",
            }}
          >
            {loading ? (
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
                {mode === "login" ? "Unlocking..." : "Creating account..."}
              </>
            ) : mode === "login" ? (
              "Unlock vault"
            ) : (
              "Create account"
            )}
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  showToggle?: boolean;
  showValue?: boolean;
  onToggleShow?: () => void;
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  onKeyDown,
  showToggle,
  showValue,
  onToggleShow,
}: FieldProps) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 600,
          color: "#444",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          style={{
            width: "100%",
            background: "#0e0e0e",
            border: "1px solid #1e1e1e",
            borderRadius: 8,
            padding: showToggle ? "10px 38px 10px 12px" : "10px 12px",
            fontSize: 13,
            color: "#fff",
            outline: "none",
            fontFamily: "inherit",
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#333")}
          onBlur={(e) => (e.target.style.borderColor = "#1e1e1e")}
        />
        {showToggle && (
          <button
            type="button"
            onClick={onToggleShow}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "#444",
              cursor: "pointer",
              padding: 2,
              display: "flex",
              alignItems: "center",
            }}
          >
            {showValue ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
