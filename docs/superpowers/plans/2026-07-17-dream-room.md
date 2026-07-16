# 夢の部屋（額縁の壁）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** プロフィールごとのAI生成夢画像を「額縁の壁」として振り返れる新規ページ `/room/[profileId]` を追加する。

**Architecture:** `GET /dreams`（一覧API）に`image_generated_at`を1列追加するだけで既存の軽量方針（`generated_image_url`は一覧から除外）を維持する。フロントは`getDreamsForProfile`で取得した夢のうち画像生成済みのものを`image_generated_at`降順（同時刻は`id`降順）で並べ、最大6件を「額縁」として表示する。各額縁の画像本体は`GET /dreams/:id`を直列でlazy-fetchし、取得できた額縁から順にフェードインする。新規ルートのため認証ゲート4箇所（`AuthContext.tsx`・`proxy.ts`・`lib/site.ts`・`proxy.ts`の`config.matcher`）に登録し、`proxy.ts`はNext.jsの特殊ファイル制約を守るため判定ロジックを通常モジュール`lib/protectedRoutes.ts`へ切り出す。入り口は森の詳細ページとTreePreviewSheetの2箇所。

**Tech Stack:** Rails 7.2 / RSpec request specs（Docker） / Next.js 16 App Router / React / TypeScript / Tailwind v4 / framer-motion / Jest + Testing Library。

**Source spec:** `docs/superpowers/specs/2026-07-17-dream-room-design.md`

## Global Constraints

- 額縁は最大6枚。`image_generated_at`降順、同時刻は`id`降順でタイブレークする（`MAX_FRAMES = 6`）。
- 各額縁の画像取得は`GET /dreams/:id`を**直列**（`for...of` + `await`。並列`Promise.all`ではない）でlazy-fetchする。
- 1件の取得失敗は他の額縁の取得を止めない。失敗した額縁は`loading`のまま止まらず`error`状態にし、「もういちど」ボタンで再試行できる（**非表示にはしない**）。
- ページ離脱時は`AbortController`で未解決フェッチを中断し、`AbortError`時は`state`更新を行わない。
- 空状態は2分岐: 夢0件→`/dream/new`、夢はあるが画像0件→最新夢の詳細（`dreams[0].id`）。いずれも`/home`に戻すだけにしない。
- `generated_image_url`は一覧APIに含めない（既存の軽量方針を維持）。新規エンドポイント・migration・DBスキーマ変更は追加しない。
- 画像のオンスクリーン表示は`next/image`に`unoptimized`+`onError`を渡すだけの既存パターン（`DreamShareCard`と同様）を再利用し、`/api/image-proxy`は使わない（保存機能を持たないため不要）。
- `proxy.ts`はNext.jsの特殊ファイル（`proxy`関数と`config`のみexport可）のため、認証判定用の定数・関数は`frontend/lib/protectedRoutes.ts`へ切り出す。`config.matcher`は静的解析が必要なため**既存のリテラル配列定義を維持**する（`protectedRoutes.ts`から動的導出しない）。
- 新規ルート`/room`は`AuthContext.tsx`の`AUTH_VERIFY_PATH_PREFIXES`・`lib/protectedRoutes.ts`の`PROTECTED_PAGE_PREFIXES`・`lib/site.ts`の`NON_INDEXABLE_PATH_PREFIXES`・`proxy.ts`の`config.matcher`の**4箇所全て**に登録し、登録漏れを1つのテストで検出できるようにする。
- 新規ナビタブは追加しない（`BottomTabBar`は4枚＋FABで満席）。7枚目以降のページングは対象外。
- 開発開始条件（satisfied）: PR #428がCI全緑・Codex指摘なしで`main`へマージ済み（`cfa440a`）。本プランは最新`origin/main`起点のworktreeで実行する。

---

## File Structure

- Modify: `backend/app/controllers/dreams_controller.rb` — `index`の`index_columns`に`image_generated_at`追加
- Modify: `backend/spec/requests/dreams_spec.rb` — indexの軽量性テスト2件追加
- Create: `frontend/lib/protectedRoutes.ts` — `PROTECTED_PAGE_PREFIXES`・`isProtectedPage`
- Modify: `frontend/proxy.ts` — `isProtectedPage`判定を`lib/protectedRoutes.ts`参照に置換、`config.matcher`に`/room/:path*`追加
- Modify: `frontend/context/AuthContext.tsx` — `AUTH_VERIFY_PATH_PREFIXES`をexport化＋`/room`追加
- Modify: `frontend/lib/site.ts` — `NON_INDEXABLE_PATH_PREFIXES`に`/room`追加
- Create: `frontend/__tests__/lib/route-registration.test.ts` — 4箇所の登録漏れ検出テスト
- Modify: `frontend/app/types.ts` — `Dream.image_generated_at`追加
- Create: `frontend/app/room/[profileId]/page.tsx` — 夢の部屋ページ本体
- Create: `frontend/__tests__/app/room/page.test.tsx` — 部屋ページのテスト
- Modify: `frontend/app/forest/[profileId]/page.tsx` — ヘッダーに「へやを のぞく」リンク追加
- Modify: `frontend/app/components/forest/TreePreviewSheet.tsx` — `onPeekRoom` prop＋ボタン追加
- Modify: `frontend/__tests__/components/TreePreviewSheet.test.tsx` — 既存5箇所（`render`4件＋`rerender`1件）に`onPeekRoom`追加＋新規テスト1件
- Modify: `frontend/app/components/forest/ForestScene.tsx` — `onPeekRoom`ハンドラ配線

---

### Task 1: 一覧APIに `image_generated_at` を追加

**Files:**
- Modify: `backend/app/controllers/dreams_controller.rb`
- Modify: `backend/spec/requests/dreams_spec.rb`

