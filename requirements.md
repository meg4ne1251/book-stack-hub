# BookStackHub — 書籍管理・共有プラットフォーム 要件定義書

> **Version**: 2.1.0  
> **最終更新日**: 2026-02-15  
> **ステータス**: ドラフト

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [技術スタック](#2-技術スタック)
3. [システムアーキテクチャ](#3-システムアーキテクチャ)
4. [機能要件](#4-機能要件)
5. [API仕様](#5-api仕様)
6. [データモデル](#6-データモデル)
7. [画面一覧・UI設計指針](#7-画面一覧ui設計指針)
8. [セキュリティ要件](#8-セキュリティ要件)
9. [非機能要件](#9-非機能要件)
10. [国際化（i18n）](#10-国際化i18n)
11. [CI/CD・テスト戦略](#11-cicdテスト戦略)
12. [エラーハンドリング](#12-エラーハンドリング)
13. [付録](#付録)

---

## 1. プロジェクト概要

### 1.1 目的

書籍の検索・管理・共有を一元化し、物理的な制約を超えたデジタル本棚を提供するWebアプリケーション。読書記録の可視化やソーシャル共有を通じて、読書体験を豊かにする。

### 1.2 開発ロードマップ

| フェーズ | スコープ | 備考 |
|:---|:---|:---|
| **フェーズ1（今回）** | レスポンシブWebアプリケーション（PWA対応） | PC・スマホブラウザで完結 |
| **フェーズ2（将来）** | iOS / Android ネイティブアプリ | フェーズ1のバックエンドAPIを流用 |

### 1.3 用語定義

| 用語 | 定義 |
|:---|:---|
| マスター書籍 | 外部APIから取得しDBにキャッシュされた共有書籍データ |
| カスタム書籍 | ユーザーが手動で登録した書籍。登録者のみが本棚に追加可能 |
| UserBook | ユーザーと書籍の紐付け（ステータス・評価等を含む） |
| プレイリスト | 任意のテーマで書籍をグルーピングしたリスト |
| 読書ログ | 日別の読書記録（ページ数・時間） |
| ヒートマップ | GitHub風の読書活動可視化グラフ |

---

## 2. 技術スタック

### 2.1 フロントエンド

| 項目 | 技術 | 選定理由 |
|:---|:---|:---|
| フレームワーク | **Next.js 15+**（App Router） | SSR/SSG対応、PWA対応、i18n対応、将来のネイティブアプリとのAPI共有に最適 |
| 言語 | **TypeScript 5+** | 型安全性によるバグ防止 |
| 状態管理 | **Zustand** + **TanStack Query** | 軽量なグローバル状態 + サーバー状態のキャッシュ・同期 |
| UIライブラリ | **shadcn/ui** + **Radix UI** | アクセシブルで高品質なコンポーネント |
| スタイリング | **Tailwind CSS v3.4** | 高速なUI構築・レスポンシブ対応（v4は時期尚早のため安定版を採用） |
| アイコン | **Lucide React** | shadcn/ui標準のアイコンライブラリ |
| チャート | **Recharts** | 統計グラフ・ヒートマップ描画 |
| バーコード | **html5-qrcode** | Webカメラによるバーコード読み取り |
| PWA | **next-pwa** (Serwist) | Service Worker・オフラインキャッシュ |
| i18n | **next-intl** | Next.js App Router対応の国際化 |
| フォーム | **React Hook Form** + **Zod** | バリデーション付きフォーム管理 |
| テスト | **Vitest** + **Playwright** | ユニット・E2Eテスト |

### 2.2 バックエンド

| 項目 | 技術 | 選定理由 |
|:---|:---|:---|
| フレームワーク | **FastAPI**（Python 3.12+） | 自動OpenAPIドキュメント生成、Pydanticによる堅牢なバリデーション、非同期サポート |
| ORM | **SQLAlchemy 2.0**（async） | 成熟した非同期ORM、マイグレーション対応 |
| マイグレーション | **Alembic** | SQLAlchemy連携のDBマイグレーション |
| 認証 | **PyJWT** + **Argon2**（argon2-cffi） | JWTトークン発行、パスワードハッシュ化 |
| 画像処理 | **Pillow** | 表紙画像のWebP変換・リサイズ、OGP画像生成 |
| バリデーション | **Pydantic v2** | リクエスト/レスポンスの厳格な型定義 |
| HTTPクライアント | **httpx** | 外部API呼び出し（非同期対応） |
| DBドライバ | **asyncpg** | 高速なPostgreSQL非同期ドライバ |
| タスクキュー | **Celery** + **Redis** | OGP画像生成・年間レポート生成などの重い処理 |
| テスト | **pytest** + **pytest-asyncio** | ユニット・統合テスト |
| Linter/Formatter | **Ruff** | 高速なLint + Format |

### 2.3 データベース・キャッシュ

| 項目 | 技術 | 用途 |
|:---|:---|:---|
| RDB | **PostgreSQL 16** | メインデータストア |
| キャッシュ | **Redis 7** | セッション管理、APIレスポンスキャッシュ、レートリミット、Celeryブローカー |

### 2.4 インフラストラクチャ

| 項目 | 技術 | 用途 |
|:---|:---|:---|
| コンテナ | **Docker** + **Docker Compose** | 全サービスのコンテナ化 |
| リバースプロキシ | **Nginx** | 静的ファイル配信、プロキシ、SSL終端（ローカル） |
| 公開 | **Cloudflare Tunnel** | 自宅サーバーの安全な公開 |
| WAF | **Cloudflare WAF** | エッジでのセキュリティ対策 |
| 画像ストレージ | **ローカルボリューム**（Docker Volume） | 表紙画像キャッシュの永続化 |
| CI/CD | **GitHub Actions** | テスト・ビルド・デプロイ自動化 |

### 2.5 外部書籍API

#### フェーズ1（今回）

| API | 用途 | 優先度 | 備考 |
|:---|:---|:---|:---|
| **Google Books API** | 書籍検索（国内・洋書） | **主要** | 日本語書籍も収録。表紙画像が豊富 |
| **楽天ブックス総合検索API** | 国内書籍・コミック・雑誌 | **主要** | 日本の商業出版物に非常に強い。書影充実。ジャンル情報も詳細 |

#### フェーズ1.5以降（将来対応）

| API | 用途 | 優先度 | 備考 |
|:---|:---|:---|:---|
| **NDLサーチ OpenSearch API** | 国内書籍の補完検索 | **補完** | 国立国会図書館。ISBN検索に強い。書影APIは2026年3月末終了予定のため書誌情報のみ利用 |
| **OpenBD 代替API** | 国内書籍の追加補完 | **速度** | 爆速だがカバレッジにムラがある。ISBN検索の一次キャッシュ的に利用 |

> **⚠️ 外部API障害時のフォールバック**: いずれのAPIも応答しない場合、ユーザーにエラーを表示しつつ「カスタム書籍として手動登録」を案内するUIを提供する。

---

## 3. システムアーキテクチャ

### 3.1 全体構成

```
┌─────────────────────────────────────────────┐
│                Cloudflare                    │
│  ┌─────────┐  ┌─────────┐  ┌────────────┐  │
│  │  Tunnel  │  │   WAF   │  │  SSL/TLS   │  │
│  └────┬────┘  └─────────┘  └────────────┘  │
└───────┼─────────────────────────────────────┘
        │
┌───────▼──────── Docker Host ────────────────┐
│                                              │
│  ┌──────────┐     ┌──────────────────────┐  │
│  │  Nginx   │────▶│  Next.js (Frontend)  │  │
│  │  :80/443 │     │       :3000          │  │
│  │          │     └──────────────────────┘  │
│  │          │     ┌──────────────────────┐  │
│  │          │────▶│  FastAPI (Backend)   │  │
│  │          │     │       :8000          │  │
│  └──────────┘     └──────────┬───────────┘  │
│                              │               │
│  ┌──────────────┐  ┌────────▼───────────┐  │
│  │    Redis     │  │   PostgreSQL       │  │
│  │    :6379     │  │     :5432          │  │
│  └──────────────┘  └────────────────────┘  │
│                                              │
│  ┌──────────────┐  ┌────────────────────┐  │
│  │ Celery Worker│  │  Image Storage     │  │
│  │  (非同期処理) │  │  (Docker Volume)   │  │
│  └──────────────┘  └────────────────────┘  │
└──────────────────────────────────────────────┘
```

### 3.2 Docker Compose構成

```yaml
services:
  nginx:        # リバースプロキシ（ポート80/443）
  frontend:     # Next.js アプリケーション（ポート3000）
  backend:      # FastAPI アプリケーション（ポート8000）
  db:           # PostgreSQL（ポート5432）
  redis:        # Redis（ポート6379）
  celery:       # Celery Worker（非同期タスク処理）
  celery-beat:  # Celery Beat（定期タスクスケジューラ: 物理削除バッチ等）
  tunnel:       # Cloudflare Tunnel（自社サーバー公開用）
    image: cloudflare/cloudflared:latest
    command: tunnel run
    environment:
      - TUNNEL_TOKEN=${TUNNEL_TOKEN}

volumes:
  postgres_data:   # DB永続化
  redis_data:      # Redisデータ永続化
  image_cache:     # 書籍表紙画像キャッシュ
    # 注意: ホスト側の権限問題（Permission Denied）を防ぐため、ホスト側のディレクトリ所有者をコンテナ実行ユーザー（通常uid=1000）に合わせるか、
    # Dockerfile内でユーザーを作成し `user: "${UID}:${GID}"` を指定して実行する等の対策を行うこと。
```

### 3.3 推奨ディレクトリ構成

```
book-stack-hub/
├── docker-compose.yml
├── .env.example              # 環境変数テンプレート
├── nginx/
│   └── nginx.conf
├── frontend/
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── public/
│   │   └── manifest.json    # PWAマニフェスト
│   ├── messages/             # i18n翻訳ファイル
│   │   ├── ja.json
│   │   └── en.json
│   └── src/
│       ├── app/              # App Router ページ
│       ├── components/       # UIコンポーネント
│       ├── hooks/            # カスタムフック
│       ├── lib/              # ユーティリティ・APIクライアント
│       ├── stores/           # Zustand ストア
│       └── types/            # TypeScript型定義
├── backend/
│   ├── pyproject.toml
│   ├── alembic/              # DBマイグレーション
│   ├── app/
│   │   ├── main.py           # FastAPIエントリーポイント
│   │   ├── config.py         # 設定管理
│   │   ├── dependencies.py   # DI（認証・DB等）
│   │   ├── models/           # SQLAlchemyモデル
│   │   ├── schemas/          # Pydanticスキーマ
│   │   ├── routers/          # APIルーター
│   │   ├── services/         # ビジネスロジック
│   │   ├── repositories/     # データアクセス層
│   │   ├── tasks/            # Celeryタスク
│   │   └── utils/            # ユーティリティ
│   └── tests/
└── docs/                     # 追加ドキュメント
```

### 3.4 環境変数一覧

| 変数名 | 説明 | 例 |
|:---|:---|:---|
| `DATABASE_URL` | PostgreSQL接続文字列 | `postgresql+asyncpg://user:pass@db:5432/bookstackhub` |
| `REDIS_URL` | Redis接続文字列 | `redis://redis:6379/0` |
| `SECRET_KEY` | JWT署名用秘密鍵（256bit以上） | ランダム生成 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | アクセストークン有効期限（分） | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | リフレッシュトークン有効期限（日） | `30` |
| `GOOGLE_BOOKS_API_KEY` | Google Books APIキー | — |
| `RAKUTEN_APP_ID` | 楽天ウェブサービス アプリID | — |
| `RAKUTEN_AFFILIATE_ID` | 楽天アフィリエイトID（将来の収益化用） | — |
| `ALLOWED_ORIGINS` | CORS許可オリジン | `https://bookstackhub.example.com` |
| `IMAGE_CACHE_DIR` | 画像キャッシュディレクトリ | `/data/images` |
| `IMAGE_MAX_WIDTH` | 表紙画像の最大幅（px） | `400` |
| `IMAGE_QUALITY` | WebP画像品質（1-100） | `80` |
| `CELERY_BROKER_URL` | Celeryブローカー | `redis://redis:6379/1` |
| `ADMIN_EMAIL` | 初期管理者メールアドレス | — |
| `ADMIN_PASSWORD` | 初期管理者パスワード | — |
| `AWS_SES_REGION` | AWS SESリージョン | `ap-northeast-1` |
| `AWS_SES_ACCESS_KEY_ID` | AWS SES アクセスキー | — |
| `AWS_SES_SECRET_ACCESS_KEY` | AWS SES シークレットキー | — |
| `AWS_SES_FROM_EMAIL` | メール送信元アドレス | `noreply@bookstackhub.example.com` |
| `TURNSTILE_SITE_KEY` | Cloudflare Turnstile サイトキー | — |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile シークレットキー | — |
| `TUNNEL_TOKEN` | Cloudflare Tunnel トークン | — |

---

## 4. 機能要件

### 4.1 ユーザー認証・認可

#### 4.1.1 認証方式

- **トークンベース認証（JWT）** を採用
  - **アクセストークン**: 有効期限 30分。`Authorization: Bearer <token>` ヘッダーで送信
  - **リフレッシュトークン**: 有効期限 30日。**HttpOnly / Secure / SameSite=Lax** Cookieに格納（外部サイトからの遷移でのログイン維持のためLaxを採用）
  - リフレッシュトークンはDBに保存し、サーバー側からの無効化（ログアウト・強制失効）を可能にする
  - **アクセストークンの保持**: セキュリティ（XSS対策）とUX（PWAとしての利便性）のバランスを考慮し、**メモリ（変数）** に保持する。ブラウザのリロード時は、アプリ初期化処理（`AuthProvider`等）で `/auth/refresh` をコールし、HttpOnly Cookie内のリフレッシュトークンを用いて新しいアクセストークンをサイレントに取得する。

#### 4.1.2 ユーザー登録（オープン型）

```
入力項目:
  - メールアドレス（必須・一意・形式バリデーション）
  - ユーザー名（必須・一意・3〜30文字・英数字とアンダースコアのみ）
  - 表示名（必須・1〜50文字）
  - パスワード（必須・8文字以上・英大文字/小文字/数字/記号のうち3種以上）
  - **Cloudflare Turnstileトークン**（必須・ボット対策）

処理:
  1. TurnstileトークンをバックエンドでCloudflare APIに検証
  2. 入力バリデーション
  3. メールアドレス・ユーザー名の重複チェック
  4. パスワードをArgon2idでハッシュ化して保存
  5. メールアドレス確認メール送信（任意: フェーズ1は省略可。省略時はメール未確認でもログイン可能とする）
  6. アクセストークン + リフレッシュトークンを発行してレスポンス
```

#### 4.1.3 ログイン

```
入力: メールアドレス + パスワード + **Cloudflare Turnstileトークン**
処理:
  1. TurnstileトークンをバックエンドでCloudflare APIに検証
  2. メールアドレスでユーザー検索
  3. Argon2idでパスワード照合
  4. 失敗時: 「メールアドレスまたはパスワードが正しくありません」（どちらが間違いか特定させない）
  5. 成功時: アクセストークン + リフレッシュトークンを発行
  6. レートリミット: 同一IPアドレスからのログイン試行を 10リクエスト/分 に制限（Redisベース）
```

#### 4.1.4 ログアウト

- リフレッシュトークンをDBから削除し、Cookieをクリア
- **制約事項**: JWTの仕様上、クライアント側で保持されているアクセストークン（有効期限30分）は、ログアウト処理後も有効期限が切れるまでは有効なままとなることを許容する。即時無効化は行わない。

#### 4.1.5 ロール・アクセス制御

| ロール | 権限 |
|:---|:---|
| `user` | 自身のデータのCRUD、公開データの閲覧 |
| `admin` | 全ユーザーの管理、不正コンテンツの削除、システム統計閲覧 |

- 他ユーザーの非公開データ（非公開メモ、非公開プレイリスト等）へのアクセスは、APIレベルで厳格に遮断する
- すべてのAPIエンドポイントで、リクエストユーザーのIDとリソースの所有者IDを照合する

### 4.2 書籍データ取得・登録

#### 4.2.1 外部API検索

```
検索フロー:
  1. ユーザーがキーワードまたはISBNで検索
  2. バックエンドが以下の順序で外部APIに問い合わせ:
     a. 自社DBのマスター書籍を検索（キャッシュヒット）
     b. キーワード検索時: Google Books API + 楽天ブックスAPI を並行リクエスト
     c. ISBN検索時: 楽天ブックス -> Google Books の順でヒットするまで検索
  3. 結果を統合・重複排除してフロントエンドに返却
  4. ユーザーが書籍を選択して本棚に追加した時点で、マスター書籍としてDBに保存

検索パラメータ:
  - q: 検索キーワード（タイトル・著者名）
  - isbn: ISBN-10 または ISBN-13
  - source: "internal" | "external" | "all"（デフォルト: "all"）
  - page: ページ番号（デフォルト: 1）
  - per_page: 1ページあたりの件数（デフォルト: 20、最大: 40）

データ統合ロジック:
  - **優先順位（書誌情報）**: 楽天ブックス > Google Books
  - **優先順位（書影）**: 楽天ブックス (高画質) > Google Books
  - **補完**: 上位APIで欠損している項目（出版日、ページ数、あらすじ等）を、下位APIの情報でマージして補完する
  - **同一性判定**: ISBN-13の一致をもって同一書籍とみなす

全体タイムアウト:
  - 外部API検索全体のタイムアウトを 10秒 とし、それ以上かかる場合は取得できたデータのみでレスポンスを返却（Best Effort）

レートリミット制御（楽天ブックスAPI対策）:
  - **Redisトークンバケット**:
    - キー: `rate_limit:rakuten_api`
    - 容量: 1 (1秒あたり1リクエスト)
    - 補充速度: 1 token / second
    - **厳格なロック制御**: CeleryワーカーとFastAPIサーバー間で共有するRedisロックを使用し、競合を完全に防ぐ。
  - **優先制御**:
    - **ユーザー検索（FastAPI）**: **高優先度**。トークンがあれば即時消費。
      - **待機仕様**: トークンが不足している場合、トークンが取得できるまで**APIリクエストを待機（キューイング）**させる。
        - **実装上の注意**: FastAPIのイベントループをブロックしないよう、必ず `await asyncio.sleep(0.1)` 等を用いた非同期ループで待機すること。`time.sleep` は厳禁。
    - **UI挙動**: フロントエンドでは「検索中...（混雑により少々お待ちください）」等の待機メッセージを表示し、ユーザーに待機を明示的に伝える。
    - **タイムアウト**: 全体タイムアウト（10秒）に達した場合は、取得できたデータ（Google Books等）のみで応答する。
    - **バッチ処理（Celery）**: **低優先度**。
      - ロジック: `get_token(block=False)` を試行。取得できなければ即時リトライせず、**必ず1秒以上待機（sleep）** してから再試行する。これによりユーザー操作用帯域を確保する。
```

#### 4.2.2 アプリ内検索

```
検索対象: 自社DBに登録済みのマスター書籍 + カスタム書籍（自分が作成したもののみ）
検索方法: PostgreSQLの全文検索（pg_trgm + GIN index）
検索フィールド: タイトル、著者名、ISBN、出版社

データ修正フロー:
  - **マスターデータの誤り**: ユーザーは「情報の誤りを報告」ボタンから管理者に通知可能。管理者は管理者ダッシュボードでマスターデータを修正できる。
  - **クレジット表記**: 書籍詳細画面には、データ取得元（Google Books, Rakuten Books等）へのリンクまたはクレジットを表示する（各API利用規約に準拠）。

マスター書籍の更新戦略:
  - **手動更新**: 管理者がダッシュボードから任意のタイミングで「外部APIから情報を再取得」を実行可能。
  - **定期更新**: 毎月15日のAM 3:00 (JST) にCelery Beatでバッチを実行。
    - 対象: 最終更新日（updated_at）が半年以上前の書籍
    - 処理: 外部APIを再クエリし、書誌情報や書影に変更があれば更新する
  - **差分確認**: 管理者画面では、更新前に既存データとの差分を確認できるUIを提供する（手動更新時）
```

#### 4.2.3 バーコードスキャン（Webカメラ）

```
フロー:
  1. ユーザーがスキャンボタンを押す
  2. html5-qrcodeライブラリでWebカメラを起動
  3. EAN-13形式のバーコードを検出
  4. ISBNを抽出してAPI検索を自動実行
  5. 検索結果を表示し、ユーザーが確認して本棚に追加

連続スキャンモード（一括登録）:
  - **モード切り替え**: 「単発」と「連続」をトグルで切り替え可能。
  - **挙動**: スキャン成功時に確認ダイアログを出さず、自動的に「蔵書」ステータスでバックグラウンド登録し、即座に次のスキャン待ち受け状態に戻る。
  - **フィードバック**: 画面下部にスキャン済み書籍のサムネイルリストをリアルタイム表示し、バイブレーションや効果音で成功を通知。
```

4.2.4 書籍表紙画像のキャッシュ

```
処理フロー:
  1. 外部APIから表紙画像URLを取得
  2. バックエンドで画像をダウンロード
  3. Pillowで以下の処理を実施:
     - 最大幅400pxにリサイズ（アスペクト比維持）
     - WebP形式に変換（品質80）
     - 再エンコードにより悪意あるペイロードを除去
  4. **SSRF対策**: 画像のダウンロード元URLは、許可されたドメイン（`books.google.com`, `thumbnail.image.rakuten.co.jp` 等）およびそのサブドメインに限定してバリデーションを行う。
  5. ファイルパス: /data/images/{isbn_or_id}.webp
  6. DBにはファイル名または相対パスを保存
  6. 配信:
     - フロントエンド: `/api/v1/images/{filename}` (認証付きプロキシ)
     - Nginx設定: `/protected_images/` を `internal` ロケーションとして定義
     - アプリケーション: 
       - **署名付きURL（Signed URL）による統一配信**:
         - **全ての画像アクセス（ログインユーザー・公開共有問わず）** において、HMAC-SHA256署名付きURLを使用する。
         - URL例: `/api/v1/images/{filename}?token={signature}&expires={timestamp}`
         - **署名生成仕様**:
           - 署名対象文字列: `{filename}:{timestamp}`
           - アルゴリズム: HMAC-SHA256
           - 鍵: `SECRET_KEY`
           - エンコーディング: Hex digest (16進数文字列)
         - **API実装**: 
           - 書籍一覧や詳細APIのレスポンスには、生のファイルパスではなく、生成済みの署名付きURLを含める。
           - 署名の有効期限は長め（例: 24時間）に設定し、ブラウザキャッシュの有効性を高める。
         - **検証ロジック**:
           - エンドポイントで `token` と `expires` を検証（ステートレス）。
           - DBアクセスを行わないため、高速に配信可能。
           - 検証成功時: `X-Accel-Redirect` で画像を返却。
           - 検証失敗/期限切れ: 403 Forbidden。
 
> **開発環境での注意**: ローカル開発（`npm run dev` + `uvicorn`）でNginxを経由しない場合、`X-Accel-Redirect` は機能せず画像が表示されない。
> これを回避するため、環境変数 `DEV_MODE=true` の場合は、FastAPIの `StaticFiles` マウント等を使用して画像を直接配信する分岐ロジックを実装することを許容する。ただし、本番環境では必ずNginx経由とする。

ファイルサイズ目安: 1冊あたり 20〜50KB
```

### 4.3 カスタム書籍登録

```
概要: 外部APIで見つからない書籍をユーザー自身が手動で登録する機能

入力項目:
  - タイトル（必須・最大200文字）
  - 著者（任意・最大5名・各最大100文字）
  - 出版社（任意・最大100文字）
  - 出版日（任意・YYYY-MM-DD形式）
  - ISBN（任意・ISBN-10またはISBN-13形式、バリデーションあり）
  - 説明（任意・最大2000文字）
  - 表紙画像（任意・ユーザーアップロード・JPEG/PNG/WebP・最大5MB） ※`multipart/form-data` でメタデータと同時に送信する
  - ページ数（任意・1〜99999）

制約:
  - カスタム書籍にはis_custom=trueフラグとcreated_by=ユーザーIDが設定される
  - 本棚に追加できるのは作成者本人のみ
  - プレイリスト経由で他ユーザーに表示されるが、他ユーザーは自分の本棚には追加不可
  - 表紙画像はアップロード時にWebP変換（最大幅400px、品質80）
  - **画像公開制限（セキュアな配信）**:
    - 全ての書影画像（カスタム・マスター問わず）は、**署名付きURL（Signed URL）** を用いて配信する。
    - アプリケーション側で署名を検証した後、Nginxの `X-Accel-Redirect` 機能を使用して画像を返す。
    - これにより、URL推測による不正アクセスやホットリンクを物理的に遮断する。

ISBN重複時の挙動:
  - 入力されたISBNが既存のマスター書籍と一致する場合:
    → バリデーションエラー（ALREADY_EXISTS）を返し、既存のマスター書籍を候補として提示する
  - 入力されたISBNが他のカスタム書籍と一致する場合:
    → 同一ユーザーの場合: バリデーションエラー。他ユーザーの場合: 登録を許可（カスタム書籍は作成者に閉じるため）
  - ISBNが未入力の場合:
    → 重複チェックは行わず、そのまま登録を許可
```

### 4.4 書籍管理（本棚機能）

#### 4.4.1 ステータス管理

| ステータス | 日本語名 | 説明 |
|:---|:---|:---|
| `want_to_read` | 読みたい | まだ持っていないが、将来読みたい本 |
| `unread` | 未読 | 手元にあるが（または購入済みだが）、まだ読み始めていない本 |
| `tsundoku` | 積読 | 購入済みだが、優先度が低く積まれている本（未読の一種だが区別する） |
| `reading` | 読書中 | 現在読んでいる本 |
| `suspended` | 中断 | 読み始めたが、途中で止まっている本 |
| `finished` | 読了 | 最後まで読み終わった本 |

> **備考**: `is_owned`（所有フラグ）はこれらとは独立して設定可能だが、通常 `unread`, `tsundoku` は `is_owned=true`である。

#### 4.4.2 付加情報

- **評価**: 1〜5の星評価（0.5刻みなし、整数のみ）。null許容
- **カスタムタグ**: ユーザー独自のタグ付け（1書籍あたり最大10タグ、タグ名最大30文字）
- **非公開メモ**: Markdown対応のプライベートメモ（最大5000文字）。フロントエンドでは **react-markdown** + **rehype-sanitize** を使用してXSSを防止
- **公開レビュー**: 他ユーザーに公開される読書感想（タイトル最大100文字、本文最大10000文字）
- **所有フラグ（is_owned）**: ステータスとは独立した「物理的所有」を示すフラグ。例: 図書館で借りて読了 → status: `finished`, is_owned: `false`

#### 4.4.3 本棚表示

```
表示モード:
  - グリッド表示（表紙画像サムネイル）← デフォルト
  - リスト表示（テーブル形式）

フィルタリング:
  - ステータス別
  - タグ別
  - 評価別（★3以上、等）
  - 著者別
  - 出版年別

ソート:
  - 追加日（新しい順/古い順）
  - タイトル（あいうえお順/ABC順）
  - 評価（高い順/低い順）
  - 出版日（新しい順/古い順）

ページネーション:
  - グリッド表示: 無限スクロール（20件ずつ追加読み込み）
    - **仮想スクロール（Virtualized List）を必須採用**: 蔵書数が数千冊になってもDOMノード数を一定に保ち、メモリ消費を抑制する
    - 推奨ライブラリ: `@tanstack/react-virtual` または `react-window`
  - リスト表示・管理画面: ページネーション（1ページ20件）
```

#### 4.4.4 シリーズ本の自動グルーピング

- **データ構造**:
  - `books` テーブルに `series_title`（正規化されたシリーズ名）と `volume_number`（巻数）カラムを追加。
  - **保存時処理**: 書籍保存時にタイトルを正規表現で解析し、自動抽出して保存する。
    - 正規表現例: `^(.*?)[\s　]*[（(]?(第?(\d+)[巻\.]?|Vol\.?(\d+)|#(\d+))[)）]?$` などを適用し、シリーズ名と巻数を分離。
    - 抽出できない場合は NULL とする。
  - **手動修正**: 自動抽出はベストエフォートであるため、書籍編集画面においてユーザーが `series_title` および `volume_number` を手動で修正・入力できるUIを提供する。

- **表示仕様**:
  - **フロントエンドでの簡易グルーピング**:
    - APIからはページングされたフラットなリストが返却される。
    - フロントエンド側で、取得したリスト内に同一 `series_title` の書籍が複数存在する場合、視覚的にグルーピング表示（**本のスタック表示**や**フォルダアイコン**に「Vol.1-5」のようなバッジを付与）を行う。
    - **ページ跨ぎの許容**: ページネーションによりシリーズの一部が別ページになった場合、それは別グループとして表示されることを許容する（完全なグルーピングよりもパフォーマンスと実装の単純さを優先）。
  - **シリーズ詳細**: シリーズ名をクリックすると、そのシリーズ（`series_title`）に一致する全書籍を検索して表示する別画面またはモーダルへ遷移可能とする。

### 4.5 読書ログ

#### 4.5.1 記録機能

```
入力項目:
  - 読書日（必須・デフォルトは当日）
  - 対象書籍（必須・読書中 or 蔵書ステータスの書籍から選択）
  - 読んだページ数（任意・1〜99999）
  - 読書時間（任意・分単位・1〜1440）
  - メモ（任意・最大500文字）

制約:
  - 同一書籍・同一日付でも複数のログ登録を許可する（朝と夜に読んだ場合等）
```

#### 4.5.2 ヒートマップ（GitHub風）

```
仕様:
  - 直近1年間（52週 × 7日 = 364日分）のグリッドを表示
  - 色分け基準: **読書ログ件数**（1日の記録回数）を基準とする（ページ数はツールチップでの表示のみ）
  - 各日のセルの色の濃さは4段階で表現:
    - 0件: グレー（#ebedf0）
    - 1件: 薄い緑（#9be9a8）
    - 2〜3件: 中緑（#40c463）
    - 4件以上: 濃い緑（#216e39）
  - セルをホバーすると、日付・読書冊数・ページ数のツールチップを表示
  - レスポンシブ対応: スマホでは直近6ヶ月分を表示

API:
  GET /api/v1/reading-logs/heatmap?year=2026
  レスポンス: { "2026-01-01": { "count": 2, "total_pages": 45 }, ... }

キャッシュ戦略:
  - ヒートマップデータはログイン時またはバッチ処理で集計し、Redisにキャッシュ（TTL: 1時間）
  - 読書ログ追加/編集/削除時にキャッシュを無効化
```

### 4.6 プレイリスト・共有機能

```
作成:
  - タイトル（必須・最大100文字）
  - 説明（任意・最大1000文字）
  - 書籍の追加・削除・並び替え（ドラッグ&ドロップ対応）
  - 1プレイリストあたりの書籍数上限: 100冊
  - 1ユーザーあたりのプレイリスト数上限: 50

公開設定:
  - デフォルト: 非公開
  - 公開に変更すると、閲覧専用のユニークURLスラッグを自動生成
    - 生成方法: `secrets.token_urlsafe(16)` を使用し、推測不可能なURLを保証
    - 形式: /share/{ランダム英数字}
    - **画像アクセス**: プレイリストに含まれる書籍の表紙画像URLには、**署名付きToken（有効期限1時間）** を付与し、未ログインユーザーでも閲覧可能にする。

OGP画像生成:
  - プレイリストを公開した際に、Celeryタスクで非同期生成
  - サイズ: 1200×630px（OG:image推奨サイズ）
  - フォーマット: WebP（フォールバック用にPNGも生成）
  - フォント: Noto Sans JP Bold/Regular
  - レイアウト仕様:
    - 背景: ブランドカラーのグラデーション（Primary → Primary Dark）
    - 左半分: プレイリストタイトル（白文字, 36px Bold）+ 冊数・作成者名（20px Regular）
    - 右半分: 代表書籍の表紙画像を最大4冊、2×2グリッドで配置（各画像120×180px、角丸8px、影付き）
    - 右下: アプリロゴ（透かし）16px）

#### 4.6.3 書籍SNS共有画像生成

```

概要: 読了時や推奨したい時に、書籍単体のリッチなシェア画像を動的に生成する

UIフロー:

  1. 書籍詳細画面（/books/{id}）に「シェア画像を作成」ボタンを配置
  2. ボタン押下でモーダルを表示:
     - 感想テキスト入力フィールド（最大140文字、任意）
     - サイズ選択: 「OGP（横長）」 / 「ストーリー（縦長）」のトグル
     - 「生成する」ボタン
  3. 生成ボタン押下 → POST /api/v1/me/books/{user_book_id}/share-image
  4. Celeryタスクで非同期生成。モーダル内にプログレス表示（ポーリング）
  5. 生成完了後、モーダル内にプレビュー表示 + 「ダウンロード」ボタン

デザイン:

- 書籍の表紙画像（メイン、左寄せ or 中央配置）
- ユーザーの評価（★）
- 短い感想・引用（最大140文字）
- 背景: 表紙画像から抽出したドミナントカラーを使用したぼかし背景
  - **抽出ライブラリ**: `colorgram.py` または Pillow のヒストグラム機能
  - **ロジック**: 上位色から彩度が低すぎる色（白・黒・グレー）を除外し、最も面積比が大きい色を採用
    - **除外基準**: HSV色空間において、彩度(S)が10%未満、または明度(V)が10%未満の色
- 右下にアプリロゴ（透かし）

サイズ:

- OGPサイズ: 1200×630px
- ストーリーサイズ: 1080×1920px

フォント: **Noto Sans JP**（Google Fonts）のBold/Regular
形式: PNG（各SNSでの互換性重視）

```

### 4.7 ダッシュボード

```

構成要素:

  1. 統合検索バー
     - 1つの検索バーからアプリ内検索・外部API検索の両方を実行
     - タブまたはトグルで検索対象（アプリ内 / 外部API / すべて）を切り替え

  2. 読書統計サマリー
     - 今月の読書冊数 / 今年の累計冊数
     - 直近の読書ログ

  3. 読書ヒートマップ（GitHub風）
     - セクション4.5.2の仕様に準拠

  4. 本棚クイックアクセス
     - ステータス別の冊数サマリー
     - 最近追加した書籍（直近5冊）

  5. 統計グラフ
     - 月別読了冊数（棒グラフ）
     - ジャンル比率（ドーナツチャート）
     - 直近12ヶ月の購入金額推移（折れ線グラフ）※ user_books.purchase_price（任意入力）を集計

  6. 読書中の書籍
     - 現在「読書中」ステータスの書籍一覧（進捗率表示）

キャッシュ戦略:

- ダッシュボード統計データはRedisにキャッシュ（TTL: 1時間）
- データ更新時（書籍追加・ステータス変更・ログ追加）に関連キャッシュを無効化
- 統計再集計はCeleryタスクにオフロード。キャッシュが存在しない場合は「集計中...」のスケルトンUIを表示

```

### 4.8 年間読書レポート

```

概要: 1年間の読書活動を集約したビジュアルレポートを自動生成

内容:

- 年間読了冊数・総ページ数
- 最も読んだジャンルBEST3
- 最高評価を付けた書籍
- 月別読了冊数グラフ
- 読書ヒートマップ（年間）

SNS共有画像:

- 上記データを1枚の画像（1080×1920px、スマホフルスクリーン比率）に合成
- Celeryタスクで非同期生成
- Pillowでテキスト・グラフ・書影画像を動的にレンダリング
- **フォント**: Noto Sans JP（Google Fonts）Bold/Regular
- **デザイン**: 白背景(#FFFFFF)ベース、ブランドカラーをアクセント。中央にタイトル、下部に書影と著者名を配置
- フォーマット: PNG（SNS共有時の互換性重視）
- ダウンロードボタンでユーザーが取得可能

生成タイミング:

- 年末（12月31日）にCelery Beatで自動生成
- ダッシュボードから任意のタイミングで手動生成も可能

```

### 4.9 管理者ダッシュボード

```

アクセス: roleが"admin"のユーザーのみ。/admin 以下のルート。

機能:

  1. ユーザー管理
     - ユーザー一覧（検索・ソート・ページネーション）
     - ユーザー詳細閲覧
     - アカウントの有効/無効切り替え（is_active）
     - ロール変更（user ↔ admin）
     - アカウント削除（論理削除）

  2. コンテンツ管理
     - 公開レビュー一覧・不適切なレビューの非公開化
     - 公開プレイリスト一覧・不適切なプレイリストの非公開化

  3. システム統計
     - 総ユーザー数・アクティブユーザー数（直近30日）
     - 総書籍数（マスター / カスタム別）
     - 総レビュー数・プレイリスト数
     - 新規ユーザー登録推移グラフ

  4. 初期管理者
     - コンテナ起動時に `ADMIN_EMAIL` 環境変数を確認
     - **冪等性の担保**:
       - 該当メールアドレスのユーザーが既に存在する場合: **何もしない**（スキップ）
       - 存在しない場合: 新規作成し、`ADMIN_PASSWORD` でパスワードを設定、ロールを `admin` に設定
       - 環境変数が設定されていない場合: スキップ

```

### 4.10 データインポート・エクスポート

```

#### 4.10.1 インポート機能

対応フォーマット:

- BookStackHub標準CSV（必須カラム: `isbn` または `isbn13`, `title`）
- BookStackHub標準JSON（同様のスキーマ）
- ブクログエクスポートCSV対応

CSV標準スキーマ:

| カラム名（ヘッダー） | 必須 | 説明 |
|:---|:---|:---|
| `isbn` | ○（titleがない場合） | ISBN-10 または ISBN-13（ハイフン有無は問わない） |
| `title` | ○（isbnがない場合） | 書籍タイトル |
| `authors` | - | 著者名（複数の場合はセミコロン `;` 区切り） |
| `publisher` | - | 出版社 |
| `status` | - | ステータス（`owned`, `want_to_read`, `finished` 等のコード値） |
| `rating` | - | 評価（1-5の整数） |
| `memo` | - | メモ |
| `published_date` | - | 出版日（YYYY-MM-DD） |

処理フロー:

  1. ユーザーがファイルをアップロード
  2. Celeryタスクで非同期バックグラウンド処理
  3. ISBNまたはタイトル・著者名で**DB内のマスター書籍のみ**を照合（**外部API検索は行わない**）
     - **API検索スキップの理由**: 大量インポート時のAPIレートリミット回避と処理時間短縮のため。
     - DBに存在しない書籍は、CSVの情報を元に一時的に最小限の情報で登録するか、またインポート後にバッチで補完することを検討（フェーズ1ではCSV情報のみで登録）。
     - **マージルール**:
       - **未登録書籍の扱い**: DBにも外部API検索でも見つからない（ISBN一致なし）レコードは、**カスタム書籍（`is_custom=true`）** として登録する。
       - **基本情報**（タイトル、著者等）: **DB内のマスターデータを優先**し、CSVの値では上書きしない。
       - **ユーザー固有データ**（ステータス、評価、メモ等）: **既存データを維持**し、CSVの値では上書きしない。DB側がNULLの項目のみCSVの値で埋める。
       - **不完全な日付**: CSVの日付が「YYYY」や「YYYY-MM」の場合、**その期間の1日（ついたち）**として扱う（例: `2023` → `2023-01-01`）。
  4. 完了時にポーリング（間隔: 5秒）で通知

ポーリング用API:
  GET /api/v1/tasks/{task_id}/status
  レスポンス: { "status": "pending" | "processing" | "completed" | "failed", "progress": 75, "total": 100, "errors": [...] }

#### 4.10.2 エクスポート機能

用途: バックアップ、他サービスへの移行
出力内容:

- 登録書籍データ（ISBN, タイトル, 著者, ステータス, 評価, 入力日時）
- 読書ログ
- レビュー、メモ
形式: CSV および JSON
オプション: 表紙画像データの書き出し（Zipアーカイブ化、サイズが大きくなるため選択式）

```

### 4.11 PWAオフライン対応

```

キャッシュ戦略:

- App Shell: HTMLシェル・CSS・JSをService Workerでプリキャッシュ
- 本棚データ: **表示した分のみ**をクライアントサイド（TanStack Query persistence / Cache API）にキャッシュし、オフライン時に閲覧可能とする（全データの完全同期は行わない）
- 表紙画像: Cache APIでキャッシュ（LRU方式、最大200枚）
- APIレスポンス: NetworkFirstストラテジー（オフライン時はキャッシュからフォールバック）

オフライン時の制限:

- 閲覧のみ可能（データの追加・編集・削除は不可）
- オフラインバナーを画面上部に表示し、制限状態であることを明示

PWAマニフェスト:

- name: "BookStackHub"
- short_name: "BSH"
- theme_color / background_color: ブランドカラーに合わせる
- display: "standalone"
- アイコン: 192×192, 512×512（maskable対応）

```

---

## 5. API仕様

### 5.1 共通仕様

```

ベースURL: /api/v1
Content-Type: application/json
認証: Authorization: Bearer <access_token>（認証必須エンドポイント）

ページネーション（一覧系）:
  クエリパラメータ: page（デフォルト1）, per_page（デフォルト20, 最大50）
  ページネーション情報: レスポンスボディ内の meta フィールドに統一

レスポンス形式:
  成功: { "data": <リソース>, "meta": { "page": 1, "per_page": 20, "total": 100, "total_pages": 5 } }
  エラー: { "error": { "code": "<エラーコード>", "message": "<メッセージ>", "details": [...] } }

データ契約・スキーマ:

- リクエストボディ: 原則 **JSON**。ファイルアップロードを含む場合のみ **multipart/form-data**
- スキーマ定義: OpenAPI (Swagger) を正とする。フロントエンドはOpenAPI定義から型を自動生成することを推奨（推奨ツール: `orval` または `openapi-typescript`）

```

### 5.2 エンドポイント一覧

#### 認証 API

| メソッド | パス | 認証 | 説明 |
|:---|:---|:---|:---|
| POST | `/auth/register` | 不要 | ユーザー新規登録 |
| POST | `/auth/login` | 不要 | ログイン |
| POST | `/auth/logout` | 必要 | ログアウト |
| POST | `/auth/refresh` | Cookie | アクセストークン再発行 |
| GET | `/auth/me` | 必要 | ログインユーザー情報取得 |
| POST | `/auth/forgot-password` | 不要 | パスワードリセットメール送信 |
| GET | `/auth/verify-reset-token` | 不要 | パスワードリセットトークン有効性確認 |
| POST | `/auth/reset-password` | 不要 | パスワードリセット実行（トークン必須） |

#### ユーザー API

| メソッド | パス | 認証 | 説明 |
|:---|:---|:---|:---|
| GET | `/users/{user_id}` | 必要 | ユーザープロフィール取得 |
| PATCH | `/users/{user_id}` | 必要（本人） | プロフィール更新 |
| DELETE | `/users/{user_id}` | 必要（本人/admin） | アカウント削除（論理削除） |
| PATCH | `/users/{user_id}/password` | 必要（本人） | パスワード変更 |
| POST | `/users/{user_id}/avatar` | 必要（本人） | アバター画像アップロード |

#### 書籍 API

| メソッド | パス | 認証 | 説明 |
|:---|:---|:---|:---|
| GET | `/books/search` | 必要 | 書籍検索（内部/外部/統合） |
| GET | `/books/{book_id}` | 必要 | 書籍詳細取得 |
| POST | `/books/custom` | 必要 | カスタム書籍の手動登録（multipart/form-dataで画像同時送信） |
| PATCH | `/books/custom/{book_id}` | 必要（作成者） | カスタム書籍の編集 |
| DELETE | `/books/custom/{book_id}` | 必要（作成者/admin） | カスタム書籍の削除 |
| POST | `/books/{book_id}/cover` | 必要（カスタム書籍作成者） | 表紙画像アップロード |

#### ユーザー書籍 API（本棚）

| メソッド | パス | 認証 | 説明 |
|:---|:---|:---|:---|
| GET | `/me/books` | 必要 | 自分の本棚一覧 |
| POST | `/me/books` | 必要 | 書籍を本棚に追加 |
| PATCH | `/me/books/{user_book_id}` | 必要 | ステータス・評価・メモの更新 |
| DELETE | `/me/books/{user_book_id}` | 必要 | 本棚から削除 |
| GET | `/users/{user_id}/books` | 必要 | 他ユーザーの本棚閲覧（公開情報のみ） |

#### 読書ログ API

| メソッド | パス | 認証 | 説明 |
|:---|:---|:---|:---|
| GET | `/me/reading-logs` | 必要 | 読書ログ一覧 |
| POST | `/me/reading-logs` | 必要 | 読書ログ記録 |
| PATCH | `/me/reading-logs/{log_id}` | 必要 | 読書ログ編集 |
| DELETE | `/me/reading-logs/{log_id}` | 必要 | 読書ログ削除 |
| GET | `/me/reading-logs/heatmap` | 必要 | ヒートマップデータ取得 |

#### レビュー API

| メソッド | パス | 認証 | 説明 |
|:---|:---|:---|:---|
| GET | `/books/{book_id}/reviews` | 必要 | 書籍のレビュー一覧（公開のみ） |
| POST | `/me/reviews` | 必要 | レビュー投稿 |
| PATCH | `/me/reviews/{review_id}` | 必要 | レビュー編集 |
| DELETE | `/me/reviews/{review_id}` | 必要（本人/admin） | レビュー削除 |

#### プレイリスト API

| メソッド | パス | 認証 | 説明 |
|:---|:---|:---|:---|
| GET | `/me/playlists` | 必要 | 自分のプレイリスト一覧 |
| POST | `/me/playlists` | 必要 | プレイリスト作成 |
| GET | `/playlists/{playlist_id}` | 必要 | プレイリスト詳細（非公開は所有者のみ） |
| PATCH | `/playlists/{playlist_id}` | 必要（所有者） | プレイリスト編集 |
| DELETE | `/playlists/{playlist_id}` | 必要（所有者/admin） | プレイリスト削除 |
| POST | `/playlists/{playlist_id}/items` | 必要（所有者） | 書籍追加 |
| DELETE | `/playlists/{playlist_id}/items/{item_id}` | 必要（所有者） | 書籍削除 |
| PATCH | `/playlists/{playlist_id}/items/reorder` | 必要（所有者） | 並び替え |
| GET | `/share/{slug}` | **不要** | 公開プレイリスト閲覧 |

#### タグ API

| メソッド | パス | 認証 | 説明 |
|:---|:---|:---|:---|
| GET | `/me/tags` | 必要 | 自分のタグ一覧 |
| POST | `/me/tags` | 必要 | タグ作成 |
| PATCH | `/me/tags/{tag_id}` | 必要 | タグ名変更 |
| DELETE | `/me/tags/{tag_id}` | 必要 | タグ削除 |

#### 統計・レポート API

| メソッド | パス | 認証 | 説明 |
|:---|:---|:---|:---|
| GET | `/me/stats/overview` | 必要 | ダッシュボード統計 |
| GET | `/me/stats/yearly-report` | 必要 | 年間読書レポートデータ |
| POST | `/me/stats/yearly-report/image` | 必要 | SNS共有用画像生成（Celeryタスク） |
| GET | `/me/stats/yearly-report/image/{year}` | 必要 | 生成済み画像取得 |

#### 書籍共有画像 API

| メソッド | パス | 認証 | 説明 |
|:---|:---|:---|:---|
| POST | `/me/books/{user_book_id}/share-image` | 必要 | 書籍SNS共有画像生成リクエスト（Celeryタスク。リクエストボディで感想テキスト・サイズを指定） |
| GET | `/me/books/{user_book_id}/share-image/{format}` | 必要 | 生成済み共有画像取得（format: `ogp` \| `story`） |

#### データインポート・エクスポート API

| メソッド | パス | 認証 | 説明 |
|:---|:---|:---|:---|
| POST | `/me/import` | 必要 | データインポート開始（multipart/form-data。Celeryタスクで非同期処理） |
| POST | `/me/export` | 必要 | データエクスポートリクエスト（Celeryタスクで非同期生成） |
| GET | `/me/export/{task_id}/download` | 必要 | エクスポートファイルダウンロード（生成完了後に取得可能） |

#### 管理者 API

| メソッド | パス | 認証 | 説明 |
|:---|:---|:---|:---|
| GET | `/admin/users` | admin | ユーザー一覧 |
| PATCH | `/admin/users/{user_id}` | admin | ユーザー状態変更（有効/無効、ロール） |
| DELETE | `/admin/users/{user_id}` | admin | ユーザー削除 |
| GET | `/admin/stats` | admin | システム統計 |
| GET | `/admin/reviews` | admin | 公開レビュー一覧（モデレーション用） |
| PATCH | `/admin/reviews/{review_id}` | admin | レビュー非公開化 |
| GET | `/admin/playlists` | admin | 公開プレイリスト一覧 |
| PATCH | `/admin/playlists/{playlist_id}` | admin | プレイリスト非公開化 |
| POST | `/admin/books/refresh` | admin | 書籍情報更新バッチ手動実行（対象: 半年以上未更新のもの） |

#### OGP API

| メソッド | パス | 認証 | 説明 |
|:---|:---|:---|:---|
| GET | `/ogp/playlist/{slug}` | 不要 | プレイリストOGP画像 |

#### ヘルスチェック・タスク API

| メソッド | パス | 認証 | 説明 |
|:---|:---|:---|:---|
| GET | `/health` | 不要 | システムヘルスチェック（DB・Redis接続確認） |
| GET | `/tasks/{task_id}/status` | 必要 | 非同期タスクの進捗確認（ポーリング用） |

---

## 6. データモデル

### 6.1 ER概要

```

Users ─────┐
  │        │
  │ 1:N    │ 1:N
  ▼        ▼
UserBooks  Playlists
  │          │
  │ N:1      │ 1:N
  ▼          ▼
Books ◀── PlaylistItems
  │
  │ 1:N
  ▼
Reviews    ReadingLogs    Tags ─── UserBookTags

```

### 6.2 テーブル定義

#### users

| カラム | 型 | 制約 | 説明 |
|:---|:---|:---|:---|
| id | UUID | PK, DEFAULT gen_random_uuid() | ユーザーID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | メールアドレス |
| username | VARCHAR(30) | UNIQUE, NOT NULL | ユーザー名（URL用） |
| display_name | VARCHAR(50) | NOT NULL | 表示名 |
| password_hash | VARCHAR(255) | NOT NULL | Argon2idハッシュ |
| avatar_url | VARCHAR(500) | NULL | アバター画像パス |
| bio | TEXT | NULL | 自己紹介（最大500文字） |
| locale | VARCHAR(5) | NOT NULL, DEFAULT 'ja' | 言語設定（ja/en） |
| role | VARCHAR(10) | NOT NULL, DEFAULT 'user' | ロール（user/admin） |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | アカウント有効フラグ |
| is_profile_public | BOOLEAN | NOT NULL, DEFAULT true | プロフィール公開フラグ |
| deactivated_at | TIMESTAMPTZ | NULL | 退会申請日時（論理削除開始基準日） |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 更新日時 |

> **`is_profile_public` の制御範囲**: このフラグは**一括制御**。`false` の場合、以下が他ユーザーから非公開になる:
> - 本棚一覧（`/users/{username}`）
> - 読書ログ・ヒートマップ
> - 公開レビューの著者情報（レビュー自体は公開のままだが、ユーザー名は「匿名ユーザー」と表示）
> - 公開プレイリストは影響を受けない（共有URL経由で引き続きアクセス可能）

#### books

| カラム | 型 | 制約 | 説明 |
|:---|:---|:---|:---|
| id | UUID | PK, DEFAULT gen_random_uuid() | 書籍ID |
| isbn_10 | VARCHAR(10) | NULL, INDEX | ISBN-10 |
| isbn_13 | VARCHAR(13) | NULL, INDEX | ISBN-13 |
| title | VARCHAR(500) | NOT NULL | タイトル |
| subtitle | VARCHAR(500) | NULL | サブタイトル |
| series_title | VARCHAR(200) | NULL, INDEX | 正規化されたシリーズ名（自動抽出） |
| volume_number | VARCHAR(20) | NULL | 巻数（自動抽出）。数値ソート用に左ゼロ埋め等の正規化を推奨 |
| authors | JSONB | NOT NULL, DEFAULT '[]' | 著者リスト |
| publisher | VARCHAR(200) | NULL | 出版社 |
| published_date | DATE | NULL | 出版日（不完全な日付は、その期間の1日として保存） |
| description | TEXT | NULL | 説明文 |
| page_count | INTEGER | NULL | ページ数 |
| cover_image_path | VARCHAR(500) | NULL | ローカル画像パス |
| cover_image_original_url | VARCHAR(1000) | NULL | 元画像URL |
| categories | JSONB | NOT NULL, DEFAULT '[]' | カテゴリリスト |
| language | VARCHAR(10) | NULL | 言語コード |
| source | VARCHAR(20) | NOT NULL | 取得元（google_books/rakuten/ndl/openbd/custom） |
| source_id | VARCHAR(255) | NULL | 外部APIのID（URL等を含むため長さを確保） |
| is_custom | BOOLEAN | NOT NULL, DEFAULT false | カスタム書籍フラグ |
| created_by | UUID | NULL, FK(users.id) ON DELETE SET NULL | カスタム書籍の作成者 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 更新日時 |

**インデックス**: 
- `idx_books_title_trgm (title gin_trgm_ops)` — タイトル全文検索用
- `idx_books_authors_gin (authors)` — 著者名検索用（JSONB GINインデックス）

#### user_books

| カラム | 型 | 制約 | 説明 |
|:---|:---|:---|:---|
| id | UUID | PK | ユーザー書籍ID |
| user_id | UUID | FK(users.id) ON DELETE CASCADE, NOT NULL | ユーザーID |
| book_id | UUID | FK(books.id) ON DELETE CASCADE, NOT NULL | 書籍ID |
| status | VARCHAR(20) | NOT NULL | ステータス（want_to_read/unread/tsundoku/reading/suspended/finished） |
| rating | SMALLINT | NULL, CHECK(1-5) | 評価 |
| private_memo | TEXT | NULL | 非公開メモ |
| is_owned | BOOLEAN | NOT NULL, DEFAULT false | 所有フラグ |
| purchase_price | INTEGER | NULL | 購入金額（円、任意入力。ダッシュボードの購入金額推移グラフに使用） |
| started_reading_at | DATE | NULL | 読書開始日 |
| finished_reading_at | DATE | NULL | 読了日 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 追加日時 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 更新日時 |

**制約**: `UNIQUE(user_id, book_id)`

#### reading_logs

| カラム | 型 | 制約 | 説明 |
|:---|:---|:---|:---|
| id | UUID | PK | ログID |
| user_id | UUID | FK(users.id) ON DELETE CASCADE, NOT NULL | ユーザーID |
| book_id | UUID | FK(books.id) ON DELETE CASCADE, NOT NULL | 書籍ID |
| read_date | DATE | NOT NULL | 読書日 |
| pages_read | INTEGER | NULL, CHECK(>=1) | 読んだページ数 |
| minutes_read | INTEGER | NULL, CHECK(1-1440) | 読書時間（分） |
| note | VARCHAR(500) | NULL | メモ |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 作成日時 |

**インデックス**: `idx_reading_logs_user_date (user_id, read_date)`

#### reviews

| カラム | 型 | 制約 | 説明 |
|:---|:---|:---|:---|
| id | UUID | PK | レビューID |
| user_id | UUID | FK(users.id) ON DELETE CASCADE, NOT NULL | ユーザーID |
| book_id | UUID | FK(books.id) ON DELETE CASCADE, NOT NULL | 書籍ID |
| title | VARCHAR(100) | NOT NULL | レビュータイトル |
| body | TEXT | NOT NULL | 本文（最大10000文字） |
| is_public | BOOLEAN | NOT NULL, DEFAULT false | 公開フラグ |
| published_at | TIMESTAMPTZ | NULL | 公開日時 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 更新日時 |

**制約**: `UNIQUE(user_id, book_id)` — 1ユーザーにつき1書籍1レビュー

#### playlists

| カラム | 型 | 制約 | 説明 |
|:---|:---|:---|:---|
| id | UUID | PK | プレイリストID |
| user_id | UUID | FK(users.id) ON DELETE CASCADE, NOT NULL | 所有者ID |
| title | VARCHAR(100) | NOT NULL | タイトル |
| description | TEXT | NULL | 説明 |
| is_public | BOOLEAN | NOT NULL, DEFAULT false | 公開フラグ |
| share_slug | VARCHAR(32) | UNIQUE, NULL | 共有URLスラッグ（`secrets.token_urlsafe(16)` で生成、約22文字） |
| ogp_image_path | VARCHAR(500) | NULL | OGP画像パス |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 更新日時 |

#### playlist_items

| カラム | 型 | 制約 | 説明 |
|:---|:---|:---|:---|
| id | UUID | PK | アイテムID |
| playlist_id | UUID | FK(playlists.id) ON DELETE CASCADE, NOT NULL | プレイリストID |
| book_id | UUID | FK(books.id) ON DELETE CASCADE, NOT NULL | 書籍ID |
| position | INTEGER | NOT NULL | 並び順 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 追加日時 |

**制約**: `UNIQUE(playlist_id, book_id)`

#### tags

| カラム | 型 | 制約 | 説明 |
|:---|:---|:---|:---|
| id | UUID | PK | タグID |
| user_id | UUID | FK(users.id) ON DELETE CASCADE, NOT NULL | 所有者ID |
| name | VARCHAR(30) | NOT NULL | タグ名 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 作成日時 |

**制約**: `UNIQUE(user_id, name)` — ユーザーごとにタグ名は一意

#### user_book_tags

| カラム | 型 | 制約 | 説明 |
|:---|:---|:---|:---|
| user_book_id | UUID | FK(user_books.id) ON DELETE CASCADE | ユーザー書籍ID |
| tag_id | UUID | FK(tags.id) ON DELETE CASCADE | タグID |

**制約**: `PK(user_book_id, tag_id)`

#### refresh_tokens

| カラム | 型 | 制約 | 説明 |
|:---|:---|:---|:---|
| id | UUID | PK | トークンID |
| user_id | UUID | FK(users.id) ON DELETE CASCADE, NOT NULL | ユーザーID |
| token_hash | VARCHAR(255) | UNIQUE, NOT NULL | トークンのSHA-256ハッシュ |
| expires_at | TIMESTAMPTZ | NOT NULL | 有効期限 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 作成日時 |

#### password_reset_tokens

| カラム | 型 | 制約 | 説明 |
|:---|:---|:---|:---|
| id | UUID | PK | トークンID |
| user_id | UUID | FK(users.id) ON DELETE CASCADE, NOT NULL | ユーザーID |
| token_hash | VARCHAR(255) | UNIQUE, NOT NULL | トークンのSHA-256ハッシュ |
| expires_at | TIMESTAMPTZ | NOT NULL | 有効期限（1時間） |
| used_at | TIMESTAMPTZ | NULL | 使用日時 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 作成日時 |

> **`updated_at` 自動更新**: 全テーブルの `updated_at` はSQLAlchemyの `onupdate=func.now()` を採用し、レコード更新時に自動で現在時刻を設定する。
> **タイムゾーン**: 全ての `TIMESTAMPTZ` 型カラムは **UTC** で保存する。フロントエンドでの表示時に `Intl.DateTimeFormat` や `date-fns` 等を用いてユーザーのローカルタイムゾーン（JST等）に変換する。
> **削除種別**: `users` テーブルは `is_active=false` による論理削除を用いるが、`user_books`, `playlist_items` 等の関連テーブルからの削除は **物理削除** とする。ユーザー退会時の完全削除（30日後）では、全関連データが CASCADE により物理削除される。

---

## 7. 画面一覧・UI設計指針

### 7.1 ページ一覧

| パス | ページ名 | 認証 | 概要 |
|:---|:---|:---|:---|
| `/` | ランディングページ | 不要 | アプリ紹介・ログインへの導線 |
| `/login` | ログイン | 不要 | ログインフォーム |
| `/register` | ユーザー登録 | 不要 | 登録フォーム |
| `/forgot-password` | パスワードリセット申請 | 不要 | メールアドレス入力フォーム |
| `/reset-password` | パスワードリセット実行 | 不要 | 新パスワード入力フォーム（トークン付きURL経由） |
| `/dashboard` | ダッシュボード | 必要 | メイン画面（統計・検索・本棚概要） |
| `/bookshelf` | 本棚 | 必要 | 書籍管理（グリッド/リスト表示） |
| `/books/{id}` | 書籍詳細 | 必要 | 書籍情報・レビュー・本棚への追加操作 |
| `/books/add` | 書籍追加 | 必要 | 検索・バーコードスキャン・手動登録 |
| `/reading-log` | 読書ログ | 必要 | ログ一覧・ヒートマップ |
| `/playlists` | プレイリスト一覧 | 必要 | 自分のプレイリスト管理 |
| `/playlists/{id}` | プレイリスト詳細 | 必要 | プレイリスト編集・書籍管理 |
| `/share/{slug}` | 公開プレイリスト | 不要 | 閲覧専用ページ（OGP対応） |
| `/stats` | 統計・レポート | 必要 | 詳細統計・年間レポート |
| `/settings` | 設定 | 必要 | プロフィール編集・言語設定・パスワード変更 |
| `/users/{username}` | ユーザープロフィール | 必要 | 他ユーザーの公開情報（公開本棚・プレイリスト） |
| `/admin` | 管理者ダッシュボード | admin | ユーザー管理・コンテンツ管理・システム統計 |

### 7.2 ランディングページコンテンツ構成

```

セクション構成:

  1. ヒーローセクション
     - キャッチコピー: 「あなたの読書体験を、もっと豊かに。」（仮。実装時に調整可）
     - サブコピー: 「書籍の検索・管理・共有を一元化するデジタル本棚」
     - 新規登録CTAボタン（Primary色、大サイズ）+ 「ログイン」テキストリンク
     - ダッシュボードのモックアップスクリーンショット（開発初期は /public/images/hero-mockup.webp に配置、後で実際のスクリーンショットに差し替え）
  2. 機能紹介セクション（3カラムカード）
     - カード1: 📚 本棚管理 — 「蔵書・読みたい本・読了本をステータスで一元管理」
     - カード2: 📊 読書統計 — 「GitHub風ヒートマップで読書習慣を可視化」
     - カード3: 🔍 書籍検索 — 「バーコードスキャン＆キーワードで国内外の書籍を即座に検索」
  3. 技術スタックセクション
     - Next.js / FastAPI / PostgreSQL / Docker 等のロゴ一覧（SVGアイコン）
  4. フッター
     - コピーライト: "© {year} BookStackHub"
     - リンク: GitHub リポジトリ

```

### 7.3 レスポンシブ対応

```

ブレークポイント:

- モバイル: 〜767px（1カラム、ハンバーガーメニュー）
- タブレット: 768〜1023px（2カラム）
- デスクトップ: 1024px〜（サイドバー付き3カラム）

本棚グリッド表示:

- モバイル: 2〜3列（表紙サムネイル小）
- タブレット: 4列
- デスクトップ: 5〜6列

```

### 7.4 UI共通仕様

#### デザイントークン（Tailwind CSS テーマ設定）

```

カラーパレット:

- Primary: #2563EB（Blue 600 — メインアクション、CTA、アクティブ状態）
- Primary Dark: #1D4ED8（Blue 700 — ホバー・ヘッダー背景）
- Primary Light: #DBEAFE（Blue 100 — 薄い背景・バッジ）
- Secondary: #059669（Emerald 600 — 成功・ヒートマップ・ポジティブアクション）
- Destructive: #DC2626（Red 600 — 削除・エラー）
- Warning: #D97706（Amber 600 — 警告・注意）
- Background: #FFFFFF（ライトモード）/ #0F172A（Slate 900、ダークモード）
- Surface: #F8FAFC（Slate 50）/ #1E293B（Slate 800、ダークモード）
- Text Primary: #0F172A（Slate 900）/ #F1F5F9（Slate 100、ダークモード）
- Text Secondary: #64748B（Slate 500）/ #94A3B8（Slate 400、ダークモード）
- Border: #E2E8F0（Slate 200）/ #334155（Slate 700、ダークモード）

フォント:

- 見出し: Inter（Google Fonts）
- 本文: "Inter", "Noto Sans JP", system-ui, sans-serif
- 等幅: "JetBrains Mono", monospace

角丸:

- Small: 6px（バッジ・タグ）
- Medium: 8px（カード・ボタン）
- Large: 12px（モーダル・ドロップダウン）
- Full: 9999px（アバター）

シャドウ:

- sm: 0 1px 2px rgba(0,0,0,0.05)
- md: 0 4px 6px rgba(0,0,0,0.07)
- lg: 0 10px 15px rgba(0,0,0,0.1)

ダークモード:

- shadcn/ui の dark モード（class ベース切り替え）を採用
- ユーザーのシステム設定を初期値とし、設定画面から手動切り替えも可能
- 設定値は localStorage に保存

```

#### Toast通知仕様

```

ライブラリ: shadcn/ui の Sonner（toast）コンポーネント

表示位置: 画面右下（デスクトップ）/ 画面下部中央（モバイル）
表示時間: 4秒（自動消去）。エラーは6秒
最大スタック数: 3件（古い通知から自動消去）
手動消去: 右スワイプまたは×ボタン

バリエーション:

- success: 緑アイコン（✓）— 操作成功時
- error: 赤アイコン（✕）— エラー時
- warning: 黄アイコン（⚠）— 警告時
- info: 青アイコン（ℹ）— 情報通知

使用場面:

- 書籍を本棚に追加:「○○を本棚に追加しました」（success）
- ステータス変更:「ステータスを「読了」に変更しました」（success）
- レートリミット:「リクエスト回数の上限に達しました。しばらくお待ちください」（warning）
- サーバーエラー:「サーバーエラーが発生しました。しばらく経ってから再試行してください」（error）
- 認証切れ:「セッションが切れました。再ログインしてください」（error）→リダイレクト

```

## 8. セキュリティ要件

### 8.1 認証セキュリティ

- パスワードハッシュ: **Argon2id**（time_cost=3, memory_cost=65536, parallelism=4）
- JWT: **HS256**（SECRET_KEYは256bit以上のランダム文字列。単一サーバー構成のため共有鍵方式で十分）
- **JWT鍵ローテーション**: SECRET_KEYが漏洩した場合の手順を準備:
  1. `.env` の `SECRET_KEY` を新しいランダム値に更新
  2. コンテナを再起動（全アクセストークンが即時失効）
  3. DB上のリフレッシュトークンを全件削除（全ユーザー再ログイン強制）
  4. 定期ローテーションはフェーズ1では不要（単一サーバー、低リスク）
- リフレッシュトークン: **SHA-256ハッシュ** でDBに保存（平文保存禁止）
- **パスワードリセットトークン**: ワンタイム使用を強制。検証時に `used_at IS NULL AND expires_at > NOW()` を確認し、使用後は `used_at` に現在時刻を記録。有効期限は1時間
- CSRF対策: SameSite=Lax Cookie + Origin検証（Laxにより外部流入時のログイン維持とセキュリティを両立）
- ボット対策: **Cloudflare Turnstile**をログイン・新規登録フォームに導入。アカウントロックは行わない（DoS攻撃ベクター防止）
- ブルートフォース対策: 同一IPからの認証系APIを 10リクエスト/分 に制限（Redisベース）

### 8.2 入力バリデーション

- すべてのAPIリクエストは **Pydanticスキーマ** で厳格にバリデーション
- SQLインジェクション: **SQLAlchemy ORM** によるパラメータバインディング（生SQLの使用禁止）
- XSS: フロントエンドでのHTMLエスケープ + **Content-Security-Policy** ヘッダー設定
- ファイルアップロード: MIMEタイプ検証（JPEG/PNG/WebPのみ）、マジックバイト検証、ファイルサイズ上限5MB、ファイル名のサニタイズ、**Pillowによる再エンコード**（悪意あるペイロード除去）
- **ファイル保存ルール**: アップロードされたファイルは元のファイル名を破棄し、UUIDベースのファイル名に置換して保存（パストラバーサル防止）
  - 表紙画像: `/data/images/{uuid}.webp`
  - アバター画像: `/data/avatars/{user_id}.webp`（リサイズ: 200×200px、WebP変換、品質80）
  - デフォルトアバター: アバター未設定の場合は、表示名のイニシャルをブランドカラー背景で表示（フロントエンドで生成）

### 8.3 インフラセキュリティ

- **Cloudflare WAF**: SQLi/XSS/RFI等の攻撃をエッジで遮断
- **HTTPS強制**: Cloudflare SSL/TLS（Full Strict モード）
- **レートリミット**:
  - 認証系API: 10リクエスト/分/IP
  - 一般API: 100リクエスト/分/ユーザー
  - 外部API検索: 30リクエスト/分/ユーザー
  - 実装: Redis + FastAPIミドルウェア
- **CORSポリシー**: 許可オリジンを環境変数で制限
- **セキュリティヘッダー**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Content-Security-Policy: default-src 'self'; img-src 'self' data: https://books.google.com https://*.rakuten.co.jp; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com;`

ホットリンク対策（Hotlink Protection）:

- Cloudflareの設定で、画像ファイル（.webp, .png, .jpg）への直リンクを禁止する。
- **許可オリジン**: 自サイトドメイン、主要SNS（Twitter, Facebook, LINE, Discord, Slack）のUser-Agent/Refererのみ許可。
- これにより、意図しないサイトでの画像表示による帯域消費を防ぐ。

### 8.4 データ保護

- DBの個人情報カラムは暗号化を検討（フェーズ1では必須としない）
- **ユーザー退会フロー**:
  1. 設定画面（/settings）に「アカウント削除」ボタンを配置
  2. 押下時、確認モーダルを表示:
     - 「アカウントを削除すると、30日後に全データが完全に削除されます。この操作は取り消せません。」
     - パスワード再入力を必須とする
     - 「削除する」ボタンを赤色で表示（Destructive Action）
  3. 実行時: `is_active=false`, `deactivated_at=NOW()` に設定し、ログアウト処理を実行
  4. 30日後にCelery Beatバッチ（毎日AM 4:00 JST）で物理削除。関連データ（UserBooks, ReadingLogs, Reviews, Playlists, Tags等）もCASCADE制約と明示的な削除処理で完全削除
  5. 30日以内に再ログインを試みた場合: 「アカウントは削除予定です。復元する場合は管理者にお問い合わせください」と表示
- ログにパスワードやトークンを出力しない
- **初期管理者パスワード**: 環境変数 `ADMIN_PASSWORD` はDockerコンテナ起動時のみ参照され、アカウント作成後は不要。`.env.example` に「初回起動後に削除推奨」のコメントを記載すること

---

## 9. 非機能要件

### 9.1 パフォーマンス目標

| 指標 | 目標値 |
|:---|:---|
| APIレスポンスタイム（P95） | 500ms以下（DB参照系） |
| APIレスポンスタイム（P95） | 1000ms以下（検索・集計系、Redisキャッシュ活用前提） |
| ページ初期表示（LCP） | 2.5秒以下 |
| 同時接続ユーザー数 | 50ユーザー（自宅サーバー想定） |
| DB接続プール（FastAPI） | 最大20コネクション |
| DB接続プール（Celery Worker） | 最大5コネクション（ワーカーあたり） |
| Celery Workerプロセス数 | 2（自宅サーバーのCPUコア数に応じて調整） |

> **日本語全文検索に関する注意**: `pg_trgm` はトライグラム（3文字単位）での検索のため、日本語で1、2文字の短いキーワードでは精度が低下する。フェーズ1では許容するが、書籍数が大規模になった場合は `pg_bigm`（バイグラム）や Meilisearch 等の導入を検討すること。

### 9.2 可用性

- 自宅サーバー運用のため、99.9%のSLAは設定しない
- Cloudflare Tunnelの再接続は自動（systemdサービス管理）
- Dockerコンテナの `restart: unless-stopped` ポリシーで自動復旧

### 9.3 バックアップ

```

方針:

- DBダンプ: pg_dump を1日1回実行（毎日AM3:00 JST）
- 保持世代: 直近7日分 + 月次バックアップ3ヶ月分
- 保存先: 外部クラウドストレージ（S3互換 or Google Drive）
- 暗号化: gpg による暗号化後にアップロード
- 画像データ: rsyncで外部ストレージに同期（週次）
- 自動化: cronジョブまたはシェルスクリプト + systemd timer

```

### 9.4 ログ・モニタリング

```

アプリケーションログ:

- フォーマット: JSON構造化ログ（timestamp, level, message, request_id, user_id）
- レベル: DEBUG, INFO, WARNING, ERROR, CRITICAL
- 出力: stdout（Docker logドライバーで収集）
- 本番環境のデフォルトレベル: INFO

アクセスログ:

- Nginx: combined形式 + リクエスト処理時間
- FastAPI: リクエストID付きアクセスログミドルウェア

モニタリング（将来拡張）:

- Docker コンテナのヘルスチェック
- ディスク使用量監視（画像キャッシュ増加対策）
- 外部APIの応答速度・可用性チェック

```

---

## 10. 国際化（i18n）

### 10.1 対応言語

| 言語 | コード | 優先度 |
|:---|:---|:---|
| 日本語 | `ja` | デフォルト |
| 英語 | `en` | 第二言語 |

### 10.2 実装方針

```

フロントエンド:

- next-intl を使用
- 翻訳ファイル: messages/ja.json, messages/en.json
- URLパスベースのロケール検出は使用しない（ユーザー設定ベース）
- 未ログイン時はブラウザの Accept-Language ヘッダーからロケールを自動検出
- ログイン時はユーザーのlocale設定を使用

バックエンド:

- APIエラーメッセージはエラーコードで返却し、フロントエンドが翻訳を担当
- DBに保存されるユーザー生成コンテンツ（レビュー等）は翻訳しない

日付・数値フォーマット:

- ja: 2026年2月14日
- en: February 14, 2026
- 通貨: DB保存は数値のみ。表示はフロントエンドのロケール設定に依存（通貨記号は表示しない、数値フォーマットのみ）

```

---

## 11. CI/CD・テスト戦略

### 11.1 CI パイプライン（GitHub Actions）

```yaml
# PRおよびmainブランチへのpush時に実行
jobs:
  lint-frontend:
    - ESLint + Prettier チェック
    - TypeScript型チェック (tsc --noEmit)

  lint-backend:
    - Ruff lint + format チェック
    - mypy 型チェック

  test-frontend:
    - Vitest ユニットテスト
    - Playwright E2Eテスト（ヘッドレスChromium）

  test-backend:
    - pytest ユニット・統合テスト
    - PostgreSQL + Redis のService Containerを使用

  build:
    - Docker Compose ビルド確認
```

### 11.2 テスト方針

| レイヤー | ツール | カバレッジ目標 | 対象 |
|:---|:---|:---|:---|
| バックエンド ユニット | pytest | 80%以上 | サービス層・リポジトリ層 |
| バックエンド 統合 | pytest + testclient | — | APIエンドポイント |
| フロントエンド ユニット | Vitest | 70%以上 | フック・ユーティリティ |
| フロントエンド E2E | Playwright | — | 主要ユーザーフロー |

### 11.3 デプロイ

```
方式: mainブランチへのマージ → GitHub Actions → SSHでサーバーにデプロイ
手順:
  1. git pull（サーバー上）
  2. docker compose build
  3. docker compose up -d
  4. alembic upgrade head（DBマイグレーション）
  5. ヘルスチェック確認
```

---

## 12. エラーハンドリング

### 12.1 エラーレスポンス統一フォーマット

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested book was not found.",
    "details": []
  }
}
```

### 12.2 エラーコード一覧

| HTTPステータス | エラーコード | 説明 |
|:---|:---|:---|
| 400 | `VALIDATION_ERROR` | 入力バリデーションエラー |
| 400 | `INVALID_ISBN` | ISBN形式が不正 |
| 401 | `UNAUTHORIZED` | 認証が必要 |
| 401 | `TOKEN_EXPIRED` | アクセストークン期限切れ |
| 401 | `INVALID_CREDENTIALS` | ログイン失敗 |
| 403 | `FORBIDDEN` | アクセス権がない |
| 403 | `CUSTOM_BOOK_RESTRICTED` | カスタム書籍は作成者のみ追加可能 |
| 404 | `RESOURCE_NOT_FOUND` | リソースが見つからない |
| 409 | `ALREADY_EXISTS` | リソースが既に存在する（重複登録） |
| 413 | `FILE_TOO_LARGE` | アップロードファイルサイズ超過 |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | 未対応のファイル形式 |
| 422 | `UNPROCESSABLE_ENTITY` | 処理不能（ビジネスルール違反） |
| 429 | `RATE_LIMIT_EXCEEDED` | レートリミット超過 |
| 500 | `INTERNAL_ERROR` | サーバー内部エラー |
| 502 | `EXTERNAL_API_ERROR` | 外部API呼び出し失敗 |
| 503 | `SERVICE_UNAVAILABLE` | サービス利用不可 |

### 12.3 外部API障害時の振る舞い

```
フェーズ1のフォールバック順序:
  キーワード検索時:
    1. Google Books API + 楽天ブックスAPI を並行リクエスト（§4.2.1準拠）
    2. いずれか一方が失敗した場合、成功した側の結果のみで応答（Best Effort）
    3. すべて失敗: EXTERNAL_API_ERROR を返却 + 「カスタム書籍として手動登録」を案内
  ISBN検索時:
    1. 楽天ブックスAPI → ヒットしなければ Google Books API の順に検索（§4.2.1準拠）
    2. すべて失敗: EXTERNAL_API_ERROR を返却 + 「カスタム書籍として手動登録」を案内
  ※ フェーズ1.5以降: NDLサーチAPI・OpenBD等の補完APIをフォールバックチェーンに追加

タイムアウト設定:
  - 外部API個別リクエスト: 5秒（httpxのtimeout設定）
  - 外部API検索全体: 10秒（ハードリミット。§4.2.1準拠。asyncio.wait_for等で制御）
  - リトライ戦略: 同一APIへのリトライは行わない。障害時は代替APIへフォールバックし、全体タイムアウト内で収まる設計とする
```

### 12.4 エラー表示UIガイドライン

| エラー種別 | HTTPコード | UIインタラクション |
|:---|:---|:---|
| **認証切れ** | 401 | ログイン画面へ強制リダイレクト + Toast通知「セッションが切れました。再ログインしてください」 |
| **権限不足** | 403 | 画面遷移せず、Toast通知（エラー）「この操作を行う権限がありません」 |
| **バリデーション** | 400/422 | **インライン表示**: 該当するフォーム入力項目の直下に赤字でメッセージを表示 |
| **リソースなし** | 404 | **404ページ**を表示（「お探しの本は見つかりませんでした」） |
| **サーバーエラー** | 500系 | 画面上部にToast通知（エラー）またはモーダルで「サーバーエラーが発生しました。しばらく経ってから再試行してください」 |
| **ネットワーク** | - | PWAオフライン時は「オフラインモード」バナーを表示。通信失敗時は「インターネット接続を確認してください」とToast通知 |

---

## 付録

### A. 開発規約

```
Git:
  - ブランチ戦略: GitHub Flow（main + feature branches）
  - ブランチ命名: feature/<機能名>, fix/<バグ名>, docs/<ドキュメント名>
  - コミットメッセージ: Conventional Commits（feat:, fix:, docs:, chore:, refactor:）
  - PRはレビュー後にmainへマージ（個人開発の場合はセルフレビュー）

コーディング規約:
  フロントエンド:
    - ESLint + Prettier の設定に従う
    - コンポーネント: PascalCase（BookCard.tsx）
    - フック: camelCase（useBookshelf.ts）
    - 型定義: PascalCase（BookDetail, UserProfile）

  バックエンド:
    - Ruff の設定に従う（PEP 8準拠）
    - モジュール/関数: snake_case
    - クラス: PascalCase
    - 定数: UPPER_SNAKE_CASE
```

### B. 将来の拡張（フェーズ2以降）

- iOS / Android ネイティブアプリ（Flutter or React Native）
- ネイティブバーコードリーダー連携
- プッシュ通知
- ユーザー間フォロー・タイムライン機能
- 書籍のAIレコメンデーション
- 読書チャレンジ（年間目標設定）
- スマートプレイリスト（条件による自動生成）
- メールアドレス確認機能
- OpenBD / NDLサーチAPI統合（フェーズ1.5）
- WebSocketによるリアルタイム通知
- **読書メモのOCR取り込み機能**:
  - スマホカメラで書籍のページを撮影し、テキストを自動抽出
  - 技術: Google Cloud Vision API, Tesseract, または iOS/Android OS標準のOCR機能（Live Text）を活用
  - UI: 抽出したテキストを選択し、「引用」または「メモ」として読書ログに保存する機能

### C. Celeryタスク共通仕様

```
全タスク共通設定:
  - acks_late: true（タスク完了後に確認応答、完了保証）
  - 最大リトライ: 3回
  - リトライ間隔: 指数バックオフ（8秒, 64秒, 512秒）
  - タスクタイムアウト: 600秒（10分）
  - 失敗時: ログにエラー記録。ユーザー向けはポーリングAPI経由で通知

タスク一覧:
  - OGP画像生成（プレイリスト公開時）
  - SNS共有画像生成（書籍・年間レポート）
  - データインポート処理
  - データエクスポート処理
  - 物理削除バッチ（Celery Beat、毎日AM 4:00）
  - 期限切れトークン削除バッチ（Celery Beat、毎日AM 4:30、refresh_tokens/password_reset_tokensのクリーンアップ）
  - 年間レポート自動生成（Celery Beat、12月31日）

進捗確認API:
  GET /api/v1/tasks/{task_id}/status
  レスポンス: { "status": "pending" | "processing" | "completed" | "failed", "progress": 75, "total": 100, "errors": [...] }
```

### D. 外部APIレスポンスマッピング

#### Google Books API → booksテーブル

| Google Books フィールド | books カラム | 備考 |
|:---|:---|:---|
| `volumeInfo.industryIdentifiers[type=ISBN_13].identifier` | isbn_13 | — |
| `volumeInfo.industryIdentifiers[type=ISBN_10].identifier` | isbn_10 | — |
| `volumeInfo.title` | title | — |
| `volumeInfo.subtitle` | subtitle | — |
| `volumeInfo.authors` | authors | JSON配列として保存 |
| `volumeInfo.publisher` | publisher | — |
| `volumeInfo.publishedDate` | published_date | YYYY or YYYY-MM-DD形式をパース |
| `volumeInfo.description` | description | — |
| `volumeInfo.pageCount` | page_count | — |
| `volumeInfo.imageLinks.thumbnail` | cover_image_original_url | ダウンロード後WebP変換 |
| `volumeInfo.categories` | categories | JSON配列として保存 |
| `volumeInfo.language` | language | — |
| `id` | source_id | — |
| — | source | `"google_books"` 固定 |

#### 楽天ブックスAPI → booksテーブル

| 楽天ブックス フィールド | books カラム | 備考 |
|:---|:---|:---|
| `isbn` | isbn_13 | — |
| `title` | title | — |
| `subTitle` | subtitle | — |
| `author` | authors | スラッシュ区切り→JSON配列に変換 |
| `publisherName` | publisher | — |
| `salesDate` | published_date | 「YYYY年MM月DD日」形式をパース |
| `itemCaption` | description | — |
| `largeImageUrl` | cover_image_original_url | 高画質。ダウンロード後WebP変換 |
| `booksGenreId` | categories | 楽天ジャンルIDをカテゴリ名に変換（下記マッピング参照） |
| `itemUrl` | - | 保存しない（長大かつ変動する可能性があるため） |
| `itemCode` | source_id | 楽天商品コード（ユニークIDとして使用） |
| — | source | `"rakuten"` 固定 |

#### 楽天ブックスAPI リクエストパラメータ

```
エンドポイント: https://app.rakuten.co.jp/services/api/BooksTotal/Search/20170404

必須パラメータ:
  - applicationId: 環境変数 RAKUTEN_APP_ID

検索パラメータ:
  - keyword: キーワード検索時に使用（タイトル・著者名）
  - isbnjan: ISBN検索時に使用（ISBN-10/13）
  - booksGenreId: ジャンル絞り込み（省略時: 全ジャンル）
  - hits: 取得件数（デフォルト: 30、最大: 30）
  - page: ページ番号（デフォルト: 1）
  - sort: ソート順（standard / sales / -releaseDate）
  - outOfStockFlag: 1（品切れ商品も含む）

レートリミット:
  - 1アプリIDあたり: 1あなたはシニアソフトウェアアーキテクトです。

以下の要件定義書について、
「AIが実装する前提」でレビューしてください。

次の観点で指摘してください：

1. 情報不足で実装できない箇所
2. 曖昧な仕様（解釈が複数ある箇所）
3. 技術的リスク
4. 矛盾している仕様
5. 非現実的な要件
6. セキュリティ上の問題
7. パフォーマンス上の懸念
8. 追加した方が良い仕様
9. 実装を容易にするために必要な追記事項

重要度（高・中・低）を付けてください。

最後に：

「この要件はAIが実装可能な状態か」
を評価してください。
また、この要件定義書だけで
エンジニアが質問なしで実装できますか？

できない場合、
不足している情報をすべて列挙してください。リクエスト/秒（楽天API制限）
  - バックエンド側でToken Bucket方式（Redis）で制御
```

#### 楽天ジャンルIDマッピング方針

```
ジャンルIDの構造: 階層型（例: "001004008" = 本 > コミック > 少年コミック）

変換戦略:
  - トップレベル（先頭3桁）のマッピングテーブルをバックエンドに定数として保持:
    - "001" → "本"
    - "002" → "CD・DVD"
    - "003" → "ゲーム"
    - "004" → "雑誌"
    等
  - categoriesカラムにはトップレベルの日本語名をJSON配列として保存
  - **その他扱い**: 定義済みリストに合致しないIDは、一律「**その他**」としてマッピングし、保存対象とする（エラーや除外を行わない）。
  - フェーズ2以降: 楽天ジャンルAPI（BooksGenre/Search）で動的にサブジャンルも取得することを検討
```

### E. Next.js App Router ディレクトリ構成

```
frontend/src/app/
├── layout.tsx              # ルートレイアウト（next-intl Provider）
├── page.tsx               # ランディングページ (/)
├── (auth)/                 # 認証不要グループ
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   └── reset-password/page.tsx
├── (main)/                 # 認証必要グループ（ミドルウェアで保護）
│   ├── layout.tsx           # サイドバー + ヘッダー付きレイアウト
│   ├── dashboard/page.tsx
│   ├── bookshelf/page.tsx
│   ├── books/
│   │   ├── add/page.tsx
│   │   └── [id]/page.tsx
│   ├── reading-log/page.tsx
│   ├── playlists/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── stats/page.tsx
│   ├── settings/page.tsx
│   └── users/[username]/page.tsx
├── share/[slug]/page.tsx    # 公開プレイリスト（認証不要）
└── admin/                  # 管理者専用（ロールチェック）
    └── page.tsx
```

### F. Zustand ストア分割方針

| ストア名 | 管理する状態 | ファイル名 |
|:---|:---|:---|
| `useAuthStore` | ログインユーザー情報、アクセストークン、認証状態 | `stores/authStore.ts` |
| `useBookshelfStore` | 本棚のフィルター・ソート・表示モード | `stores/bookshelfStore.ts` |
| `useUIStore` | サイドバー開閉、モーダル状態、Toast通知 | `stores/uiStore.ts` |
| `useScanStore` | バーコードスキャンのモード・スキャン済みリスト | `stores/scanStore.ts` |

> **サーバー状態の管理**: APIデータの取得・キャッシュ・同期は **TanStack Query** が担当。ZustandはクライアントローカルのUI状態のみを管理する。

### G. メール送信仕様

```
メール送信サービス: AWS SES（Simple Email Service）
実装: httpx で AWS SES API v2 を直接呼び出すか、boto3 を使用
送信元: noreply@bookstackhub.example.com（環境変数 AWS_SES_FROM_EMAIL）

フェーズ1でのメール送信トリガー:
  1. パスワードリセットメール（必須）
  2. メールアドレス確認メール（フェーズ1では省略可）

パスワードリセットメール:
  件名: "[パスワードリセット] BookStackHub"
  形式: HTML + プレーンテキスト（マルチパート）
  本文構成:
    - ヘッダー: アプリロゴ
    - あいさつ: "こんにちは、{display_name}さん"
    - 本文: "パスワードのリセットがリクエストされました。以下のリンクをクリックして新しいパスワードを設定してください。"
    - CTAボタン: "パスワードをリセットする" → https://{domain}/reset-password?token={token}
    - 注意書き: "このリンクは1時間有効です。心当たりがない場合はこのメールを無視してください。"
    - フッター: "© {year} BookStackHub"
  トークン: secrets.token_urlsafe(32) を使用、SHA-256ハッシュでDB保存
  有効期限: 1時間

SES Sandboxについて:
  - 開発環境ではSandboxモード（認証済みメールアドレスのみ送信可）で十分
  - 本番環境ではSandbox解除申請を行う（ユーザー数が少ないため、停止されるリスクは低い）
  - バウンス・苦情メールの監視はフェーズ2以降で検討
```

### H. Nginx 設定仕様

```nginx
# nginx/nginx.conf の主要ルーティングルール

upstream frontend {
    server frontend:3000;
}

upstream backend {
    server backend:8000;
}

server {
    listen 80;
    server_name _;

    # セキュリティヘッダー
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # ファイルアップロードサイズ制限
    client_max_body_size 10M;

    # APIプロキシ
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    # 表紙画像・アバター画像（X-Accel-Redirectによるセキュア配信）
    # アプリケーションからのリダイレクトのみ許可（直接アクセス不可）
    location /protected_images/ {
        internal;
        alias /data/images/;
        add_header Cache-Control "private, max-age=2592000";
    }

    location /protected_avatars/ {
        internal;
        alias /data/avatars/;
        add_header Cache-Control "private, max-age=2592000";
    }

    # フロントエンド（その他全て）
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### I. Docker Compose / Dockerfile 方針

```
共通方針:
  - マルチステージビルド: フロントエンド・バックエンドともに採用し、イメージサイズを最小化
  - ヘルスチェック: 全コンテナに設定
  - 再起動ポリシー: restart: unless-stopped

フロントエンド (frontend/Dockerfile):
  - ベース: node:20-alpine
  - Stage 1 (deps): package.json + package-lock.json をコピーして npm ci
  - Stage 2 (builder): ソースコピー + next build
  - Stage 3 (runner): standalone output をコピーして起動
  - ポート: 3000

バックエンド (backend/Dockerfile):
  - ベース: python:3.12-slim
  - システム依存: libpq-dev, build-essential 等（Argon2, Pillow用）
  - Stage 1 (builder): pip install で依存パッケージをインストール
  - Stage 2 (runner): ビルド済みパッケージ + ソースをコピー
  - Noto Sans JP フォントをイメージに含める（下記 §J 参照）
  - ポート: 8000
  - 起動コマンド: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2

Celery Worker (celery サービス):
  - backend と同じイメージを共有
  - 起動コマンド: celery -A app.tasks.celery_app worker --loglevel=info --concurrency=2

Celery Beat (celery-beat サービス):
  - backend と同じイメージを共有
  - 起動コマンド: celery -A app.tasks.celery_app beat --loglevel=info

Volumeマウント:
  - db: postgres_data:/var/lib/postgresql/data
  - redis: redis_data:/data
  - backend/celery: image_cache:/data/images, avatar_cache:/data/avatars
  - nginx: image_cache:/data/images (read-only), avatar_cache:/data/avatars (read-only)
```

### J. Noto Sans JP フォント運用方針

```
用途: Pillowによる画像生成（OGP・SNS共有用・年間レポート）での日本語テキスト描画

ダウンロード元: Google Fonts（https://fonts.google.com/noto/specimen/Noto+Sans+JP）
ライセンス: SIL Open Font License 1.1（商用利用可）

必要フォントファイル:
  - NotoSansJP-Regular.ttf
  - NotoSansJP-Bold.ttf

Dockerイメージへの組み込み:
  1. backend/fonts/ ディレクトリにTTFファイルを配置
  2. Dockerfileで COPY fonts/ /app/fonts/ としてコンテナ内にコピー
  3. 環境変数または設定ファイルでフォントパスを指定:
     FONT_DIR=/app/fonts
  4. Pillowでの読み込み:
     font_regular = ImageFont.truetype("/app/fonts/NotoSansJP-Regular.ttf", size=20)
     font_bold = ImageFont.truetype("/app/fonts/NotoSansJP-Bold.ttf", size=36)

注意:
  - .gitignoreに fonts/*.ttf を追加（フォントファイルは大きいためGit管理しない）
  - Dockerfile内で Google Fontsから直接ダウンロードするか、ビルド時にローカルファイルをコピーする
  - フロントエンドではGoogle Fonts CDNを使用（Pillow用とは別管理）
```

### K. 楽天ブックスジャンルIDマッピング（フェーズ1定数）

```json
{
  "001": "本",
  "002": "CD・DVD",
  "003": "洋書",
  "004": "雑誌",
  "005": "ゲーム",
  "006": "PC・周辺機器",
  "007": "ソフトウェア",
  "015": "コミック",
  "101": "電子書籍"
}
```

> **実装ノート**: これ以外のIDが返却された場合は、一律で「その他」として扱うこと。
