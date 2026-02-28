import { Suspense } from "react";
import ResetPasswordForm from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-stone-400 text-sm">読み込み中...</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