**Interfaces:**
- Consumes: 既存`Dream`モデルの`image_generated_at`カラム（`datetime`、既存・migration不要）
- Produces: `GET /dreams`のJSONレスポンスに`image_generated_at`（ISO8601文字列 or null）を含む。`generated_image_url`は引き続き含まない

- [ ] **Step 1: 失敗するrequest specを書く**

`backend/spec/requests/dreams_spec.rb`の`describe 'GET /dreams (index)'` > `context '認証済みユーザーの場合'`ブロック内、`'夢プロフィールの軽量情報を含める'`テストの直後に追加:

```ruby
      it 'image_generated_at を含める（部屋のギャラリー用）' do
        dream = create(
          :dream,
          user: user,
          image_generated_at: Time.current,
          generated_image_url: 'data:image/png;base64,ZmFrZQ=='
        )

        authenticated_get('/dreams', user)

        json_response = JSON.parse(response.body)
        returned_dream = json_response.find { |item| item['id'] == dream.id }
        expect(returned_dream).to have_key('image_generated_at')
        expect(returned_dream['image_generated_at']).to be_present
      end

      it 'generated_image_url は一覧に含めない（軽量化を維持）' do
        create(
          :dream,
          user: user,
          image_generated_at: Time.current,
          generated_image_url: 'data:image/png;base64,ZmFrZQ=='
        )

        authenticated_get('/dreams', user)

        json_response = JSON.parse(response.body)
        expect(json_response.first).not_to have_key('generated_image_url')
      end
```

Run:

```bash
docker compose run --rm --no-deps backend-test bundle exec rspec spec/requests/dreams_spec.rb
```

Expected: 新しい2件が`image_generated_at`未実装のためFAIL（1件目は`have_key`失敗、2件目は元々`generated_image_url`が無いので実は先にPASSする可能性がある — その場合は1件目の失敗のみで正しい。両方観察して記録する）。

- [ ] **Step 2: `index_columns`に列を追加**

`backend/app/controllers/dreams_controller.rb`の`index`アクション:

```ruby
    index_columns = %i[id title content created_at analysis_json analysis_status analyzed_at user_id dream_profile_id image_generated_at]
```

（既存の`%i[id title content created_at analysis_json analysis_status analyzed_at user_id dream_profile_id]`に`image_generated_at`を追加するだけ。他の行は変更しない）

- [ ] **Step 3: 実行して確認**

```bash
docker compose run --rm --no-deps backend-test bundle exec rspec spec/requests/dreams_spec.rb
```

Expected: PASS。既存の認可・一覧・月別・フィルタリングテストも含め全緑。

- [ ] **Step 4: コミット**

```bash
git add backend/app/controllers/dreams_controller.rb backend/spec/requests/dreams_spec.rb
git commit -m "feat: 一覧APIにimage_generated_atを追加（夢の部屋のギャラリー用）"
```

---

### Task 2: 認証ゲート4箇所への `/room` 登録＋登録漏れ検出テスト

**Files:**
- Create: `frontend/lib/protectedRoutes.ts`
- Modify: `frontend/proxy.ts`
- Modify: `frontend/context/AuthContext.tsx`
- Modify: `frontend/lib/site.ts`
- Create: `frontend/__tests__/lib/route-registration.test.ts`

**Interfaces:**
- Produces: `export const PROTECTED_PAGE_PREFIXES: string[]`・`export function isProtectedPage(pathname: string): boolean`（`frontend/lib/protectedRoutes.ts`）。Task 3のRoom pageは直接この関数を使わない（`proxy.ts`のミドルウェアが使う）が、後続タスクは`/room`パスがこの一覧に含まれることに依存する

- [ ] **Step 1: 失敗するテストを書く**

`frontend/__tests__/lib/route-registration.test.ts` を新規作成:

```ts
import { AUTH_VERIFY_PATH_PREFIXES } from "@/context/AuthContext";
import { PROTECTED_PAGE_PREFIXES } from "@/lib/protectedRoutes";
import { NON_INDEXABLE_PATH_PREFIXES } from "@/lib/site";
import { config } from "@/proxy";

// 新規ログイン必須ページを追加したら、認証ゲート4箇所（AuthContext / protectedRoutes /
// site.ts / proxy.tsのmatcher）すべてに登録されているかをここで機械的に検証する。
// 1箇所でも漏れると /login への意図しないリダイレクトや、ログイン済みなのに
// ログイン要求が一瞬出るなどの不具合につながる。
describe("認証ゲート登録: /room", () => {
  it("AuthContext.AUTH_VERIFY_PATH_PREFIXES に /room が含まれる", () => {
    expect(AUTH_VERIFY_PATH_PREFIXES).toContain("/room");
  });

  it("lib/protectedRoutes.PROTECTED_PAGE_PREFIXES に /room が含まれる", () => {
    expect(PROTECTED_PAGE_PREFIXES).toContain("/room");
  });

  it("lib/site.NON_INDEXABLE_PATH_PREFIXES に /room が含まれる", () => {
    expect(NON_INDEXABLE_PATH_PREFIXES).toContain("/room");
  });

  it("proxy.ts の config.matcher に /room/:path* が含まれる", () => {
    expect(config.matcher).toContain("/room/:path*");
  });
});
```

Run:

```bash
cd frontend && npx jest __tests__/lib/route-registration.test.ts
```

Expected: `@/lib/protectedRoutes`が存在しないためモジュール解決エラーでFAIL（他の3件も`/room`未登録のためFAILするはず）。

- [ ] **Step 2: `lib/protectedRoutes.ts`を新規作成**

