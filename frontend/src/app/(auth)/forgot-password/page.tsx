"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient, ApiRequestError } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiClient.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("送信に失敗しました");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf7f2] px-4">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <h1 className="font-serif text-xl font-bold text-stone-800">パスワードリセット</h1>
          <p className="text-[13px] text-stone-400 mt-1">
            登録メールアドレスにリセットリンクを送信します
          </p>
        </div>

        {sent ? (
          <div className="bg-green-50 border border-green-200 rounded p-4 text-center">
            <p className="text-[13px] text-green-700">
              パスワードリセットメールを送信しました。メールをご確認ください。
            </p>
            <Link
              href="/login"
              className="text-[13px] text-amber-800 hover:underline mt-3 inline-block"
            >
              ログインに戻る
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-[13px] rounded border border-red-200">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "送信中..." : "リセットリンクを送信"}
            </Button>

            <p className="text-center text-[13px] text-stone-400">
              <Link href="/login" className="text-amber-800 hover:underline">
                ログインに戻る
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
