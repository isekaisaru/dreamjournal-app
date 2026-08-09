# 夢の森一覧（/forest）デスクトップ化 — 常駐右サイドパネル 設計仕様

## 背景

Claude Design MCP経由で「YumeTree Web改善提案.dc.html」という外部デザインハンドオフが提示された。この提案は⑪として「夢の森」画面のデスクトップ改善を提案していたが、**実装コードを一切読まずに書かれたもの**であり、既存実装（Phase1〜4 + デザインシステム基盤#0で作り込まれた、昼夜/季節アトモスフィア・Canvasパーティクル・物理演算ツリー等を備えた高水準な画面）を踏まえていない。

一方で、提案の中核的な診断は実装調査により裏付けられた：

- `frontend/app/components/forest/` 配下のコンポーネントに **`lg:` ブレークポイントが1つも存在しない**（`grep -rn "lg:"` で確認済み）
- `/forest` 一覧ページは `max-w-3xl`（約768px）固定で中央寄せされており、1440px画面では左右に約670pxの死んだ余白が生じる
- 木をタップすると `TreePreviewSheet`（下からスライドする浮遊カード）が開くが、これは森キャンバスの上に重なる形式で、広い画面での探索性を損なう

提案は複数の独立した機能（右サイドパネル化／月スクラバーでのタイムトラベル／ホバー＋キーボード操作／ズーム画像シェア／ヘッダー統計チップ）を1つに束ねていたため、まず最初の1スライスとして **`/forest`一覧画面の常駐右サイドパネル化** に絞って実装する。

## スコープ

**含む:**
- `/forest`一覧ページのlg+（1024px以上）でのレイアウトを、「森キャンバス（左）＋常駐プレビューパネル（右）」の2カラムに変更
- lg未満（モバイル・タブレット）は現状の挙動を完全に維持

**含まない（別スライスとして後日検討）:**
- `/forest/[profileId]` 詳細ページのデスクトップ化
- 月スクラバーによるタイムトラベル機能
- ホバーツールチップ・矢印キーによる木の選択（ユーザー判断により今回スコープ外と確定）
- ズーム画像シェア機能
- ヘッダーへの新着・連続記録チップ追加

## 現状の実装（変更の起点）

- `frontend/app/forest/page.tsx` — `ForestScene`を`max-w-3xl`のコンテナで描画するだけの薄いページ
- `frontend/app/components/forest/ForestScene.tsx`（415行）— パン/ズーム可能な森キャンバス本体。内部に`selectedId` stateを持ち、木タップで`TreePreviewSheet`を開く。ポインタ捕捉によるドラッグ/ピンチ判定ロジックは繊細で、コード内に「重要」と明記されている（`pointerdown`で即捕捉するとタップのclickが発火しなくなるため、ドラッグと確定してから捕捉する設計）
- `frontend/app/components/forest/TreePreviewSheet.tsx` — 木タップ時に下からスライドする浮遊カード。自前で`getDreamsForProfile`を呼び直近の夢を1件取得し、プロフィール見出し・直近の夢・「このきを見る›」CTAを表示する
- `frontend/app/components/forest/ForestTodayCard.tsx` — `ForestScene`の右上に絶対配置される「きょうのもり」統計カード（`totalDreams`・`topProfile`を表示）

## アーキテクチャ

`ForestScene`の内部ロジック（ドラッグ/ピンチ判定・パン・ズームクランプ）には一切触れず、「選択状態」だけを`ForestScene`から`/forest/page.tsx`へ引き上げる**制御コンポーネント化**を行う。これにより:

- モバイルの挙動（タップでシート表示、ドラッグ中はタップ判定しない等）は完全に無傷
- ページが選択状態の単一の情報源（source of truth）となり、モバイル用シートとデスクトップ用パネルの両方に同じデータを配れる

### 新規ファイル

| ファイル | 役割 |
|---|---|
| `frontend/app/components/forest/TreePreviewContent.tsx` | プロフィール見出し・直近の夢・CTAボタンの中身だけを描画する純粋な表示コンポーネント。データ取得を一切行わない |
| `frontend/app/components/forest/TreeSidePanel.tsx` | lg+専用の常駐右パネル。未選択時は`ForestTodayCard`を内包表示、選択時は`TreePreviewContent`を表示 |
| `frontend/app/components/forest/useRecentDream.ts` | `getDreamsForProfile`を叩いて直近の夢を1件取得するカスタムフック。`TreePreviewSheet`の自前fetchロジックを抽出したもの |

### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `frontend/app/forest/page.tsx` | `selectedProfileId: number \| null` stateを保有。`useRecentDream(selectedProfileId)`を呼びデータを取得。lg+で`ForestScene`と`TreeSidePanel`を2カラムで描画するようコンテナを変更（`max-w-3xl` → lg+で`lg:max-w-6xl`程度に拡張） |
| `frontend/app/components/forest/ForestScene.tsx` | 内部`selectedId` useStateを廃止。`selectedProfileId`・`onSelectTree`・`onCloseSheet`・`recentDream`・`loading`をpropsで受け取る制御コンポーネントに変更。`isSelected`判定・`TreePreviewSheet`への受け渡しをpropsベースに書き換える。ドラッグ/ピンチ/パン/クランプのロジックには一切触れない |
| `frontend/app/components/forest/TreePreviewSheet.tsx` | 自前の`getDreamsForProfile`呼び出しを削除し、`recentDream`・`loading`をpropsで受け取る。中身の描画を`TreePreviewContent`に委譲。ラッパーのmotion.divに`lg:hidden`を追加（既存の`MorpheusGuideLogin`ラッパーと同じ「hiddenクラスで非表示、アンマウントはしない」パターンを踏襲） |
| `frontend/app/components/forest/ForestScene.tsx`内の`ForestTodayCard`呼び出し箇所 | `<div className="lg:hidden">`でラップ（`TreeSidePanel`が同役割を引き継ぐため） |

