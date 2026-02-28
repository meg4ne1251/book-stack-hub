import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient, ApiRequestError } from "../api-client";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(
  status: number,
  code: string,
  message: string
): Response {
  return new Response(
    JSON.stringify({ error: { code, message, details: [] } }),
    { status, headers: { "Content-Type": "application/json" } }
  );
}

describe("ApiClient", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    apiClient.setAccessToken(null);
  });

  describe("GET requests", () => {
    it("sends GET request to correct URL", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: "test" }));

      const result = await apiClient.get("/test");

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("/test");
      expect(options.method).toBeUndefined();
      expect(result).toEqual({ data: "test" });
    });

    it("includes Authorization header when token is set", async () => {
      apiClient.setAccessToken("my-token");
      mockFetch.mockResolvedValueOnce(jsonResponse({}));

      await apiClient.get("/test");

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Authorization).toBe("Bearer my-token");
    });

    it("does not include Authorization header when no token", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}));

      await apiClient.get("/test");

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Authorization).toBeUndefined();
    });
  });

  describe("POST requests", () => {
    it("sends POST with JSON body", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));

      await apiClient.post("/items", { name: "test" });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe("POST");
      expect(options.body).toBe('{"name":"test"}');
      expect(options.headers["Content-Type"]).toBe("application/json");
    });

    it("sends POST with FormData without Content-Type header", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));

      const formData = new FormData();
      formData.append("file", "data");
      await apiClient.post("/upload", formData);

      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe("POST");
      expect(options.body).toBeInstanceOf(FormData);
      expect(options.headers["Content-Type"]).toBeUndefined();
    });
  });

  describe("PATCH requests", () => {
    it("sends PATCH with JSON body", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ updated: true }));

      await apiClient.patch("/items/1", { name: "updated" });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe("PATCH");
      expect(options.body).toBe('{"name":"updated"}');
    });

    it("sends PATCH with FormData (avatar upload fix)", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ avatar_url: "/url" }));

      const formData = new FormData();
      formData.append("avatar", "image-data");
      await apiClient.patch("/users/1", formData);

      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe("PATCH");
      expect(options.body).toBeInstanceOf(FormData);
      expect(options.headers["Content-Type"]).toBeUndefined();
    });
  });

  describe("DELETE requests", () => {
    it("sends DELETE request", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ deleted: true }));

      await apiClient.delete("/items/1");

      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe("DELETE");
    });
  });

  describe("204 No Content", () => {
    it("returns undefined for 204 responses", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(null, { status: 204 })
      );

      const result = await apiClient.delete("/items/1");
      expect(result).toBeUndefined();
    });
  });

  describe("Error handling", () => {
    it("throws ApiRequestError on non-401 error", async () => {
      mockFetch.mockResolvedValueOnce(
        errorResponse(404, "NOT_FOUND", "Item not found")
      );

      await expect(apiClient.get("/missing")).rejects.toThrow(ApiRequestError);

      try {
        mockFetch.mockResolvedValueOnce(
          errorResponse(404, "NOT_FOUND", "Item not found")
        );
        await apiClient.get("/missing");
      } catch (e) {
        expect(e).toBeInstanceOf(ApiRequestError);
        const err = e as ApiRequestError;
        expect(err.status).toBe(404);
        expect(err.code).toBe("NOT_FOUND");
        expect(err.message).toBe("Item not found");
      }
    });

    it("throws ApiRequestError with fallback for malformed error JSON", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response("Internal Server Error", { status: 500 })
      );

      try {
        await apiClient.get("/broken");
      } catch (e) {
        expect(e).toBeInstanceOf(ApiRequestError);
        const err = e as ApiRequestError;
        expect(err.status).toBe(500);
        expect(err.code).toBe("UNKNOWN_ERROR");
      }
    });
  });

  describe("Token refresh on TOKEN_EXPIRED", () => {
    it("automatically refreshes token and retries on TOKEN_EXPIRED", async () => {
      apiClient.setAccessToken("expired-token");

      // First call: 401 TOKEN_EXPIRED
      mockFetch.mockResolvedValueOnce(
        errorResponse(401, "TOKEN_EXPIRED", "Token expired")
      );
      // Refresh call: success
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ access_token: "new-token" })
      );
      // Retry call: success
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: "success" }));

      const result = await apiClient.get("/protected");

      expect(result).toEqual({ data: "success" });
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(apiClient.getAccessToken()).toBe("new-token");
    });

    it("throws when refresh fails", async () => {
      apiClient.setAccessToken("expired-token");

      // First call: 401 TOKEN_EXPIRED
      mockFetch.mockResolvedValueOnce(
        errorResponse(401, "TOKEN_EXPIRED", "Token expired")
      );
      // Refresh call: fails
      mockFetch.mockResolvedValueOnce(
        new Response("", { status: 401 })
      );

      await expect(apiClient.get("/protected")).rejects.toThrow(
        ApiRequestError
      );
    });

    it("does not retry more than once", async () => {
      apiClient.setAccessToken("expired-token");

      // First call: 401 TOKEN_EXPIRED
      mockFetch.mockResolvedValueOnce(
        errorResponse(401, "TOKEN_EXPIRED", "Token expired")
      );
      // Refresh: success
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ access_token: "new-token" })
      );
      // Retry: 401 again (should NOT retry again)
      mockFetch.mockResolvedValueOnce(
        errorResponse(401, "TOKEN_EXPIRED", "Token expired")
      );

      await expect(apiClient.get("/protected")).rejects.toThrow(
        ApiRequestError
      );
      // Original + refresh + 1 retry = 3 calls (no infinite loop)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("does not refresh for non-TOKEN_EXPIRED 401 errors", async () => {
      apiClient.setAccessToken("bad-token");

      mockFetch.mockResolvedValueOnce(
        errorResponse(401, "UNAUTHORIZED", "Invalid token")
      );

      await expect(apiClient.get("/protected")).rejects.toThrow(
        ApiRequestError
      );
      // Only 1 call, no refresh attempt
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("deduplicates concurrent refresh attempts", async () => {
      apiClient.setAccessToken("expired-token");

      // Set up responses for two concurrent requests
      // First request: 401
      mockFetch.mockResolvedValueOnce(
        errorResponse(401, "TOKEN_EXPIRED", "Token expired")
      );
      // Second request: 401
      mockFetch.mockResolvedValueOnce(
        errorResponse(401, "TOKEN_EXPIRED", "Token expired")
      );
      // Single refresh call (deduplicated)
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ access_token: "new-token" })
      );
      // Retry for first request
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: "result1" }));
      // Retry for second request
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: "result2" }));

      const [r1, r2] = await Promise.all([
        apiClient.get("/a"),
        apiClient.get("/b"),
      ]);

      expect(r1).toEqual({ data: "result1" });
      expect(r2).toEqual({ data: "result2" });
    });
  });

  describe("credentials", () => {
    it("always includes credentials: include", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}));

      await apiClient.get("/test");

      const [, options] = mockFetch.mock.calls[0];
      expect(options.credentials).toBe("include");
    });
  });
});
