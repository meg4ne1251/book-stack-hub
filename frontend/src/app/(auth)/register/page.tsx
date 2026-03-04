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

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [form, setForm] = useState({
    email: "",
    username: "",
    display_name: "",
    password: "",
    password_confirm: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    setErrors({});
    setLoading(true);

    if (form.password !== form.password_confirm) {
      setErrors({ password_confirm: "パスワードが一致しません" });
      setLoading(false);
      return;
    }

    try {
      const { password_confirm: _, ...registerData } = form;
      const res = await apiClient.post<AuthResponse>("/auth/register", {
        ...registerData,
        turnstile_token: "dev-mode",
      });

      apiClient.setAccessToken(res.access_token);
      setUser(res.user);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.code === "ALREADY_EXISTS") {
          setGlobalError(err.message);
        } else if (err.code === "VALIDATION_ERROR" && err.details.length > 0) {
          const fieldErrors: Record<string, string> = {};
          for (const detail of err.details) {
            const d = detail as { loc?: string[]; msg?: string };
            if (d.loc && d.msg) {
              const field = d.loc[d.loc.length - 1];
              fieldErrors[field] = d.msg;
            }
          }
          setErrors(fieldErrors);
        } else {
          setGlobalError(err.message || "登録に失敗しました");
        }
      } else {
        setGlobalError("サーバーとの通信に失敗しました。しばらく経ってから再度お試しください。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf7f2] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="font-serif text-xl font-bold text-stone-800">新規登録</h1>
          <p className="text-[13px] text-stone-400 mt-1">BookStackHub</p>
        </div>

        <div className="p-5 bg-white rounded border border-stone-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="username">ユーザー名</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => updateField("username", e.target.value)}
                required
                minLength={3}
                maxLength={30}
                pattern="^[a-zA-Z0-9_]+$"
                title="英数字とアンダースコアのみ"
                autoComplete="username"
              />
              <p className="text-xs text-stone-400 mt-1">
                3〜30文字、英数字とアンダースコアのみ
              </p>
              {errors.username && (
                <p className="text-sm text-red-600 mt-1">{errors.username}</p>
              )}
            </div>

            <div>
              <Label htmlFor="display_name">表示名</Label>
              <Input
                id="display_name"
                value={form.display_name}
                onChange={(e) => updateField("display_name", e.target.value)}
                required
                maxLength={50}
              />
              {errors.display_name && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.display_name}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className="text-xs text-stone-400 mt-1">
                8文字以上、英大文字・小文字・数字・記号のうち3種以上
              </p>
              {errors.password && (
                <p className="text-sm text-red-600 mt-1">{errors.password}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password_confirm">パスワード（確認）</Label>
              <Input
                id="password_confirm"
                type="password"
                value={form.password_confirm}
                onChange={(e) => updateField("password_confirm", e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              {errors.password_confirm && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.password_confirm}
                </p>
              )}
            </div>

            {globalError && (
              <p className="text-sm text-red-600">{globalError}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "登録中..." : "新規登録"}
            </Button>
          </form>
        </div>

        <div className="mt-4 text-center text-[13px] text-stone-400">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="text-amber-800 hover:underline">
            ログイン
          </Link>
        </div>
      </div>
    </div>
  );
}
