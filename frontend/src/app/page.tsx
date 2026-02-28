import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#faf7f2]">
      {/* Header */}
      <header className="border-b border-stone-200/80">
        <div className="max-w-4xl mx-auto px-5 py-3 flex items-center justify-between">
          <span className="font-serif text-lg font-semibold text-stone-800">BookStackHub</span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-[13px] text-stone-500 hover:text-stone-700 transition-colors"
            >
              ログイン
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center h-8 px-4 rounded bg-stone-800 text-white text-[13px] font-medium hover:bg-stone-700 transition-colors"
            >
              はじめる
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-5 pt-16 pb-12">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-800 leading-snug">
          読んだ本を、
          <br className="sm:hidden" />
          ちゃんと覚えておく。
        </h1>
        <p className="mt-4 text-stone-500 max-w-lg leading-relaxed">
          BookStackHubは読書記録のためのWebアプリです。バーコードで本を登録して、読書の記録をつけて、あとから振り返る。それだけのシンプルなツールです。
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/register"
            className="inline-flex items-center h-10 px-6 rounded bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors"
          >
            無料で始める
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center h-10 px-6 rounded border border-stone-300 text-stone-600 text-sm font-medium hover:bg-white transition-colors"
          >
            ログイン
          </Link>
        </div>
      </section>

      {/* What you can do */}
      <section className="max-w-4xl mx-auto px-5 py-12">
        <h2 className="font-serif text-lg font-semibold text-stone-700 mb-6">できること</h2>
        <div className="space-y-4">
          <div className="flex gap-4 p-4 bg-white rounded border border-stone-200">
            <div className="text-stone-400 mt-0.5 shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-stone-700">蔵書を管理する</h3>
              <p className="text-[13px] text-stone-500 mt-1">
                「読みたい」「読書中」「読了」「積読」など、ステータスで本を分類できます。タグやメモを添えて自分なりに整理を。
              </p>
            </div>
          </div>
          <div className="flex gap-4 p-4 bg-white rounded border border-stone-200">
            <div className="text-stone-400 mt-0.5 shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-stone-700">読書の記録を残す</h3>
              <p className="text-[13px] text-stone-500 mt-1">
                日々の読んだページ数を記録。GitHubの草みたいなヒートマップで、どれくらい読んだかが一目でわかります。
              </p>
            </div>
          </div>
          <div className="flex gap-4 p-4 bg-white rounded border border-stone-200">
            <div className="text-stone-400 mt-0.5 shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-stone-700">バーコードで登録する</h3>
              <p className="text-[13px] text-stone-500 mt-1">
                スマホのカメラで本のバーコードを読み取れば情報を自動入力。連続スキャンモードならまとめて登録も。
              </p>
            </div>
          </div>
          <div className="flex gap-4 p-4 bg-white rounded border border-stone-200">
            <div className="text-stone-400 mt-0.5 shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-stone-700">プレイリストを共有する</h3>
              <p className="text-[13px] text-stone-500 mt-1">
                おすすめの本をリストにまとめて公開したり、SNSでシェアできます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200/80 py-6 text-center">
        <p className="text-xs text-stone-400">
          &copy; {new Date().getFullYear()} BookStackHub
        </p>
      </footer>
    </div>
  );
}
