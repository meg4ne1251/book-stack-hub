import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-primary">BookStackHub</span>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ログイン
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              新規登録
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          あなたの読書体験を、
          <br />
          <span className="text-primary">もっと豊かに。</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          書籍の検索・管理・共有を一元化するデジタル本棚。
          バーコードスキャンで簡単登録、GitHub風ヒートマップで読書習慣を可視化。
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center h-12 px-8 rounded-md bg-primary text-primary-foreground text-base font-medium hover:bg-primary/90 transition-colors"
          >
            無料で始める
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-12 px-8 rounded-md border border-border text-base font-medium hover:bg-accent transition-colors"
          >
            ログイン
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">📚</div>
            <h3 className="text-lg font-semibold mb-2">本棚管理</h3>
            <p className="text-sm text-muted-foreground">
              蔵書・読みたい本・読了本をステータスで一元管理。
              タグやメモで自分だけの整理法を。
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold mb-2">読書統計</h3>
            <p className="text-sm text-muted-foreground">
              GitHub風ヒートマップで読書習慣を可視化。
              月別・ジャンル別の統計で振り返り。
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold mb-2">書籍検索</h3>
            <p className="text-sm text-muted-foreground">
              バーコードスキャン＆キーワードで国内外の書籍を即座に検索。
              連続スキャンで一括登録も。
            </p>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-border">
        <h2 className="text-center text-sm font-medium text-muted-foreground mb-8">
          Technology Stack
        </h2>
        <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          {[
            "Next.js",
            "FastAPI",
            "PostgreSQL",
            "Redis",
            "Docker",
            "TypeScript",
            "Tailwind CSS",
          ].map((tech) => (
            <span
              key={tech}
              className="px-4 py-2 border border-border rounded-md"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} BookStackHub
        </p>
      </footer>
    </div>
  );
}