```ts
// proxy.ts（Next.jsの特殊ファイル。proxy関数とconfigのみexport可）から
// 判定ロジックを切り出した通常モジュール。テストから直接importできるようにする。
export const PROTECTED_PAGE_PREFIXES = [
  "/home",
  "/dream",
  "/forest",
  "/insights",
  "/settings",
  "/room",
];

export function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
```

- [ ] **Step 3: `proxy.ts`を書き換え**

`frontend/proxy.ts`の先頭import群に追加:

```ts
import { isProtectedPage } from "./lib/protectedRoutes";
```

`isProtectedPage`という名前がローカル変数と衝突するため、既存の以下の行:

```ts
  const isProtectedPage =
    pathname.startsWith("/home") ||
    pathname.startsWith("/dream") ||
    pathname.startsWith("/forest") ||
    pathname.startsWith("/insights") ||
    pathname.startsWith("/settings");
```

を次に置き換える:

```ts
  const pageIsProtected = isProtectedPage(pathname);
```

その後、同ファイル内の`isProtectedPage`（変数としての参照、2箇所）を`pageIsProtected`に置き換える:

```ts
  if (!token && pageIsProtected) {
```

```ts
      } else if (!response.ok && pageIsProtected) {
```

最後に`config.matcher`（**リテラル配列のまま**、動的導出しない）に1行追加:

```ts
export const config = {
  // matcher にはミドルウェアを適用したいパスを指定
  matcher: [
    "/home/:path*",
    "/dream/:path*",
    "/forest/:path*",
    "/insights/:path*",
    "/settings/:path*",
    "/room/:path*",
    "/login",
    "/register",
  ],
};
```

- [ ] **Step 4: `AuthContext.tsx`を書き換え**

`frontend/context/AuthContext.tsx`の以下の行:

```ts
const AUTH_VERIFY_PATH_PREFIXES = [
  "/home",
  "/dream",
  "/forest",
  "/insights",
  "/settings",
  "/subscription",
  "/register",
];
```

を次に置き換える（`export`を追加し`/room`を追加。他の要素・順序は維持）:

```ts
export const AUTH_VERIFY_PATH_PREFIXES = [
  "/home",
  "/dream",
  "/forest",
  "/insights",
  "/settings",
  "/subscription",
  "/register",
  "/room",
];
```

- [ ] **Step 5: `lib/site.ts`を書き換え**

`frontend/lib/site.ts`の`NON_INDEXABLE_PATH_PREFIXES`配列に1行追加:

```ts
export const NON_INDEXABLE_PATH_PREFIXES = [
  "/api/", // APIエンドポイント
  "/home", // ログイン後トップ
  "/dream", // 夢の詳細・新規・月別（ユーザーデータ）
  "/my-dreams", // 夢一覧（ユーザーデータ）
  "/insights", // きもちインサイト（認証）
  "/forest", // 夢の森（認証）
  "/room", // 夢の部屋（認証）
  "/profiles", // プロフィール（認証）
  "/settings", // 設定（認証）
  "/subscription", // サブスク管理・決済リダイレクト（認証）
  "/verify-email", // メールアドレス確認（トークン付きリンク・公開だが個別URL）
  "/debug", // 開発用デバッグページ
] as const;
```

- [ ] **Step 6: 実行して確認**

```bash
cd frontend && npx jest __tests__/lib/route-registration.test.ts
```

Expected: PASS。もし`@/proxy`のimportで`next/server`解決エラーが出た場合（未検証の組み合わせ）、このプロジェクトは`next/jest`プリセットを使用しているため通常は解決されるはずだが、解決しない場合はテストの`config`取得方法を「`fs.readFileSync`でソースを読みリテラル配列を正規表現抽出する」方式に変更してよい（ロジックの本質的な検証内容は変えない）。

- [ ] **Step 7: 既存テストへの回帰確認＋コミット**

```bash
cd frontend && npx jest __tests__/app/seo.test.ts
```

Expected: PASS（`NON_INDEXABLE_PATH_PREFIXES`に要素を追加しただけなので影響なし）。

```bash
git add frontend/lib/protectedRoutes.ts frontend/proxy.ts frontend/context/AuthContext.tsx frontend/lib/site.ts frontend/__tests__/lib/route-registration.test.ts
git commit -m "feat: /roomルートを認証ゲート4箇所に登録し登録漏れ検出テストを追加"
```

---

### Task 3: 夢の部屋ページ本体

**Files:**
- Modify: `frontend/app/types.ts`
- Create: `frontend/app/room/[profileId]/page.tsx`
- Create: `frontend/__tests__/app/room/page.test.tsx`

**Interfaces:**
- Consumes: `getDreamProfiles()`・`getDreamsForProfile(profileId)`・`apiClient.get<Dream>(url, { signal })`（すべて`@/lib/apiClient`既存）、`useAuth()`（`@/context/AuthContext`既存）
- Produces: `export default function DreamRoomPage()`（`/room/[profileId]`ルート）。Task 4の入り口リンクはこのルートへ`router.push`/`<Link href>`する

- [ ] **Step 1: `Dream`型に`image_generated_at`を追加**

`frontend/app/types.ts`の`Dream`interface、`generated_image_url?: string;`の直後に追加:

```ts
  generated_image_url?: string;
  image_generated_at?: string;
```

- [ ] **Step 2: 失敗するテストを書く**

`frontend/__tests__/app/room/page.test.tsx` を新規作成:

