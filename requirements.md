# BookStackHub — 書籍管理・共有プラットフォーム 要件定義書

> **Version**: 2.0.0  
> **最終更新日**: 2026-02-14  
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
| スタイリング | **Tailwind CSS 4** | 高速なUI構築・レスポンシブ対応 |
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

| API | 用途 | 優先度 | 備考 |
|:---|:---|:---|:---|
| **Google Books API** | 書籍検索（国内・洋書） | **主要** | 日本語書籍も収録。表紙画像が豊富 |
| **NDLサーチ OpenSearch API** | 国内書籍の補完検索 | **補完** | 国立国会図書館。ISBN検索に強い。書影APIは2026年3月末終了予定のため書誌情報のみ利用 |
| **OpenBD 代替API** | 国内書籍の追加補完 | **フォールバック** | 旧OpenBDの代替。書影収録が限定的。将来終了の可能性あり |

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

volumes:
  postgres_data:   # DB永続化
  redis_data:      # Redisデータ永続化
  image_cache:     # 書籍表紙画像キャッシュ
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
| `ALLOWED_ORIGINS` | CORS許可オリジン | `https://bookstackhub.example.com` |
| `IMAGE_CACHE_DIR` | 画像キャッシュディレクトリ | `/data/images` |
| `IMAGE_MAX_WIDTH` | 表紙画像の最大幅（px） | `400` |
| `IMAGE_QUALITY` | WebP画像品質（1-100） | `80` |
| `CELERY_BROKER_URL` | Celeryブローカー | `redis://redis:6379/1` |
| `ADMIN_EMAIL` | 初期管理者メールアドレス | — |
| `ADMIN_PASSWORD` | 初期管理者パスワード | — |

---

## 4. 機能要件

### 4.1 ユーザー認証・認可

#### 4.1.1 認証方式

- **トークンベース認証（JWT）** を採用
  - **アクセストークン**: 有効期限 30分。`Authorization: Bearer <token>` ヘッダーで送信
  - **リフレッシュトークン**: 有効期限 30日。**HttpOnly / Secure / SameSite=Strict** Cookieに格納
  - リフレッシュトークンはDBに保存し、サーバー側からの無効化（ログアウト・強制失効）を可能にする

#### 4.1.2 ユーザー登録（オープン型）

```
入力項目:
  - メールアドレス（必須・一意・形式バリデーション）
  - ユーザー名（必須・一意・3〜30文字・英数字とアンダースコアのみ）
  - 表示名（必須・1〜50文字）
  - パスワード（必須・8文字以上・英大文字/小文字/数字/記号のうち3種以上）

処理:
  1. 入力バリデーション
  2. メールアドレス・ユーザー名の重複チェック
  3. パスワードをArgon2idでハッシュ化して保存
  4. メールアドレス確認メール送信（任意: フェーズ1は省略可。省略時はメール未確認でもログイン可能とする）
  5. アクセストークン + リフレッシュトークンを発行してレスポンス
```

#### 4.1.3 ログイン

```
入力: メールアドレス + パスワード
処理:
  1. メールアドレスでユーザー検索
  2. Argon2idでパスワード照合
  3. 失敗時: 「メールアドレスまたはパスワードが正しくありません」（どちらが間違いか特定させない）
  4. 成功時: アクセストークン + リフレッシュトークンを発行
  5. ログイン試行回数制限: 同一メールアドレスに対し、15分間で5回失敗するとアカウントを15分間ロック
```

#### 4.1.4 ログアウト

- リフレッシュトークンをDBから削除し、Cookieをクリア

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
     b. Google Books API に問い合わせ
     c. NDLサーチ OpenSearch API に問い合わせ（ISBN検索時のみ）
  3. 結果を統合・重複排除してフロントエンドに返却
  4. ユーザーが書籍を選択して本棚に追加した時点で、マスター書籍としてDBに保存

検索パラメータ:
  - q: 検索キーワード（タイトル・著者名）
  - isbn: ISBN-10 または ISBN-13
  - source: "internal" | "external" | "all"（デフォルト: "all"）
  - page: ページ番号（デフォルト: 1）
  - per_page: 1ページあたりの件数（デフォルト: 20、最大: 40）

