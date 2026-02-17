"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { apiClient } from "@/lib/api-client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to refresh the access token using the HttpOnly cookie
        const res = await apiClient.post<{ access_token: string }>(
          "/auth/refresh"
        );
        apiClient.setAccessToken(res.access_token);

        // Fetch user info
        const user = await apiClient.get<any>("/auth/me");
        setUser(user);
      } catch {
        // Not authenticated
        setUser(null);
      }
    };

    initAuth();
  }, [setUser]);

  return <>{children}</>;
}
