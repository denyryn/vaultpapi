// Content script - injected into every page
// Detects: login forms, password inputs, form submissions
// Shows: autofill suggestions, save password prompts
// Auto-fills: single match on page load, dropdown for multiple matches

(function () {
    "use strict";

    if ((window as unknown as { __vaultpapi__: boolean }).__vaultpapi__) return;
    (window as unknown as { __vaultpapi__: boolean }).__vaultpapi__ = true;

    // ─── Types ────────────────────────────────────────────────────────────────

    interface VaultEntry {
        id: string;
        title: string;
        username: string;
        password: string;
        url: string;
    }

    // ─── DOM helpers ──────────────────────────────────────────────────────────

    function getPasswordInputs(): HTMLInputElement[] {
        return Array.from(
            document.querySelectorAll<HTMLInputElement>(
                'input[type="password"]',
            ),
        ).filter((el) => isVisible(el));
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

    // Native input setter — works with React, Vue, Angular
    function nativeSet(input: HTMLInputElement, value: string) {
        const descriptor = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value",
        );
        if (descriptor?.set) {
            descriptor.set.call(input, value);
        } else {
            input.value = value;
        }
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

    // ─── Autofill dropdown (shown on focus or when >1 match) ──────────────────

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
                e.preventDefault(); // prevent blur from closing dropdown before click fires
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

    // ─── Page-load autofill ───────────────────────────────────────────────────

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
                        // Single match — fill silently
                        fillCredentials(
                            passwordInput,
                            entries[0].username,
                            entries[0].password,
                        );
                        showAutofillBadge(entries[0].username);
                    } else {
                        // Multiple accounts — let user pick
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

    // ─── Focus listener — show dropdown when user clicks into empty password field ──

    document.addEventListener(
        "focusin",
        (e) => {
            const input = e.target as HTMLInputElement;
            if (input.type !== "password" || !isVisible(input)) return;
            if (input.value) return; // already filled

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

    // ─── Form submit — offer to save new credentials ──────────────────────────

    let savePromptShown = false;

    document.addEventListener(
        "submit",
        (e) => {
            const form = e.target as HTMLFormElement;
            const passwordInput = form.querySelector<HTMLInputElement>(
                'input[type="password"]',
            );
            if (!passwordInput?.value) return;

            const usernameInput = findUsernameInput(passwordInput);
            const username = usernameInput?.value ?? "";
            if (!username) return;

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
                            const exists = (response?.entries ?? []).some(
                                (en) => en.username === username,
                            );
                            if (!exists && !savePromptShown) {
                                setTimeout(
                                    () =>
                                        showSavePrompt(
                                            username,
                                            passwordInput.value,
                                            window.location.href,
                                        ),
                                    400,
                                );
                            }
                        },
                    );
                },
            );
        },
        true,
    );

    // ─── Save prompt ──────────────────────────────────────────────────────────

    function showSavePrompt(username: string, password: string, url: string) {
        savePromptShown = true;
        document.getElementById("vaultpapi-save-overlay")?.remove();

        const domain = (() => {
            try {
                return new URL(url).hostname.replace("www.", "");
            } catch {
                return url;
            }
        })();

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
        background:#0a0a0a;border:1px solid #2a2a2a;border-radius:12px;
        padding:14px 16px;width:300px;
        box-shadow:0 16px 48px rgba(0,0,0,0.7);
        animation:vpSlideDown 0.18s ease;
      ">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:26px;height:26px;background:#161616;border:1px solid #222;border-radius:6px;
                        display:flex;align-items:center;justify-content:center;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <div style="font-size:12px;font-weight:600;color:#fff;">Save to VaultPAPI?</div>
              <div style="font-size:11px;color:#444;">${escapeHtml(domain)}</div>
            </div>
          </div>
          <button id="vp-save-close" style="background:none;border:none;color:#333;cursor:pointer;padding:2px;font-size:15px;line-height:1;">✕</button>
        </div>
        <div style="font-size:12px;color:#555;margin-bottom:12px;">
          Save <strong style="color:#999;">${escapeHtml(username)}</strong> to your vault?
        </div>
        <div style="display:flex;gap:7px;">
          <button id="vp-save-btn" style="
            flex:1;background:#fff;color:#000;border:none;border-radius:6px;
            padding:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;
          ">Save</button>
          <button id="vp-notsave-btn" style="
            flex:1;background:#111;color:#555;border:1px solid #1e1e1e;border-radius:6px;
            padding:8px;font-size:12px;cursor:pointer;font-family:inherit;
          ">Not now</button>
        </div>
      </div>
    `;

        document.body.appendChild(overlay);

        const dismiss = () => {
            overlay.remove();
            savePromptShown = false;
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

    // ─── Trigger page-load autofill ───────────────────────────────────────────

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
            const inputs = getPasswordInputs();
            if (inputs.length > 0 && !inputs[0].value) {
                tryPageLoadAutofill();
            }
        }, 400);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Stop observing after 10 seconds to avoid running forever
    setTimeout(() => observer.disconnect(), 10_000);
})();

export {};