```tsx
import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import DreamRoomPage from "@/app/room/[profileId]/page";
import type { Dream, DreamProfile } from "@/app/types";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    alt,
    fill,
    unoptimized,
    sizes,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    unoptimized?: boolean;
    sizes?: string;
  }) => <img alt={alt} {...props} />,
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  useParams: () => ({ profileId: "1" }),
}));

const mockUseAuth = jest.fn();
jest.mock("@/context/AuthContext", () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/app/loading", () => ({
  __esModule: true,
  default: () => <div>Loading</div>,
}));

const mockGetDreamProfiles = jest.fn();
const mockGetDreamsForProfile = jest.fn();
const mockApiGet = jest.fn();
jest.mock("@/lib/apiClient", () => ({
  __esModule: true,
  default: { get: (...args: unknown[]) => mockApiGet(...args) },
  getDreamProfiles: (...args: unknown[]) => mockGetDreamProfiles(...args),
  getDreamsForProfile: (...args: unknown[]) => mockGetDreamsForProfile(...args),
}));

function makeProfile(overrides: Partial<DreamProfile> = {}): DreamProfile {
  return {
    id: 1,
    name: "ねこさん",
    avatar_emoji: "🐱",
    color: "#f97316",
    relationship: "self",
    active: true,
    position: 0,
    archived: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeDream(id: number, overrides: Partial<Dream> = {}): Dream {
  return {
    id,
    title: `夢${id}`,
    userId: 1,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ authStatus: "authenticated" });
});

describe("DreamRoomPage: 並び順と件数上限", () => {
  it("image_generated_at 降順（同時刻は id 降順）で並び、6件を超える分は表示しない", async () => {
    const profile = makeProfile();
    const dreams = [
      makeDream(1, { image_generated_at: "2026-07-01T00:00:00Z" }),
      makeDream(2, { image_generated_at: "2026-07-05T00:00:00Z" }),
      makeDream(3, { image_generated_at: "2026-07-05T00:00:00Z" }), // 2と同時刻・idが大きい方が先
      makeDream(4, { image_generated_at: "2026-07-03T00:00:00Z" }),
      makeDream(5, { image_generated_at: "2026-07-02T00:00:00Z" }),
      makeDream(6, { image_generated_at: "2026-07-04T00:00:00Z" }),
      makeDream(7, { image_generated_at: "2026-07-06T00:00:00Z" }), // 7件目、最新なので入るが8件目相当は除外確認用に不要
    ];
    mockGetDreamProfiles.mockResolvedValue([profile]);
    mockGetDreamsForProfile.mockResolvedValue(dreams);
    mockApiGet.mockImplementation((url: string) => {
      const id = Number(url.split("/").pop());
      return Promise.resolve({
        ...dreams.find((d) => d.id === id),
        generated_image_url: `https://img.example/${id}.png`,
      });
    });

    render(<DreamRoomPage />);

    // 表示順は 7,3,2,6,4,5 の6件（idが大きい=1で作成された方が新しい前提のfixtureなので、
    // 実際の期待順は image_generated_at 降順: 7(07-06) > 3(07-05,id大) > 2(07-05,id小) > 6(07-04) > 4(07-03) > 5(07-02)
    for (const id of [7, 3, 2, 6, 4, 5]) {
      await screen.findByTestId(`room-frame-${id}`);
    }
    expect(screen.queryByTestId("room-frame-1")).not.toBeInTheDocument(); // 07-01が最古のため6件に入らない
  });
});

describe("DreamRoomPage: 逐次取得と部分失敗", () => {
  it("1件の取得が失敗しても他の額縁の取得を続け、失敗額縁に再試行ボタンを出す", async () => {
    const profile = makeProfile();
    const dreams = [
      makeDream(3, { image_generated_at: "2026-07-03T00:00:00Z" }),
      makeDream(2, { image_generated_at: "2026-07-02T00:00:00Z" }),
      makeDream(1, { image_generated_at: "2026-07-01T00:00:00Z" }),
    ];
    mockGetDreamProfiles.mockResolvedValue([profile]);
    mockGetDreamsForProfile.mockResolvedValue(dreams);
    mockApiGet.mockImplementation((url: string) => {
      if (url === "/dreams/2") return Promise.reject(new Error("network error"));
      const id = Number(url.split("/").pop());
      return Promise.resolve({
        ...dreams.find((d) => d.id === id),
        generated_image_url: `https://img.example/${id}.png`,
      });
    });

    render(<DreamRoomPage />);

    const frame3 = await screen.findByTestId("room-frame-3");
    await waitFor(() => expect(within(frame3).getByAltText("夢3")).toBeInTheDocument());

    const frame2 = await screen.findByTestId("room-frame-2");
    await waitFor(() =>
      expect(within(frame2).getByRole("button", { name: "もういちど" })).toBeInTheDocument()
    );

    const frame1 = await screen.findByTestId("room-frame-1");
    await waitFor(() => expect(within(frame1).getByAltText("夢1")).toBeInTheDocument());
  });

  it("失敗した額縁で「もういちど」を押すと再フェッチされ画像が表示される", async () => {
    const profile = makeProfile();
    const dreams = [makeDream(2, { image_generated_at: "2026-07-02T00:00:00Z" })];
    mockGetDreamProfiles.mockResolvedValue([profile]);
    mockGetDreamsForProfile.mockResolvedValue(dreams);
    mockApiGet
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({
        ...dreams[0],
        generated_image_url: "https://img.example/2.png",
      });

    render(<DreamRoomPage />);

    const frame2 = await screen.findByTestId("room-frame-2");
    const retryButton = await waitFor(() =>
      within(frame2).getByRole("button", { name: "もういちど" })
    );
    fireEvent.click(retryButton);

    await waitFor(() =>
      expect(within(screen.getByTestId("room-frame-2")).getByAltText("夢2")).toBeInTheDocument()
    );
  });

  it("unmount後にAbortErrorで解決しても例外を投げない", async () => {
    const profile = makeProfile();
    const dreams = [makeDream(1, { image_generated_at: "2026-07-01T00:00:00Z" })];
    mockGetDreamProfiles.mockResolvedValue([profile]);
    mockGetDreamsForProfile.mockResolvedValue(dreams);

    let rejectSlow: (e: unknown) => void = () => {};
    mockApiGet.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectSlow = reject;
        })
    );

    const { unmount } = render(<DreamRoomPage />);
    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());

    unmount();

    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    expect(() => rejectSlow(abortError)).not.toThrow();
  });
});

