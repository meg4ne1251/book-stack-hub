# BookStackHub

書籍の検索・管理・共有を一元化し、物理的な制約を超えたデジタル本棚を提供するWebアプリケーションです。読書記録の可視化やソーシャル共有を通じて、読書体験を豊かにします。

> **Note**
> 詳細な仕様については [requirements.md](./requirements.md) を参照してください。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-development-orange.svg)

## ✨ 特徴

- **統合検索**: Google Books API, NDLサーチ等を統合したシームレスな書籍検索
- **デジタル本棚**: 「読みたい」「読了」「積読」などのステータス管理
- **読書ログ**: 日々の読書記録とGitHub風ヒートマップによる可視化
- **共有機能**: プレイリスト作成とOGP対応のSNSシェア
- **スキャン登録**: Webカメラを使用したバーコード(ISBN)スキャン
- **PWA対応**: モバイル端末でのネイティブアプリのような体験

## 🛠 技術スタック

### Frontend

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript 5+
- **Styling**: Tailwind CSS 4, shadcn/ui
- **State**: Zustand, TanStack Query

### Backend

- **Framework**: FastAPI (Python 3.12+)
- **Database**: PostgreSQL 16
- **ORM**: SQLAlchemy 2.0 (Async)
- **Auth**: JWT + Argon2

### Infrastructure

- **Container**: Docker, Docker Compose
- **Cache/Queue**: Redis 7
- **Proxy**: Nginx

## 🚀 セットアップ (開発環境)

### 前提条件

#### 必須

- Docker Desktop (Windows/Mac) または Docker Engine (Linux)
- Docker Compose V2+
- Git

#### 推奨

- Python 3.10+ (ローカル開発用)
- Node.js 20+ (フロントエンドのローカル開発用)

### 起動手順

#### 1. リポジトリをクローン

```bash
git clone https://github.com/meg4ne1251/book-stack-hub.git
cd book-stack-hub
```

#### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` ファイルを編集して必要な設定を行います：

##### 2.1. 基本設定（必須）

```bash
# データベースと Redis の設定（デフォルトのままでOK）
POSTGRES_USER=bookstackhub
POSTGRES_PASSWORD=changeme_db_password
POSTGRES_DB=bookstackhub
DATABASE_URL=postgresql+asyncpg://bookstackhub:changeme_db_password@db:5432/bookstackhub
REDIS_URL=redis://redis:6379/0

# JWT 秘密鍵の生成（必須）
# 以下のコマンドで生成してください：
# python3 -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=your_generated_secret_key_here

# 初期管理者アカウント
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_secure_admin_password
```

##### 2.2. 外部API設定（推奨）

書籍情報の取得に必要です。どちらか一方、または両方を設定できます。

**Google Books API キーの取得方法：**

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成または選択
3. 「APIとサービス」→「ライブラリ」で「Books API」を検索
4. 「Books API」を有効化
5. 「認証情報」→「認証情報を作成」→「APIキー」を選択
6. 生成されたAPIキーをコピー

```bash
GOOGLE_BOOKS_API_KEY=your_google_books_api_key
```

**楽天ブックス API キーの取得方法：**

