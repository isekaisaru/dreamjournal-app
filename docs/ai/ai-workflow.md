# AI と一緒に開発する流れ（Claude・Codex・Gemini）

> 一行まとめ: **Claude が作り、Codex と Gemini が別々の目でチェックし、最後に決めるのは人間**。

料理にたとえると、Claude が「料理する人」、Codex と Gemini が「味見する人」、オーナー（リポジトリの持ち主）が「お店に出すか決める人」です。

## 役割分担

| 担当 | やること | どこで動くか |
|---|---|---|
| Claude（Claude Code） | 調べる・設計する・テストを先に書いて実装する・PR を作る | Claude のプロジェクト / Claude Code |
| Codex | PR のレビュー（バグや危ない変更を見つける） | GitHub（`@codex review` または自動レビュー） |
| Gemini Code Assist | 2 人目のレビュー・PR の要約 | GitHub（PR を開くと自動、`/gemini review` で再実行） |
| オーナー | マージ・本番デプロイ・DB 操作・課金設定を決める | GitHub・Render・Vercel・Supabase |

## 1 つの変更の流れ

1. オーナーが「やりたいこと」を書く（issue か、Claude への依頼）
2. Claude がブランチを作り、テストを先に書いて（赤）→ 実装して（緑）→ PR を作る
3. CI（Jest / RSpec / Playwright / Brakeman）が自動で走る
4. Codex と Gemini がレビューする。2 人が同じ所を指摘したら、まず直す
5. Claude が指摘を直す（直さない指摘は、理由を PR に書く）
6. オーナーが読んで、マージするかを決める

## AI に任せないこと（必ず人間が決める）

- `main` へのマージ
- 本番へのデプロイ、本番 DB の操作、列や表の削除
- API キーや決済（Stripe）の設定

## 設定ファイルの場所

| ファイル | 読む AI | 中身 |
|---|---|---|
| `.gemini/config.yaml` | Gemini Code Assist | レビューの細かさ・要約を出すか |
| `.gemini/styleguide.md` | Gemini Code Assist | このリポジトリで特に見てほしいこと（日本語） |
| `AGENTS.md`（※） | Codex（Claude も参照可） | 開発ルールと `## Code Review Rules` |

※ `AGENTS.md` と `CLAUDE.md` は現在 `.gitignore` で非公開にしています。Codex のクラウドレビューは GitHub 上のファイルしか読めないため、レビュールールを Codex に渡すには、個人情報を含まない公開用の `AGENTS.md` を置く必要があります。

## オーナーがやる設定（アカウント操作が必要なもの）

秘密の値（API キーなど）は、どこにも貼らず、各サービスの画面の中だけで扱ってください。

### A. Gemini Code Assist を GitHub に入れる（2 人目のレビュー）

1. GitHub Marketplace で「Gemini Code Assist」を開き、Install を押す
2. インストール先に `isekaisaru/dreamjournal-app` だけを選ぶ（All repositories にしない）
3. Google アカウントでログインし、利用規約に同意する（料金はこの画面で確認する）
4. 試しに既存の PR に `/gemini review` とコメントし、日本語でレビューが付くか見る
5. 多すぎる・少なすぎると感じたら `.gemini/config.yaml` の `comment_severity_threshold` を変える

### B. Codex の自動レビューを確認する

1. https://chatgpt.com/settings/code-review を開く
2. このリポジトリの **Automatic review** がオンか確認する（オフなら PR に `@codex review` とコメントすれば動く）
3. 公開用 `AGENTS.md` を入れた後は、その中の `## Code Review Rules` がレビューに使われる

### C.（後で・任意）Gemini CLI の GitHub Action

`google-github-actions/run-gemini-cli` を使うと、issue の仕分けや `@gemini-cli` への質問も GitHub Actions でできます。ただし `GEMINI_API_KEY` を GitHub の Secrets に入れる必要があり、利用量に応じた料金もかかり得ます。A と B が回ってから検討します。

## 参考（公式）

- Gemini Code Assist のリポジトリ設定: https://docs.cloud.google.com/gemini/docs/code-review/customize-repo-review
- Codex の GitHub レビュー: https://developers.openai.com/codex/integrations/github
- Gemini CLI GitHub Action: https://github.com/google-github-actions/run-gemini-cli
