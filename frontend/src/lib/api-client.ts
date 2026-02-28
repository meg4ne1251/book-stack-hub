const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

interface ApiError {
  error: {
    code: string;
    message: string;
    details: unknown[];
  };
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private async tryRefreshToken(): Promise<boolean> {
    // Deduplicate concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) return false;
        const data = await response.json();
        this.accessToken = data.access_token;
        return true;
      } catch {
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    isRetry = false
  ): Promise<T> {
    const headers: HeadersInit = {
      ...(options.headers || {}),
    };

    // Don't set Content-Type for FormData (browser sets it with boundary)
    if (!(options.body instanceof FormData)) {
      (headers as Record<string, string>)["Content-Type"] = "application/json";
    }

    if (this.accessToken) {
      (headers as Record<string, string>)[
        "Authorization"
      ] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });

    // Auto-refresh on TOKEN_EXPIRED (one retry only)
    if (response.status === 401 && !isRetry) {
      const errorData = await response.json().catch(() => null);
      if (errorData?.error?.code === "TOKEN_EXPIRED") {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          return this.request<T>(path, options, true);
        }
      }
      throw new ApiRequestError(
        response.status,
        errorData?.error?.code || "UNAUTHORIZED",
        errorData?.error?.message || "Authentication required",
        errorData?.error?.details || []
      );
    }

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: {
          code: "UNKNOWN_ERROR",
          message: "An unknown error occurred",
          details: [],
        },
      }));
      throw new ApiRequestError(
        response.status,
        errorData.error.code,
        errorData.error.message,
        errorData.error.details
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }
}

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public code: string,
    public override message: string,
    public details: unknown[]
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export const apiClient = new ApiClient();
