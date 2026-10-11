# CLAUDE.md

このファイルは、本プロジェクトで Claude Code が作業する際のルールを定めます。

## プロジェクト概要

家計簿アプリ（kakeibo-app）。

レシート画像をClaude APIで読み取り、カテゴリ別に集計する。

- フロントエンド: React + Vite + Chart.js（データはローカルストレージに保存）
- バックエンド: Node.js + Express（`server/index.js`）。Claude APIはここからのみ呼ぶ
- 使用モデル: claude-haiku-5-5
- APIキーは `.env` の `ANTHROPIC_API_KEY` で管理（`.env.example` 参照）

### コマンド

- `npm install` : 依存関係のインストール
- `npm run dev` : バックエンド(3001)とフロントエンド(5173)を同時起動
- `npm run build` : フロントエンドのビルド
- `npm start` : ビルド後、バックエンドから配信

## Git運用ルール

- **コードを変更するたびに、GitHubへプッシュする。**
  - 変更 → `git add` → `git commit` → `git push` までを1セットとして行う。
  - 変更をまとめて溜め込まず、意味のある単位でこまめにコミット・プッシュする。
- コミットメッセージは、何を・なぜ変更したかが分かるように簡潔に書く。
- シークレット（APIキー、パスワード、`.env` など）はコミットしない。必要に応じて `.gitignore` に追加する。
- 強制プッシュ（`git push --force`）や履歴の書き換えは、明示的な指示がない限り行わない。

## 作業の進め方

- 日本語で応対する。コードのコメントも日本語で書く。
- 変更前に既存のコードの書き方・命名規則を確認し、それに合わせる。
- 変更後は、可能な範囲で動作確認（テスト・実行）を行ってからコミットする。

## GitHubリポジトリ

https://github.com/hohongu/kakeibo-app.git
