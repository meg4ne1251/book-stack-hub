"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { apiClient, ApiRequestError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthResponse } from "@/types/api";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiClient.post<AuthResponse>("/auth/login", {
        email,
        password,
        turnstile_token: "dev-mode",
      });

      apiClient.setAccessToken(res.access_token);
      setUser(res.user as any);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.code === "INVALID_CREDENTIALS") {
          setError("メールアドレスまたはパスワードが正しくありません");
        } else if (err.code === "RATE_LIMIT_EXCEEDED") {
          setError("リクエスト回数の上限に達しました。しばらくお待ちください");
        } else {
          setError(err.message);
        }
      } else {
        setError("ログインに失敗しました");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf7f2] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="font-serif text-xl font-bold text-stone-800">ログイン</h1>
          <p className="text-[13px] text-stone-400 mt-1">BookStackHub</p>
        </div>

        <div className="p-5 bg-white rounded border border-stone-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "ログイン中..." : "ログイン"}
            </Button>
          </form>
        </div>

        <div className="mt-4 text-center text-[13px] text-stone-400">
          <Link
            href="/forgot-password"
            className="text-stone-500 hover:text-stone-700"
          >
            パスワードをお忘れですか？
          </Link>
        </div>

        <div className="mt-2 text-center text-[13px] text-stone-400">
          アカウントをお持ちでない方は{" "}
          <Link href="/register" className="text-amber-800 hover:underline">
            新規登録
          </Link>
        </div>
      </div>
    </div>
  );
}
