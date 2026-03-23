import React, { useEffect, useState } from "react";
import { SetupScreen } from "./screens/SetupScreen";
import { AuthScreen } from "./screens/AuthScreen";
import { VaultScreen } from "./screens/VaultScreen";
import { local, session } from "../lib/storage";

type Screen = "loading" | "setup" | "auth" | "vault";

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");

  useEffect(() => {
    checkState();
  }, []);

  async function checkState() {
    const configured = await local.isConfigured();
    if (!configured) {
      setScreen("setup");
      return;
    }

    const authenticated = await session.isAuthenticated();
    if (!authenticated) {
      setScreen("auth");
      return;
    }

    setScreen("vault");
  }

  if (screen === "loading") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#050505",
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            border: "2px solid #222",
            borderTop: "2px solid #fff",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (screen === "setup") {
    return <SetupScreen onComplete={() => setScreen("auth")} />;
  }

  if (screen === "auth") {
    return (
      <AuthScreen
        onSuccess={() => setScreen("vault")}
        onSwitchSetup={() => setScreen("setup")}
      />
    );
  }

  return (
    <VaultScreen
      onLogout={() => setScreen("auth")}
    />
  );
}
