// Content script - injected into every page
// Detects: login forms, password inputs, form submissions
// Shows: autofill suggestions, save password prompts
// Auto-fills: single match on page load, dropdown for multiple matches

(function () {
    "use strict";

    if ((window as unknown as { __vaultpapi__: boolean }).__vaultpapi__) return;
    (window as unknown as { __vaultpapi__: boolean }).__vaultpapi__ = true;

    interface VaultEntry {
        id: string;
        title: string;
        username: string;
        password: string;
        url: string;
    }

    // ─── Credential tracking ──────────────────────────────────────────────────
    // Capture credentials as the user types so we have them on navigation

    let trackedUsername = "";
    let trackedPassword = "";
    let trackedUrl = window.location.href;

    function getPasswordInputs(): HTMLInputElement[] {
        return Array.from(
            document.querySelectorAll<HTMLInputElement>(
                'input[type="password"]',
            ),
        ).filter(isVisible);
    }

    function findUsernameInput(
        passwordInput: HTMLInputElement,
    ): HTMLInputElement | null {
        const form = passwordInput.closest("form");
        const scope = form || document;
        const candidates = Array.from(
            scope.querySelectorAll<HTMLInputElement>(
                'input[type="email"], input[type="text"], input[autocomplete="username"], input[name*="email" i], input[name*="user" i], input[id*="email" i], input[id*="user" i]',
            ),
        ).filter(isVisible);
        return candidates[candidates.length - 1] ?? null;
    }

    function isVisible(el: HTMLElement): boolean {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0"
        );
    }

    function nativeSet(input: HTMLInputElement, value: string) {
        const descriptor = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value",
        );
        if (descriptor?.set) descriptor.set.call(input, value);
        else input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function escapeHtml(str: string): string {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Watch password and username inputs and keep trackedUsername/Password fresh
    function attachCredentialTrackers() {
        const passwordInputs = getPasswordInputs();
        for (const pwInput of passwordInputs) {
            if (
                (pwInput as HTMLInputElement & { __vp_tracked__: boolean })
                    .__vp_tracked__
            )
                continue;
            (
                pwInput as HTMLInputElement & { __vp_tracked__: boolean }
            ).__vp_tracked__ = true;

            pwInput.addEventListener("input", () => {
                trackedPassword = pwInput.value;
                const unInput = findUsernameInput(pwInput);
                if (unInput) trackedUsername = unInput.value;
            });

            // Also track the associated username input
            const unInput = findUsernameInput(pwInput);
            if (unInput) {
                unInput.addEventListener("input", () => {
                    trackedUsername = unInput.value;
                });
            }
        }
    }

    // ─── Save prompt ──────────────────────────────────────────────────────────

    let savePromptShown = false;

    function maybeSaveCredentials() {
        if (!trackedUsername || !trackedPassword) return;
        if (savePromptShown) return;

        const domain = new URL(trackedUrl).hostname.replace("www.", "");

        chrome.runtime.sendMessage({
            type: "SET_PENDING_SAVE",
            data: {
                username: trackedUsername,
                password: trackedPassword,
                url: trackedUrl,
                domain: domain,
            },
        });
    }

    function showSavePrompt(
        username: string,
        password: string,
        url: string,
        domain: string,
    ) {
        if (savePromptShown) return;
        savePromptShown = true;

        document.getElementById("vaultpapi-save-overlay")?.remove();

        const style = document.createElement("style");
        style.textContent = `
      @keyframes vpSlideDown {
        from { opacity: 0; transform: translateY(-8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `;
        document.head.appendChild(style);

        const overlay = document.createElement("div");
        overlay.id = "vaultpapi-save-overlay";
        overlay.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 2147483647;
      font-family: 'Geist', system-ui, sans-serif;
    `;
        overlay.innerHTML = `
              <div style="
                background:#0a0a0a;
                border:1px solid #1e1e1e;
                border-radius:10px;
                width:296px;
                box-shadow:0 24px 64px rgba(0,0,0,0.8),0 1px 0 rgba(255,255,255,0.04) inset;
                animation:vpSlideDown 0.18s cubic-bezier(0.16,1,0.3,1);
                overflow:hidden;
                font-family:'Geist','GeistVariable',system-ui,-apple-system,sans-serif;
                -webkit-font-smoothing:antialiased;
              ">
                <!-- Header row -->
                <div style="
                  display:flex;align-items:center;justify-content:space-between;
                  padding:11px 13px 10px;
                  border-bottom:1px solid #141414;
                ">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <div style="
                      width:24px;height:24px;
                      background:#111;
                      border:1px solid #1e1e1e;
                      border-radius:5px;
                      display:flex;align-items:center;justify-content:center;
                      flex-shrink:0;
                    ">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </div>
                    <div>
                      <div style="font-size:11px;font-weight:700;color:#fff;letter-spacing:-0.01em;line-height:1.2;">Save to VaultPAPI?</div>
                      <div style="font-size:10px;color:#3a3a3a;letter-spacing:0.01em;margin-top:1px;">${escapeHtml(domain)}</div>
                    </div>
                  </div>
                  <button id="vp-save-close" style="
                    background:none;border:none;
                    color:#2e2e2e;cursor:pointer;
                    padding:0;
                    width:18px;height:18px;
                    display:flex;align-items:center;justify-content:center;
                    border-radius:3px;
                    transition:color 0.1s;
                    font-size:0;
                  ">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                <!-- Body -->
                <div style="padding:10px 13px 12px;">
                  <div style="
                    font-size:11px;color:#444;
                    margin-bottom:10px;
                    line-height:1.4;
                    color: white;
                  ">
                    Save <span style="
                      color:#d4d4d4;
                      font-weight:600;
                      font-family:'GeistMono','Geist Mono',monospace;
                      font-size:10.5px;
                      background:#141414;
                      border:1px solid #1e1e1e;
                      border-radius:3px;
                      padding:1px 5px;
                    ">${escapeHtml(username)}</span> to your vault?
                  </div>
                  <div style="display:flex;gap:6px;">
                    <button id="vp-save-btn" style="
                      flex:1;
                      background:#fff;color:#000;
                      border:none;
                      border-radius:5px;
                      padding:7px 10px;
                      font-size:11px;font-weight:700;
                      cursor:pointer;
                      font-family:'Geist',system-ui,sans-serif;
                      letter-spacing:-0.01em;
                      transition:opacity 0.1s;
                    ">Save</button>
                    <button id="vp-notsave-btn" style="
                      flex:1;
                      background:#111;color:#555;
                      border:1px solid #1e1e1e;
                      border-radius:5px;
                      padding:7px 10px;
                      font-size:11px;font-weight:500;
                      cursor:pointer;
                      font-family:'Geist',system-ui,sans-serif;
                      letter-spacing:-0.01em;
                      transition:all 0.1s;
                    ">Not now</button>
                  </div>
                </div>
              </div>
            `;

        document.body.appendChild(overlay);

        const dismiss = () => {
            overlay.remove();
            savePromptShown = false;
            chrome.runtime.sendMessage({ type: "CLEAR_PENDING_SAVE" });
        };

        document
            .getElementById("vp-save-close")
            ?.addEventListener("click", dismiss);
        document
            .getElementById("vp-notsave-btn")
            ?.addEventListener("click", dismiss);
        document
            .getElementById("vp-save-btn")
            ?.addEventListener("click", () => {
                chrome.runtime.sendMessage({
                    type: "SAVE_NEW_ENTRY",
                    entry: { title: domain, url, username, password },
                });
                dismiss();

                const toast = document.createElement("div");
                toast.style.cssText = `
        position:fixed;bottom:16px;right:16px;z-index:2147483647;
        background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;
        padding:9px 14px;font-family:'Geist',system-ui,sans-serif;
        font-size:12px;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,0.4);
        display:flex;align-items:center;gap:7px;
      `;
                toast.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Saved to VaultPAPI
      `;
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2500);
            });
    }

    // ─── Detect navigation after login ────────────────────────────────────────
    // Covers: traditional form submit, fetch/XHR login, SPA route change

    // 1. Traditional form submit
    document.addEventListener(
        "submit",
        () => {
            const pwInputs = getPasswordInputs();
            for (const pw of pwInputs) {
                if (pw.value) {
                    trackedPassword = pw.value;
                    const un = findUsernameInput(pw);
                    if (un?.value) trackedUsername = un.value;
                }
            }
            maybeSaveCredentials();
        },
        true,
    );

    // 2. Page unload — user is navigating away after login
    window.addEventListener("beforeunload", () => {
        maybeSaveCredentials();
    });

    // 3. SPA / XHR login — URL changes without a real page load
    //    Poll for URL change (history.pushState doesn't fire an event we can catch reliably)
    let lastUrl = window.location.href;
    const urlPoller = setInterval(() => {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            if (trackedUsername && trackedPassword) {
                maybeSaveCredentials();
                trackedUsername = "";
                trackedPassword = "";
            }
        }
    }, 500);

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(urlPoller), 5 * 60 * 1000);

    // ─── Check for pending save from previous page ────────────────────────────
    // When a login redirects to a new page, the content script on that new page
    // picks up the pendingSave written by the previous page's beforeunload handler

    function checkPendingSave() {
        chrome.runtime.sendMessage({ type: "GET_PENDING_SAVE" }, (data) => {
            const pending = data?.pendingSave;
            if (!pending) return;

            chrome.runtime.sendMessage(
                { type: "GET_AUTH_STATUS" },
                (status) => {
                    if (!status?.authenticated) {
                        chrome.runtime.sendMessage({
                            type: "CLEAR_PENDING_SAVE",
                        });
                        return;
                    }

                    chrome.runtime.sendMessage(
                        {
                            type: "GET_VAULT_ENTRIES_FOR_URL",
                            url: pending.url,
                        },
                        (response: { entries?: VaultEntry[] }) => {
                            const exists = (response?.entries ?? []).some(
                                (e) => e.username === pending.username,
                            );
                            chrome.runtime.sendMessage({
                                type: "CLEAR_PENDING_SAVE",
                            });

                            if (!exists) {
                                setTimeout(
                                    () =>
                                        showSavePrompt(
                                            pending.username,
                                            pending.password,
                                            pending.url,
                                            pending.domain,
                                        ),
                                    600,
                                );
                            }
                        },
                    );
                },
            );
        });
    }

    // ─── Autofill ─────────────────────────────────────────────────────────────

    function fillCredentials(
        passwordInput: HTMLInputElement,
        username: string,
        password: string,
    ) {
        nativeSet(passwordInput, password);
        const usernameInput = findUsernameInput(passwordInput);
        if (usernameInput) nativeSet(usernameInput, username);
    }

    function showAutofillDropdown(
        input: HTMLInputElement,
        entries: VaultEntry[],
    ) {
        document
            .querySelectorAll(".vaultpapi-dropdown")
            .forEach((el) => el.remove());
        if (entries.length === 0) return;

        const rect = input.getBoundingClientRect();

        const dropdown = document.createElement("div");
        dropdown.className = "vaultpapi-dropdown";
        dropdown.style.cssText = `
      position: fixed;
      top: ${rect.bottom + 4}px;
      left: ${rect.left}px;
      min-width: ${Math.max(rect.width, 280)}px;
      max-width: 360px;
      background: #0a0a0a;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      z-index: 2147483647;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      font-family: 'Geist', system-ui, sans-serif;
      overflow: hidden;
      animation: vpSlideIn 0.12s ease;
    `;

        const style = document.createElement("style");
        style.textContent = `
      @keyframes vpSlideIn {
        from { opacity: 0; transform: translateY(-4px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `;
        document.head.appendChild(style);

        const header = document.createElement("div");
        header.style.cssText = `
      padding: 7px 11px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #444;
      border-bottom: 1px solid #1a1a1a;
      display: flex;
      align-items: center;
      gap: 6px;
    `;
        header.innerHTML = `
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      VaultPAPI
    `;
        dropdown.appendChild(header);

        for (const entry of entries.slice(0, 6)) {
            const item = document.createElement("div");
            item.style.cssText = `
        padding: 9px 11px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 9px;
        border-bottom: 1px solid #111;
        transition: background 0.1s;
      `;
            item.innerHTML = `
        <div style="width:26px;height:26px;background:#161616;border:1px solid #222;border-radius:6px;
                    display:flex;align-items:center;justify-content:center;flex-shrink:0;
                    font-size:11px;color:#555;font-weight:700;">
          ${escapeHtml(entry.title.charAt(0).toUpperCase())}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:500;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${escapeHtml(entry.title)}
          </div>
          <div style="font-size:11px;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${escapeHtml(entry.username)}
          </div>
        </div>
        <div style="font-size:10px;color:#333;flex-shrink:0;">Fill ↵</div>
      `;

            item.addEventListener("mouseenter", () => {
                item.style.background = "#111";
            });
            item.addEventListener("mouseleave", () => {
                item.style.background = "transparent";
            });
            item.addEventListener("mousedown", (e) => {
                e.preventDefault();
                fillCredentials(input, entry.username, entry.password);
                dropdown.remove();
            });

            dropdown.appendChild(item);
        }

        document.body.appendChild(dropdown);

        setTimeout(() => {
            document.addEventListener(
                "mousedown",
                (e) => {
                    if (!dropdown.contains(e.target as Node)) dropdown.remove();
                },
                { once: true },
            );
            window.addEventListener("scroll", () => dropdown.remove(), {
                once: true,
                passive: true,
            });
        }, 50);
    }

    function tryPageLoadAutofill() {
        chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" }, (status) => {
            if (!status?.authenticated) return;

            const passwordInputs = getPasswordInputs();
            if (passwordInputs.length === 0) return;

            chrome.runtime.sendMessage(
                {
                    type: "GET_VAULT_ENTRIES_FOR_URL",
                    url: window.location.href,
                },
                (response: { entries?: VaultEntry[] }) => {
                    const entries = response?.entries ?? [];
                    if (entries.length === 0) return;

                    const passwordInput = passwordInputs[0];
                    if (entries.length === 1) {
                        fillCredentials(
                            passwordInput,
                            entries[0].username,
                            entries[0].password,
                        );
                        showAutofillBadge(entries[0].username);
                    } else {
                        showAutofillDropdown(passwordInput, entries);
                    }
                },
            );
        });
    }

    function showAutofillBadge(username: string) {
        document.getElementById("vaultpapi-autofill-badge")?.remove();

        const style = document.createElement("style");
        style.textContent = `
      @keyframes vpSlideUp {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `;
        document.head.appendChild(style);

        const badge = document.createElement("div");
        badge.id = "vaultpapi-autofill-badge";
        badge.style.cssText = `
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 2147483647;
      background: #0a0a0a;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      padding: 8px 12px;
      font-family: 'Geist', system-ui, sans-serif;
      font-size: 12px;
      color: #888;
      display: flex;
      align-items: center;
      gap: 7px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      animation: vpSlideUp 0.15s ease;
    `;
        badge.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      <span>Filled <strong style="color:#ccc;">${escapeHtml(username)}</strong></span>
      <button id="vp-badge-close" style="background:none;border:none;color:#333;cursor:pointer;padding:0;margin-left:4px;font-size:13px;line-height:1;">✕</button>
    `;

        document.body.appendChild(badge);
        document
            .getElementById("vp-badge-close")
            ?.addEventListener("click", () => badge.remove());
        setTimeout(() => badge.remove(), 3000);
    }

    document.addEventListener(
        "focusin",
        (e) => {
            const input = e.target as HTMLInputElement;
            if (input.type !== "password" || !isVisible(input)) return;
            if (input.value) return;

            chrome.runtime.sendMessage(
                { type: "GET_AUTH_STATUS" },
                (status) => {
                    if (!status?.authenticated) return;

                    chrome.runtime.sendMessage(
                        {
                            type: "GET_VAULT_ENTRIES_FOR_URL",
                            url: window.location.href,
                        },
                        (response: { entries?: VaultEntry[] }) => {
                            const entries = response?.entries ?? [];
                            if (entries.length > 0)
                                showAutofillDropdown(input, entries);
                        },
                    );
                },
            );
        },
        true,
    );

    // ─── Init ─────────────────────────────────────────────────────────────────

    // Check if the previous page left a pending save for us to show
    checkPendingSave();

    // Start tracking credential inputs
    attachCredentialTrackers();

    // Page-load autofill
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () =>
            setTimeout(tryPageLoadAutofill, 300),
        );
    } else {
        setTimeout(tryPageLoadAutofill, 300);
    }

    // Watch for dynamically rendered login forms (SPAs)
    let observerTimeout: ReturnType<typeof setTimeout> | null = null;
    const observer = new MutationObserver(() => {
        if (observerTimeout) clearTimeout(observerTimeout);
        observerTimeout = setTimeout(() => {
            attachCredentialTrackers();
            const inputs = getPasswordInputs();
            if (inputs.length > 0 && !inputs[0].value) tryPageLoadAutofill();
        }, 400);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 10_000);
})();

export {};
