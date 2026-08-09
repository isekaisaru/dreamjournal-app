# Codex 引き継ぎ — YumeTree デザインシステム全画面リデザイン

> 作成: 2026-06-28 / 引き継ぎ元: Claude Code セッション（利用制限のため Codex へ委譲）
> 目的: 進行中の「Morpheus主役・全画面リデザイン」をCodexが単独で継続できるようにする。

---

## 0. このプロジェクトは何か

YumeTree（旧ユメログ）= 朝に見た夢を記録し、AIガイド「モルペウス」（紫髪・星ナイトキャップのチビキャラ）と振り返るAI夢ノート。
- フロント: `frontend/`（Next.js 16 App Router + Tailwind v4 + framer-motion + lucide-react + shadcn/ui）
- バック: `backend/`（Rails、Render）。フロントは Vercel。クロスドメインのため認証はクライアント側 `AuthContext`。
- 本番URL: https://dreamjournal-app.vercel.app

**いま進行中の取り組み**: ユーザーが7月計画の「大規模リデザインはしない」を**意図的に上書き**し、Morpheusを全画面の主役にする世界観リデザインを主軸化。世界観「朝空=ライト / 夜空=ダーク・月のモルペウス」は維持。

## 1. 進め方の規約（重要・踏襲すること）

- **サブPJに分割**し、各スライスを **spec → plan → 実装 → 個別Draft PR** で回す。1つの巨大PRにしない。
- ドキュメントは `docs/superpowers/specs/` と `docs/superpowers/plans/` に日付付きで残す。
- **提示層のみ**の変更に徹し、認証/ルーティング/Stripe/DB/migration のロジックには触れない（触る場合は独立PR）。
- 森画面は最高リスクのため**最後・単独PR**（#4）。
- 完了ゲート: `cd frontend && yarn jest`（全緑）+ `yarn build`（成功）。TDDで赤→緑。
- 極小変更（1ファイルの差し替え等）は重い多段プロセスを使わず直接実装してよい（例: #399/#400）。

## 2. 完了済み（main にマージ済み）

| PR | 内容 |
|---|---|
| #394 #0 | **デザインシステム基盤**: `globals.css` に非破壊トークン追加。`--morpheus-sm/md/lg/hero(=clamp(120px,36vw,160px))`、後光RGB `--glow-moon/sky/morpheus/active`、感情色 `--emotion-*`(10色)、時刻空トーン `--sky-night/dawn/day/dusk`。`moon-pulse` 後光を `--glow-active` 参照に（明=紫/夜=琥珀）。 |
| #395 #1 | **Morpheusヒーロー基盤**: `MorpheusHero` をトークン駆動化（`var(--morpheus-hero)`＋`animate-moon-pulse`後光＋`animate-morpheus-float`）。`MorpheusImage` に `cssSize?:string` 追加。全消費先の固定size掃き出し。 |
| #396 #2 | **ボトムタブナビ**: モバイル専用 `BottomTabBar`（おうち/もり/[＋きろくFAB]/マイ夢/設定、`md:hidden`・認証時のみ）を `layout.tsx` にマウント。FABは既存`DreamEntryLauncher`再利用。 |
| #397 #3a | **ナビ共存＋掃除**: `BottomTabBar`が`body.has-bottom-nav`付与→`@media(max-width:767.98px)`で`--bottom-nav-h`実値化→固定`MorpheusGuide`を`translateY(calc(-1*var(--bottom-nav-h)))`で逃がす。未マウントの`DreamRecorderFloating`系3ファイル削除。 |
| #398 #3 | **MorpheusAvatar**: 円形顔クロップの新プリミティブ。`morpheusAssets.ts`（variant→src/altマップ）を抽出し`MorpheusImage`は型を再export。`DreamStatsWidget`と`dream/[id]`分析カードに適用。 |
| #399 #3 | 月次サマリー(`dream/month/[yearMonth]`)に `MorpheusAvatar variant="reward" size=128`。 |
| #400 #3 | 設定ガイドに MorpheusAvatar 適用。 |

## 3. 進行中・未着手

