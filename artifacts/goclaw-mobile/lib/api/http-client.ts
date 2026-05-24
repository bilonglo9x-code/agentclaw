export class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export class HttpClient {
  onAuthFailure: (() => void) | null = null;

  constructor(
    private baseUrl: string,
    private getToken: () => string,
    private getUserId: () => string,
  ) {}

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path, params);
    return this.request<T>(url, { method: "GET" });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(this.buildUrl(path), {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(this.buildUrl(path), {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(this.buildUrl(path), {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(this.buildUrl(path), { method: "DELETE" });
  }

  async postForm<T>(path: string, formData: FormData): Promise<T> {
    const url = this.buildUrl(path);
    const token = this.getToken();
    const userId = this.getUserId();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (userId) headers["X-User-ID"] = userId;
    const res = await fetch(url, { method: "POST", headers, body: formData });
    if (res.status === 401 || res.status === 403) {
      this.onAuthFailure?.();
      throw new ApiError("UNAUTHORIZED", "Authentication failed");
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      const message = err?.error?.message ?? err?.message ?? res.statusText;
      throw new ApiError(err?.error?.code ?? "HTTP_ERROR", message);
    }
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const base = this.baseUrl.endsWith("/") ? this.baseUrl.slice(0, -1) : this.baseUrl;
    const full = `${base}${path}`;
    if (!params) return full;
    const url = new URL(full);
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
    return url.toString();
  }

  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = this.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const userId = this.getUserId();
    if (userId) {
      headers["X-User-ID"] = userId;
      headers["X-GoClaw-User-Id"] = userId;
    }
    return headers;
  }

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...init,
      headers: this.authHeaders(),
    });

    if (res.status === 401 || res.status === 403) {
      this.onAuthFailure?.();
      throw new ApiError("UNAUTHORIZED", "Authentication failed");
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      const message = err?.error?.message ?? err?.message ?? (typeof err.error === "string" ? err.error : res.statusText);
      throw new ApiError(err?.error?.code ?? "HTTP_ERROR", message);
    }

    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