describe("DreamRoomPage: 空状態", () => {
  it("夢が0件のとき「ゆめを きろくする」を /dream/new へのリンクで表示する", async () => {
    const profile = makeProfile();
    mockGetDreamProfiles.mockResolvedValue([profile]);
    mockGetDreamsForProfile.mockResolvedValue([]);

    render(<DreamRoomPage />);

    const link = await screen.findByRole("link", { name: /ゆめを きろくする/ });
    expect(link).toHaveAttribute("href", "/dream/new");
  });

  it("夢はあるが画像が0件のとき「ゆめのえを つくる」を最新夢の詳細へのリンクで表示する", async () => {
    const profile = makeProfile();
    const dreams = [
      makeDream(2, { created_at: "2026-07-02T00:00:00Z" }),
      makeDream(1, { created_at: "2026-07-01T00:00:00Z" }),
    ];
    mockGetDreamProfiles.mockResolvedValue([profile]);
    mockGetDreamsForProfile.mockResolvedValue(dreams);

    render(<DreamRoomPage />);

    const link = await screen.findByRole("link", { name: /ゆめのえを つくる/ });
    expect(link).toHaveAttribute("href", "/dream/2");
  });
});

describe("DreamRoomPage: 見出し・アクセシビリティ", () => {
  it("長いプロフィール名でも見出しがtruncateクラスを持つ", async () => {
    const profile = makeProfile({ name: "とてもながいなまえのぷろふぃーるだよたとえばこんなかんじ" });
    mockGetDreamProfiles.mockResolvedValue([profile]);
    mockGetDreamsForProfile.mockResolvedValue([]);

    render(<DreamRoomPage />);

    const heading = await screen.findByRole("heading", { level: 1 });
    expect(heading.className).toEqual(expect.stringContaining("truncate"));
  });

  it("額縁画像のaltは夢タイトルである", async () => {
    const profile = makeProfile();
    const dreams = [makeDream(1, { title: "星空の夢", image_generated_at: "2026-07-01T00:00:00Z" })];
    mockGetDreamProfiles.mockResolvedValue([profile]);
    mockGetDreamsForProfile.mockResolvedValue(dreams);
    mockApiGet.mockResolvedValue({ ...dreams[0], generated_image_url: "https://img.example/1.png" });

    render(<DreamRoomPage />);

    await waitFor(() => expect(screen.getByAltText("星空の夢")).toBeInTheDocument());
  });
});
```

Run:

```bash
cd frontend && npx jest __tests__/app/room/page.test.tsx
```

Expected: `@/app/room/[profileId]/page`が存在しないためモジュール解決エラーでFAIL。

- [ ] **Step 3: `frontend/app/room/[profileId]/page.tsx` を新規作成**

```tsx
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import Loading from "@/app/loading";
import apiClient, { getDreamProfiles, getDreamsForProfile } from "@/lib/apiClient";
import type { Dream, DreamProfile } from "@/app/types";

const MAX_FRAMES = 6;

function isValidRoomProfileId(profileId: number): boolean {
  return Number.isInteger(profileId) && profileId > 0;
}

function normalizeDreamProfilesResponse(value: unknown): DreamProfile[] | null {
  if (Array.isArray(value)) return value as DreamProfile[];
  console.error("Unexpected dream profiles response for dream room", value);
  return null;
}

function normalizeProfileDreamsResponse(value: unknown): Dream[] {
  if (Array.isArray(value)) return value as Dream[];
  console.error("Unexpected dreams response for dream room", value);
  return [];
}

function findActiveProfile(profiles: DreamProfile[], profileId: number): DreamProfile | null {
  return profiles.find((p) => p.id === profileId && !p.archived) ?? null;
}

// image_generated_at 降順。同時刻は id 降順でタイブレークし、最大 MAX_FRAMES 件に絞る。
function selectFramesSource(dreams: Dream[]): Dream[] {
  return dreams
    .filter((d): d is Dream & { image_generated_at: string } => !!d.image_generated_at)
    .sort((a, b) => {
      const diff = new Date(b.image_generated_at).getTime() - new Date(a.image_generated_at).getTime();
      return diff !== 0 ? diff : b.id - a.id;
    })
    .slice(0, MAX_FRAMES);
}

type FrameStatus = "loading" | "loaded" | "error";
type Frame = { dream: Dream; status: FrameStatus; imageUrl?: string };