- **#401（draft, in flight）**: 夢フォーム分析中に MorpheusAvatar 適用（別アクターが作業中。重複しないこと）。
- **#3 残り**: 音声/プロフィール等、固定`MorpheusGuide`や全身`MorpheusImage`が残る画面へのアバター適用。
- **#4 森画面**（最高リスク・単独PR）: `app/forest/` のMorpheus演出。**＋既存バグ修正**（下記）。
- **既存バグ（#4で要修正・チップ起票済み）**: `frontend/app/forest/[profileId]/page.tsx` が名前付き関数4つ（`isValidForestProfileId`/`normalizeDreamProfilesResponse`/`normalizeProfileDreamsResponse`/`findActiveForestProfile`）をexportしており、App Routerの「page.tsxは任意named export不可」制約で型チェックが落ちる。修正は4関数を兄弟モジュール(例 `forestProfileUtils.ts`)へ移しimportに変更（参照元も更新）。
- **追加リデザインのアイデア集**: `~/Downloads/redesign-code/`（**未統合の参照コード**）。デスクトップ用サイドバー(`web/Sidebar.tsx`)・⌘Kコマンドパレット(`CommandPalette.tsx`)・共通シェル(`AppShell.tsx`)・きもちインサイトダッシュボード(`insights-page.tsx`)・ムードヒートマップ(`MoodCalendar.tsx`)・ストリーミング分析(`StreamingAnalysis.tsx`)。**そのまま貼らず**、現コードベースの実態に合わせて再実装・検証すること（source of truth はmainのマージ済みコード）。

## 4. 主要コンポーネントと再利用部品

- `app/components/morpheusAssets.ts` — variant→画像/alt の**単一出典**。`MorpheusImageVariant` 型もここ起点（`MorpheusImage` が再export）。
- `app/components/MorpheusImage.tsx` — 全身（object-contain）。`variant`/`size`/`cssSize`/`priority`。
- `app/components/MorpheusAvatar.tsx` — **円形顔クロップ**。`variant`/`size`(既定56)/`className`/`priority`。実装の肝: `next/image fill` + `object-cover` + `style={{ transform:"scale(2)", transformOrigin:"center 25%" }}`（全身正方形画像の顔=上部中央にズーム）。後光なし。
- `app/components/MorpheusHero.tsx` — 大きいヒーローカード（後光・浮遊）。
- `app/components/MorpheusGuide.tsx` — 固定/インライン吹き出し。固定時は`--bottom-nav-h`分 translateY で逃げる。
- `app/components/BottomTabBar.tsx` — モバイル下ナビ。表示時に `body.has-bottom-nav` を付与。

### アバター適用のレシピ（残り画面で踏襲）
全身`MorpheusImage`や絵文字の小さな飾りを、`<MorpheusAvatar variant=... size=... />` に差し替え。囲みの四角枠はアバター自身の`ring`があるので除去。variantは画面の気分で選ぶ（分析=analysis、お祝い/まとめ=reward、案内=landing 等）。

## 5. ハマりどころ（必読）

1. **ブラケットパスは必ずクォート**: `app/dream/[id]/page.tsx` 等。`git add "app/dream/[id]/page.tsx"`、`git show 'HEAD:frontend/app/forest/[profileId]/page.tsx'`。素のglobで失敗する。
2. **squashマージ後のスタックPR**: 親PRがsquashマージされると子ブランチの元コミットはmainに無い。`git rebase --onto origin/main <旧親tip> <branch>` で自分の差分だけ載せ替えてからPR作成。
3. **ボトムバーの`<nav>`に`backdrop-filter`/`transform`を付けない**: 中央FABの`DreamEntryLauncher`モーダル(`fixed inset-0 z-[100]`)の包含ブロック化で全画面化が壊れる。navはソリッド`bg-background`。
4. **認証ページの見た目検証**: 多くの画面はログイン必須でpreview不可。`preview_eval`で対象要素と同一のstyle/transformを持つ要素をDOMに**注入してスクショ**すれば認証なしで発色/クロップを確認できる（アバターのクロップ確認に使用）。
5. **`yarn build` の既存tscエラー**: 上記 forest の named export 型エラーが出ることがある。webpack compileが通り、当該変更ファイル由来の**新規**エラーが無ければゲートは満たす（既存エラーは#4で対応）。

## 6. 守りのMust（7月運用タスク・別軸・ユーザーの手が必要）

リデザインとは別に、7月計画の「守り」が未消化。順番厳守:
1. Trial P3 本番実機確認（trial→夢作成→本登録→夢が残る）
2. Render console で `dream_profile_id` の NULL件数確認 → `ensure_self_profiles` → `backfill_dream_profile_id` → **NULL 0件確認** → **NOT NULL migration**（この順序を破らない）
3. Stripe 本番フロー通しテスト（購入→Webhook→premium→Portal）
4. SEO（metadata/OGP/sitemap/robots は #393 で対応済み。Search Console登録は残）

## 7. 次の推奨アクション（Codexへ）

1. #401 の状況を確認し、被らない範囲で **#3 残り画面のアバター適用**を1スライスずつ（規約§1）。
2. 区切りが良ければ **#4 森画面**（forest型エラー修正を同梱、単独PR、慎重に）。
3. `redesign-code/` の大きめ機能（⌘K・サイドバー・インサイトダッシュボード）は**新しいサブPJ**として spec から。デスクトップ志向なのでモバイル世界観との両立を設計で詰める。
4. リデザインが一段落したら **守りのMust（§6）** に戻るのが計画上の正道（品質→DB安全化→課金確認の順）。
