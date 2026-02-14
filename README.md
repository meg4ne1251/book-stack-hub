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

- Docker Desktop または Docker Engine
- Docker Compose

### 起動手順

1. リポジトリをクローン

```bash
git clone https://github.com/meg4ne1251/book-stack-hub.git
cd book-stack-hub
```

1. 環境変数の設定

```bash
cp .env.example .env
# .envファイルを編集して必要な設定を行ってください
```

1. Dockerコンテナの起動

```bash
docker compose up -d
```

1. アプリケーションへのアクセス

- Frontend: <http://localhost:3000>
- Backend API Docs: <http://localhost:8000/docs>

## 📂 ディレクトリ構成

```
book-stack-hub/
├── frontend/       # Next.js アプリケーション
├── backend/        # FastAPI アプリケーション
├── nginx/          # Nginx 設定
├── docker-compose.yml
└── requirements.md # 詳細要件定義書
```

## 📜 ライセンス

MIT License