データ統合ロジック:
  - **優先順位**: Google Books > NDLサーチ > OpenBD
  - **補完**: 上位APIで欠損している項目（出版日、ページ数、あらすじ等）を、下位APIの情報でマージして補完する
  - **同一性判定**: ISBN-13の一致をもって同一書籍とみなす
```

#### 4.2.2 アプリ内検索

```
検索対象: 自社DBに登録済みのマスター書籍 + カスタム書籍（自分が作成したもののみ）
検索方法: PostgreSQLの全文検索（pg_trgm + GIN index）
検索フィールド: タイトル、著者名、ISBN、出版社
```

#### 4.2.3 バーコードスキャン（Webカメラ）

```
フロー:
  1. ユーザーがスキャンボタンを押す
  2. html5-qrcodeライブラリでWebカメラを起動
  3. EAN-13形式のバーコードを検出
  4. ISBNを抽出してAPI検索を自動実行
  5. 検索結果を表示し、ユーザーが確認して本棚に追加
```

#### 4.2.4 書籍表紙画像のキャッシュ

```
処理フロー:
  1. 外部APIから表紙画像URLを取得
  2. バックエンドで画像をダウンロード
  3. Pillowで以下の処理を実施:
     - 最大幅400pxにリサイズ（アスペクト比維持）
     - WebP形式に変換（品質80）
  4. ファイルパス: /data/images/{isbn_or_id}.webp
  5. DBにはファイル名または相対パスを保存
  6. 配信URL:
     - フロントエンド: `https://{domain}/static/images/{filename}`
     - Nginx設定: `/static/images/` へのリクエストを Docker Volume 上の格納ディレクトリにマッピング
  6. 配信: Nginx経由で静的ファイルとして配信（Cache-Control: max-age=2592000）

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
  - 表紙画像（任意・ユーザーアップロード・JPEG/PNG/WebP・最大5MB）
  - ページ数（任意・1〜99999）

制約:
  - カスタム書籍にはis_custom=trueフラグとcreated_by=ユーザーIDが設定される
  - 本棚に追加できるのは作成者本人のみ
  - プレイリスト経由で他ユーザーに表示されるが、他ユーザーは自分の本棚には追加不可
  - 表紙画像はアップロード時にWebP変換（最大幅400px、品質80）
```

### 4.4 書籍管理（本棚機能）

#### 4.4.1 ステータス管理

| ステータス | 説明 | キー |
|:---|:---|:---|
| 蔵書 | 所有している本 | `owned` |
| 読みたい | 読みたいと思っている本 | `want_to_read` |
| 借りたい | 借りて読みたい本 | `want_to_borrow` |
| 読了 | 読み終わった本 | `finished` |
| 積読 | 買ったが未読の本 | `tsundoku` |
| 読書中 | 現在読んでいる本 | `reading` |

#### 4.4.2 付加情報

- **評価**: 1〜5の星評価（0.5刻みなし、整数のみ）。null許容
- **カスタムタグ**: ユーザー独自のタグ付け（1書籍あたり最大10タグ、タグ名最大30文字）
- **非公開メモ**: Markdown対応のプライベートメモ（最大5000文字）
- **公開レビュー**: 他ユーザーに公開される読書感想（タイトル最大100文字、本文最大10000文字）

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

ページネーション: 無限スクロールまたはページネーション（1ページ20件）
```

#### 4.4.4 シリーズ本の自動グルーピング

- **自動グルーピング**:
  - タイトル解析により、同一シリーズの書籍を自動的にグループ化して表示
  - ロジック: タイトル末尾の巻数表現（巻、vol、#、数字のみ等）を除去した「シリーズ名」が一致するものをまとめる
  - 表示: 本棚上で1つの「シリーズフォルダ」として表示し、タップで全巻を展開する機能を提供

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
  - 各日のセルの色の濃さは、その日の読書ログ件数（または合計ページ数）に応じて4段階で表現
    - 0件: グレー（未読）
    - 1件: 薄い緑
    - 2〜3件: 中緑
    - 4件以上: 濃い緑
  - セルをホバーすると、日付・読書冊数・ページ数のツールチップを表示
  - レスポンシブ対応: スマホでは直近6ヶ月分を表示