1. [楽天デベロッパーサイト](https://webservice.rakuten.co.jp/) にアクセス
2. 楽天会員でログイン
3. 「アプリID発行」から新規アプリを登録
4. アプリIDとアフィリエイトID（任意）を取得

```bash
RAKUTEN_APP_ID=your_rakuten_app_id
RAKUTEN_AFFILIATE_ID=your_affiliate_id  # オプション
```

##### 2.3. その他のオプション設定

```bash
# CORS設定（フロントエンドのURLを追加）
ALLOWED_ORIGINS=http://localhost:3000,http://localhost

# メール送信（パスワードリセット等に必要な場合）
AWS_SES_REGION=ap-northeast-1
AWS_SES_ACCESS_KEY_ID=your_aws_access_key
AWS_SES_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_SES_FROM_EMAIL=noreply@yourdomain.com

# Cloudflare Turnstile（ボット対策）
TURNSTILE_SITE_KEY=your_turnstile_site_key
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
```

#### 3. Dockerコンテナの起動

```bash
# コンテナのビルドと起動
docker compose up -d

# ログの確認（オプション）
docker compose logs -f
```

初回起動時は以下の処理が自動的に実行されます：

- データベースのマイグレーション
- 管理者アカウントの作成
- 必要なディレクトリの初期化

#### 4. アプリケーションへのアクセス

起動完了後、以下のURLでアクセスできます：

- **Frontend**: http://localhost:3000
- **Backend API Docs**: http://localhost:8000/docs
- **Backend Redoc**: http://localhost:8000/redoc

#### 5. 初回ログイン

`.env` で設定した管理者アカウントでログインします：

- Email: `ADMIN_EMAIL` で設定したメールアドレス
- Password: `ADMIN_PASSWORD` で設定したパスワード

> **セキュリティ注意**: 初回ログイン後、必ず管理者パスワードを変更し、`.env` から `ADMIN_PASSWORD` を削除することを推奨します。

### 停止・再起動

```bash
# 停止
docker compose down

# 再起動
docker compose restart

# 完全削除（データベースも含む）
docker compose down -v
```

### データベースのマイグレーション

スキーマ変更時にマイグレーションを実行：

```bash
# マイグレーションファイルの生成
docker compose exec backend alembic revision --autogenerate -m "description"

# マイグレーションの適用
docker compose exec backend alembic upgrade head
```

### トラブルシューティング

#### ポート番号が既に使用されている

他のサービスとポートが競合している場合：

```bash
# 使用中のポートを確認
sudo lsof -i :3000  # Frontend
sudo lsof -i :8000  # Backend
sudo lsof -i :5432  # PostgreSQL
```

`docker-compose.yml` でポート番号を変更してください。

#### データベース接続エラー

```bash
# データベースコンテナの状態確認
docker compose ps
docker compose logs db

# データベースの再起動
docker compose restart db
```

#### キャッシュをクリアして再ビルド

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

#### ログの確認

```bash
# 全サービスのログ
docker compose logs -f

# 特定のサービスのみ
docker compose logs -f backend
docker compose logs -f frontend
```

## 📂 ディレクトリ構成

```
book-stack-hub/
├── frontend/              # Next.js アプリケーション
│   ├── src/
│   │   ├── app/          # App Router のページ
│   │   ├── components/   # React コンポーネント
│   │   ├── hooks/        # カスタムフック
│   │   ├── lib/          # ユーティリティ関数
│   │   ├── stores/       # Zustand ストア
│   │   └── types/        # TypeScript 型定義
│   ├── messages/         # 国際化メッセージ
│   └── public/           # 静的ファイル
│
├── backend/              # FastAPI アプリケーション
│   ├── app/
│   │   ├── models/       # SQLAlchemy モデル
│   │   ├── routers/      # API エンドポイント
│   │   ├── schemas/      # Pydantic スキーマ
│   │   ├── services/     # ビジネスロジック
│   │   ├── tasks/        # Celery タスク
│   │   └── utils/        # ユーティリティ
│   ├── alembic/          # データベースマイグレーション
│   └── tests/            # テストコード
│
├── nginx/                # Nginx 設定
├── .github/              # GitHub Actions ワークフロー
├── docker-compose.yml    # Docker Compose 設定
├── .env.example          # 環境変数テンプレート
└── requirements.md       # 詳細要件定義書
```

## 🧪 テスト

### バックエンドのテスト

```bash
# テストの実行
docker compose exec backend pytest

# カバレッジ付きで実行
docker compose exec backend pytest --cov=app --cov-report=html

# 特定のテストファイルのみ実行
docker compose exec backend pytest tests/test_auth_service.py

# 詳細な出力で実行
docker compose exec backend pytest -v
```

### フロントエンドのテスト

```bash
# テストの実行（フロントエンドコンテナ内）
docker compose exec frontend npm test

# E2Eテストの実行（Playwrightなど）
docker compose exec frontend npm run test:e2e
```

## 🔧 開発

### ローカル開発（ホットリロード）

Docker Compose を使用すると、ファイル変更時に自動的に再読み込みされます。

#### バックエンドの開発

```bash
# ログを確認しながら開発
docker compose logs -f backend

# Pythonシェルの起動
docker compose exec backend python

# 依存関係の追加
# pyproject.toml を編集後：
docker compose exec backend poetry install
docker compose restart backend
```

#### フロントエンドの開発

```bash
# ログを確認しながら開発
docker compose logs -f frontend

# 依存関係の追加
# package.json を編集後：
docker compose exec frontend npm install
docker compose restart frontend
```

### データベースの管理

```bash
# データベースに接続
docker compose exec db psql -U bookstackhub -d bookstackhub

# データベースのバックアップ
docker compose exec db pg_dump -U bookstackhub bookstackhub > backup.sql

# データベースのリストア
cat backup.sql | docker compose exec -T db psql -U bookstackhub -d bookstackhub

# データベースのリセット
docker compose down -v
docker compose up -d
```

### Redis の管理

```bash
# Redis CLI に接続
docker compose exec redis redis-cli

# キャッシュのクリア
docker compose exec redis redis-cli FLUSHALL
```

## 🚢 本番環境へのデプロイ

### 環境変数の設定

本番環境では以下の設定を必ず変更してください：

- `SECRET_KEY`: 本番用の強力なランダム文字列
- `POSTGRES_PASSWORD`: 強力なパスワード
- `ADMIN_PASSWORD`: 初回起動後に削除
- `ALLOWED_ORIGINS`: 本番環境のドメイン
- `DEV_MODE=false`: 本番環境では必ず false に設定

### Docker Compose での本番デプロイ

```bash
# 本番用のビルド
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# 本番環境での起動
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### HTTPS の設定

Nginx で Let's Encrypt を使用する場合は、`nginx/nginx.conf` を編集してSSL設定を追加してください。

または、Cloudflare Tunnel を使用する場合は `.env` に `TUNNEL_TOKEN` を設定します。

## 🤝 コントリビューション

プルリクエストを歓迎します！大きな変更の場合は、まず Issue を開いて変更内容を議論してください。

1. このリポジトリをフォーク
2. Feature ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

### コーディング規約

- **Backend**: PEP 8, Black フォーマッター, isort
- **Frontend**: ESLint, Prettier

## 📚 関連ドキュメント

- [要件定義書](./requirements.md)
- [API ドキュメント](http://localhost:8000/docs) - 起動後にアクセス
- [FastAPI 公式ドキュメント](https://fastapi.tiangolo.com/)
- [Next.js 公式ドキュメント](https://nextjs.org/docs)

## 📝 TODO

- [ ] フロントエンドのテストカバレッジ向上
- [ ] PWA対応の強化
- [ ] 多言語対応の拡充
- [ ] パフォーマンス最適化
- [ ] CI/CD パイプラインの改善

## 📜 ライセンス

MIT License

---

Made with ❤️ by [meg4ne1251](https://github.com/meg4ne1251)