export default function DreamRoomPage() {
  const { authStatus } = useAuth();
  const router = useRouter();
  const params = useParams();
  const rawProfileId = params.profileId;
  const profileId = Number(rawProfileId);
  const reduceMotion = useReducedMotion();

  const [profile, setProfile] = useState<DreamProfile | null>(null);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    if (!isValidRoomProfileId(profileId)) {
      console.error("Invalid room profileId", rawProfileId);
      router.replace("/forest");
      setIsLoading(false);
      return;
    }

    try {
      const [profilesResponse, dreamsResponse]: [unknown, unknown] = await Promise.all([
        getDreamProfiles(),
        getDreamsForProfile(profileId),
      ]);
      const allProfiles = normalizeDreamProfilesResponse(profilesResponse);
      if (!allProfiles) {
        router.replace("/forest");
        return;
      }
      const found = findActiveProfile(allProfiles, profileId);
      if (!found) {
        router.replace("/forest");
        return;
      }
      setProfile(found);
      setDreams(normalizeProfileDreamsResponse(dreamsResponse));
    } catch (error) {
      console.error("Failed to load dream room", error);
      router.replace("/forest");
    } finally {
      setIsLoading(false);
    }
  }, [profileId, rawProfileId, router]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") load();
  }, [authStatus, load, router]);

  // dreamsが確定してから初めて計算される。参照はdreamsが変わらない限り安定。
  const framesSource = useMemo(() => selectFramesSource(dreams), [dreams]);

  const fetchFrame = useCallback(async (dream: Dream, signal: AbortSignal) => {
    try {
      const detail = await apiClient.get<Dream>(`/dreams/${dream.id}`, { signal });
      if (signal.aborted) return;
      setFrames((prev) =>
        prev.map((f) =>
          f.dream.id === dream.id ? { ...f, status: "loaded", imageUrl: detail.generated_image_url } : f
        )
      );
    } catch (error) {
      if ((error as Error)?.name === "AbortError" || signal.aborted) return;
      setFrames((prev) => prev.map((f) => (f.dream.id === dream.id ? { ...f, status: "error" } : f)));
    }
  }, []);

  // framesSource（画像を持つ夢、最大6件）が確定したら、額縁を「loading」で並べてから
  // 直列でlazy-fetchする。空配列のときは何もしない＝空状態の判定はframesSourceで行う
  // （framesの非同期更新に依存すると、初回レンダーで一瞬「画像0件」に見える一拍のズレが
  // 起きるため、判定は同期的なframesSourceを使う）。
  useEffect(() => {
    if (framesSource.length === 0) return;

    setFrames(framesSource.map((dream) => ({ dream, status: "loading" as const })));

    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      for (const dream of framesSource) {
        if (controller.signal.aborted) return;
        await fetchFrame(dream, controller.signal);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [framesSource, fetchFrame]);

  const retryFrame = useCallback(
    (dreamId: number) => {
      const frame = frames.find((f) => f.dream.id === dreamId);
      if (!frame) return;
      setFrames((prev) => prev.map((f) => (f.dream.id === dreamId ? { ...f, status: "loading" } : f)));
      const controller = abortRef.current ?? new AbortController();
      fetchFrame(frame.dream, controller.signal);
    },
    [frames, fetchFrame]
  );

  if (authStatus === "checking" || isLoading) return <Loading />;
  if (!profile) return null;

  const latestDream = dreams[0] ?? null;

  return (
    <div
      className="relative min-h-screen pb-24 text-white"
      style={{ background: `linear-gradient(180deg, ${profile.color}33, rgba(10,8,30,0.96) 55%)` }}
    >
      <header className="sticky top-0 z-10 bg-black/20 backdrop-blur-md">
        <div className="container mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link
            href={`/forest/${profile.id}`}
            className="flex min-h-[44px] shrink-0 items-center px-1 text-white/80 hover:text-white"
          >
            <ChevronLeft className="mr-1 h-5 w-5" /> へやから でる
          </Link>
          <h1 className="ml-3 min-w-0 flex-1 truncate text-lg font-bold">
            {profile.avatar_emoji} {profile.name} の おへや
          </h1>
        </div>
      </header>

      <main className="container relative z-[2] mx-auto max-w-3xl px-4 pt-8">
        {dreams.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-4 text-center">
            <span className="text-6xl" aria-hidden="true">
              🛏️
            </span>
            <p className="text-lg font-bold text-white/90">まだ ゆめが きろくされていないよ</p>
            <Link
              href="/dream/new"
              className="mt-2 rounded-full px-5 py-2 text-sm font-bold text-white shadow-lg"
              style={{ background: "linear-gradient(135deg, #7c3aed, #38bdf8)" }}
            >
              ゆめを きろくする
            </Link>
          </div>
        ) : framesSource.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-4 text-center">
            <span className="text-6xl" aria-hidden="true">
              🖼️
            </span>
            <p className="text-lg font-bold text-white/90">まだ えが かざられていないよ</p>
            {latestDream && (
              <Link
                href={`/dream/${latestDream.id}`}
                className="mt-2 rounded-full px-5 py-2 text-sm font-bold text-white shadow-lg"
                style={{ background: "linear-gradient(135deg, #7c3aed, #38bdf8)" }}
              >
                ゆめのえを つくる
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {frames.map((frame) => (
              <FrameCard
                key={frame.dream.id}
                frame={frame}
                profileColor={profile.color}
                reduceMotion={!!reduceMotion}
                onOpen={() => router.push(`/dream/${frame.dream.id}`)}
                onRetry={() => retryFrame(frame.dream.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function FrameCard({
  frame,
  profileColor,
  reduceMotion,
  onOpen,
  onRetry,
}: {
  frame: Frame;
  profileColor: string;
  reduceMotion: boolean;
  onOpen: () => void;
  onRetry: () => void;
}) {
  return (
    <div data-testid={`room-frame-${frame.dream.id}`}>
      <AnimatePresence mode="wait">
        {frame.status === "loaded" && frame.imageUrl ? (
          <motion.button
            key="loaded"
            type="button"
            onClick={onOpen}
            initial={reduceMotion ? undefined : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="relative aspect-square w-full overflow-hidden rounded-2xl border-4"
            style={{ borderColor: `${profileColor}88` }}
          >
            <Image
              src={frame.imageUrl}
              alt={frame.dream.title || "ラベルなし"}
              fill
              sizes="(max-width: 640px) 45vw, 220px"
              className="object-cover"
              unoptimized
            />
          </motion.button>
        ) : frame.status === "error" ? (
          <div
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-4 border-dashed p-2 text-center"
            style={{ borderColor: `${profileColor}55` }}
          >
            <span className="text-2xl" aria-hidden="true">
              💔
            </span>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80 hover:bg-white/20"
            >
              もういちど
            </button>
          </div>
        ) : (
          <div
            className="aspect-square animate-pulse rounded-2xl border-4"
            style={{ borderColor: `${profileColor}33`, background: `${profileColor}11` }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 4: 実行して確認**

```bash
cd frontend && npx jest __tests__/app/room/page.test.tsx
```

Expected: PASS。もし`useReducedMotion`のモック不足等で個別ケースが落ちる場合、`jest.setup.ts`の既存グローバルモック（`framer-motion`関連）を確認し、必要なら`jest.mock("framer-motion", ...)`をテストファイルに追加して`useReducedMotion`が`false`を返すようにする（既存の森系テストの流儀に合わせる）。

- [ ] **Step 5: 型チェック＋コミット**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "app/room|app/types.ts" || echo "変更ファイルにtscエラーなし"
```

Expected: 出力が「変更ファイルにtscエラーなし」のみ。

```bash
git add frontend/app/types.ts "frontend/app/room/[profileId]/page.tsx" frontend/__tests__/app/room/page.test.tsx
git commit -m "feat: 夢の部屋ページ（額縁の壁）を追加"
```

---

### Task 4: 森からの入り口2箇所

**Files:**
- Modify: `frontend/app/forest/[profileId]/page.tsx`
- Modify: `frontend/app/components/forest/TreePreviewSheet.tsx`
- Modify: `frontend/__tests__/components/TreePreviewSheet.test.tsx`
- Modify: `frontend/app/components/forest/ForestScene.tsx`

**Interfaces:**
- Consumes: Task 3で作った`/room/[profileId]`ルート
- Produces: なし（末端の導線追加）

- [ ] **Step 1: 森詳細ページのヘッダーにリンクを追加**

`frontend/app/forest/[profileId]/page.tsx`の`<header>`ブロック（既存の`<div className="container mx-auto flex h-14 max-w-3xl items-center px-4">...</div>`の閉じタグの直後、`</header>`の直前）に新しい行を追加:

既存:
```tsx
      <header className="sticky top-0 z-10 bg-black/20 backdrop-blur-md">
        <div className="container mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link href="/forest" className="flex min-h-[44px] items-center px-1 text-white/80 hover:text-white">
            <ChevronLeft className="mr-1 h-5 w-5" /> もりに もどる
          </Link>
          <h1 className="ml-3 whitespace-nowrap text-lg font-bold">
            {profile.avatar_emoji} {profile.name} の き
          </h1>
          <span
            className="ml-auto rounded-full px-3 py-1 text-[13px] font-black"
            style={{
              background: `${profile.color}22`,
              border: `1px solid ${profile.color}66`,
              color: profile.color,
            }}
          >
            {lvl.name}（{lvl.reading}）
          </span>
        </div>
      </header>
```

変更後（末尾に1ブロック追加、既存行は非変更）:
```tsx
      <header className="sticky top-0 z-10 bg-black/20 backdrop-blur-md">
        <div className="container mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link href="/forest" className="flex min-h-[44px] items-center px-1 text-white/80 hover:text-white">
            <ChevronLeft className="mr-1 h-5 w-5" /> もりに もどる
          </Link>
          <h1 className="ml-3 whitespace-nowrap text-lg font-bold">
            {profile.avatar_emoji} {profile.name} の き
          </h1>
          <span
            className="ml-auto rounded-full px-3 py-1 text-[13px] font-black"
            style={{
              background: `${profile.color}22`,
              border: `1px solid ${profile.color}66`,
              color: profile.color,
            }}
          >
            {lvl.name}（{lvl.reading}）
          </span>
        </div>
        <div className="container mx-auto flex max-w-3xl justify-end px-4 pb-2">
          <Link
            href={`/room/${profile.id}`}
            className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-bold text-white/80 hover:bg-white/10"
          >
            🖼️ へやを のぞく
          </Link>
        </div>
      </header>
```

- [ ] **Step 2: `TreePreviewSheet`に`onPeekRoom`を追加（失敗するテストを先に書く）**

`frontend/__tests__/components/TreePreviewSheet.test.tsx`には`<TreePreviewSheet ... />`を渡す呼び出しが**5箇所**ある（61行目`render`、71行目`rerender`、92行目・118行目・135行目の`render`）。すべてに`onPeekRoom={jest.fn()}`を追加する（`onOpen={jest.fn()}`の直後に1行追加、他は変更しない）。最初の2箇所（`render`と直後の`rerender`）はどちらも同じ`<TreePreviewSheet>`要素なので両方に追加する:

```tsx
    const { rerender } = render(
      <TreePreviewSheet
        profile={profile({ id: 1, name: "自分" })}
        onOpen={jest.fn()}
        onPeekRoom={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(await screen.findByText(/前の木のゆめ/)).toBeInTheDocument();

    rerender(
      <TreePreviewSheet
        profile={profile({ id: 2, name: "家族", dreams_count: 2 })}
        onOpen={jest.fn()}
        onPeekRoom={jest.fn()}
        onClose={jest.fn()}
      />
    );
```

残り3箇所（92行目・118行目・135行目）も同様に`onOpen={jest.fn()}`の直後へ`onPeekRoom={jest.fn()}`を1行追加する。加えて、ファイル末尾（最後の`});`の直前）に新規テストを追加:

```tsx

  it("「へやを のぞく」を押すと onPeekRoom が呼ばれる", async () => {
    mockedGetDreamsForProfile.mockResolvedValueOnce([]);
    const handlePeekRoom = jest.fn();

    render(
      <TreePreviewSheet
        profile={profile({ id: 3, name: "ふたり" })}
        onOpen={jest.fn()}
        onPeekRoom={handlePeekRoom}
        onClose={jest.fn()}
      />
    );

    const button = await screen.findByRole("button", { name: /へやを のぞく/ });
    button.click();

    expect(handlePeekRoom).toHaveBeenCalledWith(
      expect.objectContaining({ id: 3, name: "ふたり" })
    );
  });
```

Run:

```bash
cd frontend && npx jest __tests__/components/TreePreviewSheet.test.tsx
```

Expected: 新規テストがボタン未実装のためFAIL。既存4件は`onPeekRoom`が未定義のprop型のためTypeScriptエラーになる可能性があるが、Jest実行自体はランタイムでは通ることがある（tscは後段Stepで確認する）。

- [ ] **Step 3: `TreePreviewSheet.tsx`を実装**

`frontend/app/components/forest/TreePreviewSheet.tsx`の`TreePreviewSheetProps`:

```ts
interface TreePreviewSheetProps {
  profile: DreamProfile | null;
  onOpen: (profile: DreamProfile) => void;
  onPeekRoom: (profile: DreamProfile) => void;
  onClose: () => void;
}
```

関数シグネチャ:

```tsx
export default function TreePreviewSheet({ profile, onOpen, onPeekRoom, onClose }: TreePreviewSheetProps) {
```

既存の「この きを 見る ›」ボタンの直後（`</button>`の後、`</motion.div>`の前）に追加:

```tsx
          <button
            onClick={() => onPeekRoom(profile)}
            className="mt-2 w-full rounded-[13px] border border-white/15 bg-white/5 py-2 text-[13px] font-bold text-white/70 hover:bg-white/10"
          >
            🖼️ へやを のぞく
          </button>
```

- [ ] **Step 4: `ForestScene.tsx`に配線を追加**

`frontend/app/components/forest/ForestScene.tsx`の`<TreePreviewSheet>`呼び出し:

```tsx
      <TreePreviewSheet
        profile={selected}
        onOpen={(p) => router.push(`/forest/${p.id}`)}
        onPeekRoom={(p) => router.push(`/room/${p.id}`)}
        onClose={() => setSelectedId(null)}
      />
```

- [ ] **Step 5: 実行して確認**

```bash
cd frontend && npx jest __tests__/components/TreePreviewSheet.test.tsx __tests__/components/ForestScene.test.tsx __tests__/components/ForestProfilePage.test.tsx
```

Expected: 全てPASS。

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "TreePreviewSheet|ForestScene|forest/\[profileId\]/page" || echo "変更ファイルにtscエラーなし"
```

Expected: 「変更ファイルにtscエラーなし」。

- [ ] **Step 6: コミット**

```bash
git add "frontend/app/forest/[profileId]/page.tsx" frontend/app/components/forest/TreePreviewSheet.tsx frontend/__tests__/components/TreePreviewSheet.test.tsx frontend/app/components/forest/ForestScene.tsx
git commit -m "feat: 森詳細画面とTreePreviewSheetに夢の部屋への入り口を追加"
```

---

### Task 5: 全体検証・手動QA

**Files:** なし（検証のみ）

- [ ] **Step 1: フロント対象テスト**

```bash
cd frontend && npx jest __tests__/app/room/page.test.tsx __tests__/lib/route-registration.test.ts __tests__/components/TreePreviewSheet.test.tsx __tests__/components/ForestScene.test.tsx __tests__/components/ForestProfilePage.test.tsx __tests__/app/seo.test.ts
```

Expected: 全てPASS。

- [ ] **Step 2: フロント全体・型検査**

```bash
cd frontend && npx jest
cd frontend && npx tsc --noEmit
```

Expected: 既存スイートを含めて全PASS。`tsc`は新規型エラーなし（既存の`__tests__`配下の既知のjest-mock型ノイズは対象外）。

- [ ] **Step 3: backend対象spec**

```bash
docker compose run --rm --no-deps backend-test bundle exec rspec spec/requests/dreams_spec.rb
```

Expected: PASS。

- [ ] **Step 4: 静的差分確認**

```bash
git diff --check
git status --short
```

変更が本プラン対象ファイル＋設計・計画ドキュメントのみであることを確認する。

- [ ] **Step 5: 手動QA（デプロイ後のスマホ実機・375px幅）**

- [ ] 森詳細ページから「へやを のぞく」で`/room/:id`に遷移できる
- [ ] `TreePreviewSheet`の「へやを のぞく」でも同様に遷移できる
- [ ] AI画像を複数持つプロフィール: 額縁が新しい順（`image_generated_at`降順）に並び、6枚を超えても6枚までしか出ない
- [ ] 額縁タップで夢詳細へ遷移する
- [ ] 夢が0件のプロフィール: 「ゆめを きろくする」→`/dream/new`
- [ ] 夢はあるが画像0件のプロフィール: 「ゆめのえを つくる」→最新夢の詳細
- [ ] 375px幅で額縁グリッドが横にはみ出さない
- [ ] 長いプロフィール名でヘッダーが崩れない（truncate）
- [ ] キーボードのTab移動で額縁にフォーカスが移り、Enterで開ける
- [ ] `prefers-reduced-motion`をONにした状態でフェードイン演出が止まる
- [ ] 「へやから でる」で森詳細に戻れる

## Done Criteria

- `GET /dreams`が`image_generated_at`を返し、`generated_image_url`は返さない（RSpec緑）。
- `/room/[profileId]`が額縁の壁として画像を降順・最大6枚で表示し、1件の取得失敗が他に波及しない。
- ページ離脱後の遅延解決が状態更新エラーを起こさない。
- `/room`が認証ゲート4箇所すべてに登録されており、専用テストで検証されている。
- 森詳細ページ・TreePreviewSheetの2箇所から`/room`へ遷移できる。
- フロントJest・tsc・backend RSpec・手動QAが完了している。