API:
  GET /api/v1/reading-logs/heatmap?year=2026
  レスポンス: { "2026-01-01": { "count": 2, "total_pages": 45 }, ... }
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
    - 形式: /share/{8文字のランダム英数字}
  - 例: https://bookstackhub.example.com/share/a1b2c3d4

OGP画像生成:
  - プレイリストを公開した際に、Celeryタスクで非同期生成
  - 内容: プレイリストタイトル + 代表的な表紙画像（最大4冊分をグリッド配置）
  - サイズ: 1200×630px（OG:image推奨サイズ）
  - フォーマット: WebP（フォールバック用にPNGも生成）

#### 4.6.3 書籍SNS共有画像生成

```

概要: 読了時や推奨したい時に、書籍単体のリッチなシェア画像を動的に生成する
デザイン:

- 書籍の表紙画像（メイン）
- ユーザーの評価（★）
- 短い感想・引用（最大140文字）
- 背景: 表紙画像から抽出したドミナントカラーを使用したぼかし背景
サイズ:
- OGPサイズ: 1200×630px
- ストーリーサイズ: 1080×1920px
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
     - 直近12ヶ月の購入金額推移（折れ線グラフ）※購入金額は任意入力

  6. 読書中の書籍
     - 現在「読書中」ステータスの書籍一覧（進捗率表示）

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
- フォーマット: PNG（SNS共有時の互換性重視）
- ダウンロードボタンでユーザーが取得可能

生成タイミング:

- 年末（12月31日）に自動生成
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
     - 初回起動時に環境変数（ADMIN_EMAIL, ADMIN_PASSWORD）から管理者アカウントを自動作成
     - 初回ログイン後にパスワード変更を強制

```

### 4.10 データインポート・エクスポート

