import React, { useState, useEffect } from "react";
import { generatePassword, passwordStrength } from "../../lib/crypto";
import { copyToClipboard } from "../../lib/utils";

export function GeneratorPanel() {
  const [length, setLength] = useState(20);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [digits, setDigits] = useState(true);
  const [special, setSpecial] = useState(true);
  const [generated, setGenerated] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    generate();
  }, [length, uppercase, lowercase, digits, special]);

  function generate() {
    const pw = generatePassword({ length, uppercase, lowercase, digits, special });
    setGenerated(pw);
    setCopied(false);
  }

  async function handleCopy() {
    await copyToClipboard(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const strength = passwordStrength(generated);

  return (
    <div style={{ padding: "16px", overflowY: "auto", flex: 1 }}>
      {/* Output */}
      <div
        style={{
          background: "#0a0a0a",
          border: "1px solid #1a1a1a",
          borderRadius: 10,
          padding: "14px 12px",
          marginBottom: 16,
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: 13,
            color: "#fff",
            fontFamily: "'Geist Mono', monospace",
            letterSpacing: "0.04em",
            wordBreak: "break-all",
            lineHeight: 1.6,
            minHeight: 40,
            paddingRight: 32,
          }}
        >
          {generated}
        </div>

        {/* Strength bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <div style={{ flex: 1, height: 2, background: "#1a1a1a", borderRadius: 1, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${strength.score}%`, background: strength.color, transition: "all 0.3s", borderRadius: 1 }} />
          </div>
          <div style={{ fontSize: 10, color: strength.color, fontWeight: 600, minWidth: 40, textAlign: "right" }}>
            {strength.label}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          onClick={handleCopy}
          style={{
            flex: 1,
            background: copied ? "rgba(34,197,94,0.1)" : "#fff",
            color: copied ? "#22c55e" : "#000",
            border: copied ? "1px solid rgba(34,197,94,0.2)" : "none",
            borderRadius: 8,
            padding: "10px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "all 0.15s",
          }}
        >
          {copied ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copy
            </>
          )}
        </button>
        <button
          onClick={generate}
          style={{
            background: "#111",
            color: "#888",
            border: "1px solid #1a1a1a",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
          </svg>
          Regenerate
        </button>
      </div>

      {/* Options */}
      <div
        style={{
          background: "#0a0a0a",
          border: "1px solid #141414",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {/* Length */}
        <div style={{ padding: "12px 14px", borderBottom: "1px solid #0e0e0e" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "#888" }}>Length</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", fontFamily: "'Geist Mono', monospace" }}>
              {length}
            </div>
          </div>
          <input
            type="range"
            min={8}
            max={64}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            style={{
              width: "100%",
              accentColor: "#fff",
              cursor: "pointer",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 10, color: "#333" }}>8</span>
            <span style={{ fontSize: 10, color: "#333" }}>64</span>
          </div>
        </div>

        {/* Toggles */}
        {[
          { label: "Uppercase (A–Z)", value: uppercase, onChange: setUppercase },
          { label: "Lowercase (a–z)", value: lowercase, onChange: setLowercase },
          { label: "Numbers (0–9)", value: digits, onChange: setDigits },
          { label: "Special (!@#$...)", value: special, onChange: setSpecial },
        ].map(({ label, value, onChange }, idx, arr) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "11px 14px",
              borderBottom: idx < arr.length - 1 ? "1px solid #0e0e0e" : "none",
            }}
          >
            <div style={{ fontSize: 12, color: "#888" }}>{label}</div>
            <Toggle value={value} onChange={onChange} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 36,
        height: 20,
        background: value ? "#fff" : "#1a1a1a",
        border: `1px solid ${value ? "#fff" : "#2a2a2a"}`,
        borderRadius: 10,
        cursor: "pointer",
        position: "relative",
        transition: "all 0.2s",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: value ? 17 : 2,
          width: 14,
          height: 14,
          background: value ? "#000" : "#444",
          borderRadius: "50%",
          transition: "all 0.2s",
        }}
      />
    </button>
  );
}