## データフロー

```
/forest/page.tsx
  ├─ selectedProfileId: number | null  (useState)
  ├─ selectedProfile = profiles.find(p => p.id === selectedProfileId) ?? null
  ├─ { recentDream, loading } = useRecentDream(selectedProfileId)   ← ここで1回だけ取得
  │
  ├─→ <ForestScene
  │      profiles
  │      selectedProfileId
  │      onSelectTree={(p) => setSelectedProfileId(p.id)}
  │      onCloseSheet={() => setSelectedProfileId(null)}
  │      recentDream
  │      loading
  │   />
  │      内部で <TreePreviewSheet profile={selected} recentDream loading onOpen onClose /> を描画
  │      （位置は現状どおり ForestScene の relative div 基準を維持。JSXの描画位置は移動しない）
  │
  └─→ <TreeSidePanel
         profiles
         selectedProfile
         recentDream
         loading
         onOpen={(p) => router.push(`/forest/${p.id}`)}
         onClose={() => setSelectedProfileId(null)}
      />
```

`recentDream`の取得は**ページで1回だけ**行い、モバイルの`TreePreviewSheet`とデスクトップの`TreeSidePanel`の両方に同じデータを配る。両者ともDOM上には常にマウントされ`hidden`クラスで出し分けるだけなので、フックをそれぞれの内部に置くと選択のたびにAPIが二重に発火してしまう。これを避けるため、フックの呼び出し箇所はページに一本化する。

## レスポンシブ挙動

| 幅 | ForestScene | TreePreviewSheet | ForestTodayCard（浮遊） | TreeSidePanel |
|---|---|---|---|---|
| < lg (1024px未満) | 全幅・現状のまま | 表示（下からスライド） | 表示 | 非表示（`hidden`） |
| ≥ lg | 左カラム（`flex-1 min-w-0`で残り幅に自動追従） | マウントはされるが`lg:hidden`で非表示 | `lg:hidden`で非表示 | 表示（`hidden lg:flex`、常駐、目安`lg:w-[360px]`） |

- ページコンテナは現在`max-w-3xl`固定。lg+では`lg:max-w-6xl`程度に広げ、2カラムが実際に画面幅を使えるようにする
- `ForestScene`は自前で`ResizeObserver`により`W`/`H`を計測しているため、左カラム幅が狭まっても追加対応なしで森キャンバスが追従する
- `TreeSidePanel`未選択時の中身は新規デザインを起こさず、**既存の`ForestTodayCard`をそのまま流用**（`totalDreams`・`topProfile`）＋「きを えらんでね」の一言のみ追加する

## エラーハンドリング・エッジケース

| ケース | 挙動 |
|---|---|
| プロフィール0件（`profiles.length === 0`） | `TreeSidePanel`は`null`を返し非表示（lg+でも1カラムのまま）。空の箱を出さない |
| `recentDream`取得失敗 | `useRecentDream`が例外を握りつぶし`recentDream: null`を返す（既存`TreePreviewSheet`の「静かに無視」動作を踏襲）。`TreePreviewContent`は`recentDream`が`null`なら「さいきんの ゆめ」欄を単純に省略する |
| 木を素早く連続タップ（プロフィールA→Bと選択が変わる） | `useRecentDream`内で`cancelled`フラグにより古い応答を破棄する（既存`TreePreviewSheet`の`useEffect`パターンをフックへそのまま移植） |
| lg+でパネル選択中に森キャンバスをドラッグでパン | ドラッグ判定ロジックは`ForestScene`内部のまま無変更なので影響なし。パネルは選択中プロフィールを表示し続ける（パンしても選択は変わらない＝現状のシートと同じ挙動） |

## テスト方針

**新規ユニットテスト**
- `useRecentDream.test.ts` — 正常取得／エラー握りつぶし／プロフィール切替時の古い応答破棄
- `TreePreviewContent.test.tsx` — プロフィール情報の表示／直近の夢あり・なしの出し分け／CTAクリックで`onOpen`が発火すること
- `TreeSidePanel.test.tsx` — 未選択時に`ForestTodayCard`が表示されること／選択時に`TreePreviewContent`が表示されること／`profiles`が空なら何も描画しないこと

**既存テストへの影響確認**
- `__tests__/components/ForestScene.test.tsx`（`getInitialForestView`／`clampForestView`／`getSafePinchZoom`の純粋関数テスト）— 対象ロジックは無変更のため、そのままグリーン維持が期待値
- `__tests__/components/ForestProfilePage.test.tsx`（詳細ページ側）— 今回のスライス対象外、無影響

**E2E**
- `e2e/forest-flow.spec.ts`（既存・モバイル想定）— 無修正で引き続きパスすることを確認
- 同ファイルに新規デスクトップビューポート（lg+）ケースを追加: 「木をクリック→右パネルにプレビュー表示→詳細へ遷移」「未選択時は今日のもり情報がパネルに出ている」の最小2ケース

## 実装後の検証項目

- 375px・768px・1440pxの3ブレークポイントでのブラウザ確認（モバイル無変更／lg+2カラム）
- ダークモード確認
- 既存のドラッグ/ピンチ/タップ判定が壊れていないことをモバイル幅で再確認（最重要リグレッションリスク）
- `tsc --noEmit`／`next build`／`git diff --check`