```

#### 4.10.1 インポート機能

対応フォーマット:

- 汎用 CSV / JSON
- 主要な読書管理サービス（読書メーター等）のエクスポート形式（可能な範囲でパース対応）
処理フロー:

  1. ユーザーがファイルをアップロード
  2. Celeryタスクで非同期バックグラウンド処理
  3. ISBNまたはタイトル・著者名で既存データと照合し、重複をスキップまたはマージ
  4. 完了時に通知（Websocket または ポーリング）

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
- 本棚データ: IndexedDBにキャッシュし、オフラインでも一覧を閲覧可能
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
  レスポンスヘッダ: X-Total-Count, X-Total-Pages

レスポンス形式:
  成功: { "data": <リソース>, "meta": { "page": 1, "per_page": 20, "total": 100 } }
  エラー: { "error": { "code": "<エラーコード>", "message": "<メッセージ>", "details": [...] } }

データ契約・スキーマ:

- リクエストボディ: 原則 **JSON**。ファイルアップロードを含む場合のみ **multipart/form-data**
- スキーマ定義: OpenAPI (Swagger) を正とする。フロントエンドはOpenAPI定義から型を自動生成することを推奨

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

#### ユーザー API

| メソッド | パス | 認証 | 説明 |
|:---|:---|:---|:---|
| GET | `/users/{user_id}` | 必要 | ユーザープロフィール取得 |
| PATCH | `/users/{user_id}` | 必要（本人） | プロフィール更新 |
| DELETE | `/users/{user_id}` | 必要（本人/admin） | アカウント削除（論理削除） |
| PATCH | `/users/{user_id}/password` | 必要（本人） | パスワード変更 |

#### 書籍 API

| メソッド | パス | 認証 | 説明 |
|:---|:---|:---|:---|
| GET | `/books/search` | 必要 | 書籍検索（内部/外部/統合） |
| GET | `/books/{book_id}` | 必要 | 書籍詳細取得 |
| POST | `/books/custom` | 必要 | カスタム書籍の手動登録 |
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

#### OGP API

| メソッド | パス | 認証 | 説明 |
|:---|:---|:---|:---|
| GET | `/ogp/playlist/{slug}` | 不要 | プレイリストOGP画像 |

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
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 更新日時 |

#### books

| カラム | 型 | 制約 | 説明 |
|:---|:---|:---|:---|
| id | UUID | PK, DEFAULT gen_random_uuid() | 書籍ID |
| isbn_10 | VARCHAR(10) | NULL, INDEX | ISBN-10 |
| isbn_13 | VARCHAR(13) | NULL, INDEX | ISBN-13 |
| title | VARCHAR(500) | NOT NULL | タイトル |
| subtitle | VARCHAR(500) | NULL | サブタイトル |
| authors | JSONB | NOT NULL, DEFAULT '[]' | 著者リスト |
| publisher | VARCHAR(200) | NULL | 出版社 |
| published_date | DATE | NULL | 出版日 |
| description | TEXT | NULL | 説明文 |
| page_count | INTEGER | NULL | ページ数 |
| cover_image_path | VARCHAR(500) | NULL | ローカル画像パス |
| cover_image_original_url | VARCHAR(1000) | NULL | 元画像URL |
| categories | JSONB | NOT NULL, DEFAULT '[]' | カテゴリリスト |
| language | VARCHAR(10) | NULL | 言語コード |
| source | VARCHAR(20) | NOT NULL | 取得元（google_books/ndl/openbd/custom） |
| source_id | VARCHAR(100) | NULL | 外部APIのID |
| is_custom | BOOLEAN | NOT NULL, DEFAULT false | カスタム書籍フラグ |
| created_by | UUID | NULL, FK(users.id) | カスタム書籍の作成者 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 更新日時 |

**インデックス**: `idx_books_title_trgm (title gin_trgm_ops)` — 全文検索用

#### user_books

| カラム | 型 | 制約 | 説明 |
|:---|:---|:---|:---|
| id | UUID | PK | ユーザー書籍ID |
| user_id | UUID | FK(users.id), NOT NULL | ユーザーID |
| book_id | UUID | FK(books.id), NOT NULL | 書籍ID |
| status | VARCHAR(20) | NOT NULL | ステータス |
| rating | SMALLINT | NULL, CHECK(1-5) | 評価 |
| private_memo | TEXT | NULL | 非公開メモ |
| is_owned | BOOLEAN | NOT NULL, DEFAULT false | 所有フラグ |
| started_reading_at | DATE | NULL | 読書開始日 |
| finished_reading_at | DATE | NULL | 読了日 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 追加日時 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 更新日時 |

**制約**: `UNIQUE(user_id, book_id)`

#### reading_logs

| カラム | 型 | 制約 | 説明 |
|:---|:---|:---|:---|
| id | UUID | PK | ログID |
| user_id | UUID | FK(users.id), NOT NULL | ユーザーID |
| book_id | UUID | FK(books.id), NOT NULL | 書籍ID |
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
| user_id | UUID | FK(users.id), NOT NULL | ユーザーID |
| book_id | UUID | FK(books.id), NOT NULL | 書籍ID |
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
| user_id | UUID | FK(users.id), NOT NULL | 所有者ID |
| title | VARCHAR(100) | NOT NULL | タイトル |
| description | TEXT | NULL | 説明 |
| is_public | BOOLEAN | NOT NULL, DEFAULT false | 公開フラグ |
| share_slug | VARCHAR(8) | UNIQUE, NULL | 共有URLスラッグ |
| ogp_image_path | VARCHAR(500) | NULL | OGP画像パス |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 更新日時 |

#### playlist_items

| カラム | 型 | 制約 | 説明 |
|:---|:---|:---|:---|
| id | UUID | PK | アイテムID |
| playlist_id | UUID | FK(playlists.id) ON DELETE CASCADE, NOT NULL | プレイリストID |
| book_id | UUID | FK(books.id), NOT NULL | 書籍ID |
| position | INTEGER | NOT NULL | 並び順 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 追加日時 |

**制約**: `UNIQUE(playlist_id, book_id)`

#### tags

| カラム | 型 | 制約 | 説明 |
|:---|:---|:---|:---|
| id | UUID | PK | タグID |
| user_id | UUID | FK(users.id), NOT NULL | 所有者ID |
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
| user_id | UUID | FK(users.id), NOT NULL | ユーザーID |
| token_hash | VARCHAR(255) | UNIQUE, NOT NULL | トークンのSHA-256ハッシュ |
| expires_at | TIMESTAMPTZ | NOT NULL | 有効期限 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 作成日時 |

---

## 7. 画面一覧・UI設計指針

### 7.1 ページ一覧

| パス | ページ名 | 認証 | 概要 |
|:---|:---|:---|:---|
| `/` | ランディングページ | 不要 | アプリ紹介・ログインへの導線 |
| `/login` | ログイン | 不要 | ログインフォーム |
| `/register` | ユーザー登録 | 不要 | 登録フォーム |
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

### 7.2 レスポンシブ対応

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

---

## 8. セキュリティ要件

### 8.1 認証セキュリティ

- パスワードハッシュ: **Argon2id**（time_cost=3, memory_cost=65536, parallelism=4）
- JWT: **RS256** または **HS256**（SECRET_KEYは256bit以上のランダム文字列）
- リフレッシュトークン: **SHA-256ハッシュ** でDBに保存（平文保存禁止）
- CSRF対策: SameSite=Strict Cookie + Origin検証
- ブルートフォース対策: 同一メール15分間5回失敗でアカウントロック

### 8.2 入力バリデーション

- すべてのAPIリクエストは **Pydanticスキーマ** で厳格にバリデーション
- SQLインジェクション: **SQLAlchemy ORM** によるパラメータバインディング（生SQLの使用禁止）
- XSS: フロントエンドでのHTMLエスケープ + **Content-Security-Policy** ヘッダー設定
- ファイルアップロード: MIMEタイプ検証（JPEG/PNG/WebPのみ）、ファイルサイズ上限5MB、ファイル名のサニタイズ

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
  - `Content-Security-Policy: default-src 'self'; ...`

### 8.4 データ保護

- DBの個人情報カラムは暗号化を検討（フェーズ1では必須としない）
- ユーザー削除は**論理削除**（is_active=false）とし、30日後にバッチで物理削除
- ログにパスワードやトークンを出力しない

---

## 9. 非機能要件

### 9.1 パフォーマンス目標

| 指標 | 目標値 |
|:---|:---|
| APIレスポンスタイム（P95） | 200ms以下（DB参照系） |
| APIレスポンスタイム（P95） | 500ms以下（外部API検索） |
| ページ初期表示（LCP） | 2.5秒以下 |
| 同時接続ユーザー数 | 50ユーザー（自宅サーバー想定） |
| DB接続プール | 最大20コネクション |

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

- ja: 2026年2月14日, ¥1,500
- en: February 14, 2026, $15.00（通貨は表示しない、数値のみ）

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
| 403 | `ACCOUNT_LOCKED` | アカウントがロック中 |
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
Google Books API障害時:
  1. NDLサーチAPIにフォールバック
  2. NDLも障害の場合、キャッシュ済みデータのみで応答
  3. すべて失敗: EXTERNAL_API_ERROR を返却 + 「カスタム書籍として手動登録」を案内

タイムアウト設定:
  - 外部APIリクエスト: 10秒（httpxのtimeout設定）
  - リトライ: 最大2回（exponential backoff: 1秒, 2秒）
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
- メールアドレス確認・パスワードリセット機能
- **読書メモのOCR取り込み機能**:
  - スマホカメラで書籍のページを撮影し、テキストを自動抽出
  - 技術: Google Cloud Vision API, Tesseract, または iOS/Android OS標準のOCR機能（Live Text）を活用
  - UI: 抽出したテキストを選択し、「引用」または「メモ」として読書ログに保存する機能
