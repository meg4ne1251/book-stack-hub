"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient, ApiRequestError } from "@/lib/api-client";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }
    const verifyToken = async () => {
      try {
        await apiClient.get(`/auth/verify-reset-token?token=${token}`);
        setTokenValid(true);
      } catch {
        setTokenValid(false);
      }
    };
    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }
    if (password.length < 8) {
      setError("パスワードは8文字以上必要です");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/auth/reset-password", {
        token,
        new_password: password,
      });
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("パスワードリセットに失敗しました");
      }
    } finally {
      setLoading(false);
    }
  };

  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf7f2]">
        <p className="text-stone-400 text-sm">確認中...</p>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#faf7f2]">
        <div className="text-center space-y-4">
          <p className="text-red-600 text-sm">
            無効または期限切れのリセットリンクです
          </p>
          <Link href="/forgot-password" className="text-amber-800 hover:underline text-sm">
            パスワードリセットを再度リクエスト
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#faf7f2]">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-serif text-xl font-bold text-stone-800">新しいパスワード</h1>
          <p className="text-sm text-stone-500 mt-2">
            新しいパスワードを入力してください
          </p>
        </div>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded p-4 text-center">
            <p className="text-sm text-green-700">
              パスワードが正常にリセットされました
            </p>
            <Link
              href="/login"
              className="text-sm text-amber-800 hover:underline mt-4 inline-block"
            >
              ログインする
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">新しいパスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">パスワード確認</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "リセット中..." : "パスワードをリセット"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
