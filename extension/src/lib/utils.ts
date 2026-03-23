// Utility functions

export function generateId(): string {
  return crypto.randomUUID();
}

export function getDomainFromUrl(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function getFaviconUrl(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return `https://www.google.com/s2/favicons?sz=32&domain=${u.hostname}`;
  } catch {
    return "";
  }
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

export function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Safely copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      return true;
    } catch {
      return false;
    }
  }
}

// Parse browser exported passwords CSV
export interface BrowserPasswordEntry {
  title: string;
  url: string;
  username: string;
  password: string;
}

export function parseBrowserPasswordsCSV(csv: string): BrowserPasswordEntry[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  // Detect header row
  const header = lines[0].toLowerCase();
  const isChrome =
    header.includes("name") &&
    header.includes("url") &&
    header.includes("username") &&
    header.includes("password");
  const isFirefox =
    header.includes("url") &&
    header.includes("username") &&
    header.includes("password");

  if (!isChrome && !isFirefox) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  const nameIdx = headers.indexOf("name");
  const urlIdx = headers.indexOf("url");
  const usernameIdx = headers.indexOf("username");
  const passwordIdx = headers.indexOf("password");

  const entries: BrowserPasswordEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Simple CSV parse (handles quoted fields)
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 3) continue;

    entries.push({
      title: nameIdx >= 0 ? cols[nameIdx] || getDomainFromUrl(cols[urlIdx] || "") : getDomainFromUrl(cols[urlIdx] || ""),
      url: cols[urlIdx] || "",
      username: cols[usernameIdx] || "",
      password: cols[passwordIdx] || "",
    });
  }

  return entries.filter((e) => e.url && e.username && e.password);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
