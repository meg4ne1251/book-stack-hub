"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useAuthStore } from "@/stores/authStore";
import { apiClient, ApiRequestError } from "@/lib/api-client";

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();

  // Profile state
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [locale, setLocale] = useState("ja");
  const [isProfilePublic, setIsProfilePublic] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Data management
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name);
      setBio("");
      setLocale(user.locale);
      setIsProfilePublic(user.is_profile_public);
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    setProfileError(null);
    setProfileMessage(null);

    try {
      const res = await apiClient.patch(`/users/${user.id}`, {
        display_name: displayName,
        bio: bio || null,
        locale,
        is_profile_public: isProfilePublic,
      });
      setUser(res as typeof user);
      setProfileMessage("プロフィールを更新しました");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setProfileError(err.message);
      } else {
        setProfileError("更新に失敗しました");
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUploadAvatar = async () => {
    if (!user || !avatarFile) return;
    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      await apiClient.post(`/users/${user.id}/avatar`, formData);
      setAvatarFile(null);
      // Refresh user data
      const me = await apiClient.get("/auth/me");
      setUser(me as typeof user);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setProfileError(err.message);
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("新しいパスワードが一致しません");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("パスワードは8文字以上必要です");
      return;
    }

    setSavingPassword(true);
    try {
      await apiClient.patch(`/users/${user.id}/password`, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordMessage("パスワードを変更しました");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setPasswordError(err.message);
      } else {
        setPasswordError("パスワード変更に失敗しました");
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      await apiClient.post("/me/import", formData);
      // TODO: Start polling for import progress
    } catch {
      // Error handling
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async (format: "csv" | "json") => {
    setExporting(true);
    try {
      await apiClient.post("/me/export", { format });
      // TODO: Start polling for export completion, then download
    } catch {
      // Error handling
    } finally {
      setExporting(false);
    }
  };

  const handleDeactivate = async () => {
    if (
      !user ||
      !confirm(
        "アカウントを無効化しますか？30日後に完全に削除されます。この操作は取り消せません。"
      )
    )
      return;

    try {
      await apiClient.delete(`/users/${user.id}`);
      window.location.href = "/login";
    } catch {
      // Error handling
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">設定</h1>

      {/* Profile Section */}
      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">プロフィール</h2>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted overflow-hidden">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                {user?.display_name?.[0] || "?"}
              </div>
            )}
          </div>
          <div className="flex-1">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              className="text-sm"
            />
            {avatarFile && (
              <Button
                size="sm"
                className="mt-2"
                onClick={handleUploadAvatar}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? "アップロード中..." : "アバターを変更"}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">表示名</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">自己紹介</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="locale">言語</Label>
          <Select
            id="locale"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
          >
            <option value="ja">日本語</option>
            <option value="en">English</option>
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isProfilePublic}
            onChange={(e) => setIsProfilePublic(e.target.checked)}
            className="rounded"
          />
          プロフィールを公開する
        </label>

        {profileMessage && (
          <p className="text-sm text-green-600">{profileMessage}</p>
        )}
        {profileError && (
          <p className="text-sm text-destructive">{profileError}</p>
        )}

        <Button onClick={handleSaveProfile} disabled={savingProfile}>
          {savingProfile ? "保存中..." : "プロフィールを保存"}
        </Button>
      </section>

      {/* Password Section */}
      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">パスワード変更</h2>

        <div className="space-y-2">
          <Label htmlFor="currentPassword">現在のパスワード</Label>
          <Input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword">新しいパスワード</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">新しいパスワード（確認）</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {passwordMessage && (
          <p className="text-sm text-green-600">{passwordMessage}</p>
        )}
        {passwordError && (
          <p className="text-sm text-destructive">{passwordError}</p>
        )}

        <Button
          onClick={handleChangePassword}
          disabled={savingPassword || !currentPassword || !newPassword}
        >
          {savingPassword ? "変更中..." : "パスワードを変更"}
        </Button>
      </section>

      {/* Data Management Section */}
      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">データ管理</h2>

        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium">インポート</h3>
            <p className="text-xs text-muted-foreground mb-2">
              CSV/JSONファイルから書籍データをインポート
            </p>
            <Input
              type="file"
              accept=".csv,.json"
              onChange={handleImport}
              disabled={importing}
              className="text-sm"
            />
          </div>

          <div>
            <h3 className="text-sm font-medium">エクスポート</h3>
            <p className="text-xs text-muted-foreground mb-2">
              書籍データをバックアップ用にエクスポート
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExport("csv")}
                disabled={exporting}
              >
                CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExport("json")}
                disabled={exporting}
              >
                JSON
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-card border border-destructive/30 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-destructive">危険な操作</h2>
        <p className="text-sm text-muted-foreground">
          アカウントを無効化すると、30日後に全てのデータが完全に削除されます。
        </p>
        <Button variant="outline" className="text-destructive border-destructive" onClick={handleDeactivate}>
          アカウントを無効化
        </Button>
      </section>
    </div>
  );
}
