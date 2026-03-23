// VaultPAPI API Client
// Communicates with the self-hosted VaultPAPI server

export interface User {
  id: string;
  email: string;
  created_at?: string;
}

export interface VaultEntry {
  id: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes?: string;
  created_at: number;
  updated_at: number;
  favicon?: string;
}

export interface VaultData {
  entries: VaultEntry[];
  version: number;
}

export interface ApiError {
  error: string;
}

export class VaultAPIClient {
  private baseUrl: string;
  private token: string | null;

  constructor(baseUrl: string, token: string | null = null) {
    // Normalize URL - remove trailing slash
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.token = token;
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as ApiError).error || "request_failed");
    }

    return data as T;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const data = await this.request<{ status: string }>("/health");
      return data.status === "ok";
    } catch {
      return false;
    }
  }

  async register(
    email: string,
    password: string
  ): Promise<{ id: string; email: string }> {
    return this.request("/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async login(
    email: string,
    password: string
  ): Promise<{ token: string; user: User }> {
    return this.request("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async getVault(): Promise<{
    id: string;
    encrypted_blob: string;
    version: number;
    updated_at: string;
  }> {
    return this.request("/v1/vault");
  }

  async saveVault(
    encryptedBlob: string,
    version?: number
  ): Promise<{
    id: string;
    encrypted_blob: string;
    version: number;
    updated_at: string;
  }> {
    return this.request("/v1/vault", {
      method: "PUT",
      body: JSON.stringify({
        encrypted_blob: encryptedBlob,
        ...(version !== undefined && { version }),
      }),
    });
  }
}
