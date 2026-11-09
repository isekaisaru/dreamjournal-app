import { renderHook, act, waitFor } from "@testing-library/react";
import { useDream } from "@/hooks/useDream";
import type { Dream } from "@/app/types";
import apiClient from "@/lib/apiClient";

const stableRouter = { push: jest.fn(), replace: jest.fn(), refresh: jest.fn() };
jest.mock("next/navigation", () => ({
  useRouter: () => stableRouter,
}));

const mockUseAuth = jest.fn();
jest.mock("@/context/AuthContext", () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/lib/apiClient", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const mockedGet = jest.mocked(apiClient.get);
const mockedPut = jest.mocked(apiClient.put);
const mockedDelete = jest.mocked(apiClient.delete);

function dream(overrides: Partial<Dream> = {}): Dream {
  return {
    id: 1,
    title: "夢A",
    userId: 1,
    created_at: "2026-06-14T00:00:00Z",
    updated_at: "2026-06-14T00:00:00Z",
    ...overrides,
  } as Dream;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("useDream: 夢の詳細ページでdreamIdを素早く切り替えたときのレース条件", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockUseAuth.mockReturnValue({ authStatus: "authenticated", isLoggedIn: true });
  });

  it("夢1の取得が遅延している間に夢2へ切り替えても、後から届く1の結果で2の表示が上書きされない", async () => {
    const dreamsDeferred: Record<string, ReturnType<typeof deferred<Dream>>> = {
      "1": deferred<Dream>(),
      "2": deferred<Dream>(),
    };

    mockedGet.mockImplementation((url: string) => {
      const match = url.match(/\/dreams\/(\d+)/);
      const id = match ? match[1] : "";
      return dreamsDeferred[id].promise as any;
    });

    const { result, rerender } = renderHook(({ id }) => useDream(id), {
      initialProps: { id: "1" as string | undefined },
    });

    rerender({ id: "2" });

    // 夢2の応答が先に届く
    await act(async () => {
      dreamsDeferred["2"].resolve(dream({ id: 2, title: "夢B" }));
    });

    // その後、遅れて夢1の応答が届く（ネットワーク遅延で順序が逆転したケースを模倣）
    await act(async () => {
      dreamsDeferred["1"].resolve(dream({ id: 1, title: "夢A" }));
    });

    // 現在開いているのは夢2のはずなので、表示は「夢B」であってほしい
    await waitFor(() => expect(result.current.dream?.title).toBe("夢B"));
  });
});

// ---------------------------------------------------------------------------
// 古いGET/PUTの完了処理が、今表示している別の夢の画面を書き換えないことの検証。
// 各リクエストは手動で resolve / reject し、応答順を自由に入れ替える。
// ---------------------------------------------------------------------------

type Pending<T> = {
  url: string;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

let pendingGets: Pending<Dream>[] = [];
let pendingPuts: Pending<unknown>[] = [];
let pendingDeletes: Pending<unknown>[] = [];

function take<T>(queue: Pending<T>[], url: string): Pending<T> {
  const index = queue.findIndex((p) => p.url === url);
  if (index === -1) throw new Error(`pending request not found: ${url}`);
  return queue.splice(index, 1)[0];
}

const takeGet = (url: string) => take(pendingGets, url);
const takePut = (url: string) => take(pendingPuts, url);
const takeDelete = (url: string) => take(pendingDeletes, url);
const getCallCount = (url: string) =>
  mockedGet.mock.calls.filter((call: unknown[]) => call[0] === url).length;

function renderUseDream(initialId: string | undefined) {
  return renderHook(({ id }) => useDream(id), {
    initialProps: { id: initialId },
  });
}

describe("useDream: 古いGET/PUTの完了処理で別の夢の画面を書き換えない", () => {
  beforeEach(() => {
    pendingGets = [];
    pendingPuts = [];
    pendingDeletes = [];
    mockedGet.mockReset();
    mockedPut.mockReset();
    mockedDelete.mockReset();
    mockedDelete.mockImplementation(
      (url: string) =>
        new Promise<unknown>((resolve, reject) => {
          pendingDeletes.push({ url, resolve, reject });
        }) as any
    );
    mockUseAuth.mockReturnValue({ authStatus: "authenticated", isLoggedIn: true });
    mockedGet.mockImplementation(
      (url: string) =>
        new Promise<Dream>((resolve, reject) => {
          pendingGets.push({ url, resolve, reject });
        }) as any
    );
    mockedPut.mockImplementation(
      (url: string) =>
        new Promise<unknown>((resolve, reject) => {
          pendingPuts.push({ url, resolve, reject });
        }) as any
    );
  });

  async function renderLoaded(id: string, loaded: Dream) {
    const hook = renderUseDream(id);
    await act(async () => {
      takeGet(`/dreams/${id}`).resolve(loaded);
    });
    expect(hook.result.current.dream?.title).toBe(loaded.title);
    return hook;
  }

  describe("[High] 古いPUTの完了", () => {
    it("夢1の保存中に夢2へ移動し、その後に夢1のPUTが成功しても、夢1を再取得せず夢2の表示を上書きしない", async () => {
      const { result, rerender } = await renderLoaded("1", dream({ id: 1, title: "夢A" }));

      let updatePromise!: Promise<boolean>;
      act(() => {
        updatePromise = result.current.updateDream({ title: "夢A改" });
      });

      // 保存完了を待たずに夢2へ移動 → 夢2のGETが始まる
      rerender({ id: "2" });
      expect(getCallCount("/dreams/2")).toBe(1);

      // 遅れて夢1のPUTが成功する
      await act(async () => {
        takePut("/dreams/1").resolve({});
      });

      // 夢2の応答が届く
      await act(async () => {
        takeGet("/dreams/2").resolve(dream({ id: 2, title: "夢B" }));
      });

      // （不具合がある場合）古いPUTから発行された夢1の再取得がさらに遅れて届く
      const staleRefetch = pendingGets.find((p) => p.url === "/dreams/1");
      if (staleRefetch) {
        await act(async () => {
          staleRefetch.resolve(dream({ id: 1, title: "夢A改" }));
        });
      }

      expect(result.current.dream?.id).toBe(2);
      expect(result.current.dream?.title).toBe("夢B");
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.error).toBeNull();
      // 古いPUTの完了処理から夢1のGETを新たに発行してはいけない
      expect(getCallCount("/dreams/1")).toBe(1);
      // 別の画面へ移動済みなので、呼び出し元（編集モード解除など）には成功を伝えない
      await expect(updatePromise).resolves.toBe(false);
    });

    it("夢1の保存中に夢2へ移動し、その後に夢1のPUTが失敗しても、夢2の画面にエラーを出さない", async () => {
      const { result, rerender } = await renderLoaded("1", dream({ id: 1, title: "夢A" }));

      let updatePromise!: Promise<boolean>;
      act(() => {
        updatePromise = result.current.updateDream({ title: "夢A改" });
      });

      rerender({ id: "2" });
      await act(async () => {
        takeGet("/dreams/2").resolve(dream({ id: 2, title: "夢B" }));
      });

      await act(async () => {
        takePut("/dreams/1").reject(new Error("夢1の更新に失敗"));
      });

      expect(result.current.dream?.title).toBe("夢B");
      expect(result.current.error).toBeNull();
      expect(result.current.isUpdating).toBe(false);
      await expect(updatePromise).resolves.toBe(false);
    });

    it("夢1の保存中にアンマウントされたら、PUT完了後に夢1を再取得しない", async () => {
      const { result, unmount } = await renderLoaded("1", dream({ id: 1, title: "夢A" }));

      let updatePromise!: Promise<boolean>;
      act(() => {
        updatePromise = result.current.updateDream({ title: "夢A改" });
      });

      unmount();

      await act(async () => {
        takePut("/dreams/1").resolve({});
      });

      expect(getCallCount("/dreams/1")).toBe(1);
      await expect(updatePromise).resolves.toBe(false);
    });

    // 夢1→2→1と戻り、新しく保存を始めたあとで最初のPUTが完了するケース。
    // IDは再び一致するが表示世代は別なので、古いPUTは新しい画面に何も反映しない。
    async function startStaleAndFreshUpdates() {
      const hook = await renderLoaded("1", dream({ id: 1, title: "夢A" }));
      const { result, rerender } = hook;

      let staleUpdate!: Promise<boolean>;
      act(() => {
        staleUpdate = result.current.updateDream({ title: "最初の編集" });
      });

      rerender({ id: "2" });
      rerender({ id: "1" }); // 夢1に戻る（2回目の /dreams/1 GET）
      await act(async () => {
        takeGet("/dreams/2").resolve(dream({ id: 2, title: "夢B" }));
        takeGet("/dreams/1").resolve(dream({ id: 1, title: "夢A" }));
      });

      let freshUpdate!: Promise<boolean>;
      act(() => {
        freshUpdate = result.current.updateDream({ title: "新しい編集" });
      });
      expect(result.current.isUpdating).toBe(true);

      const [stalePut, freshPut] = pendingPuts;
      pendingPuts = [];
      return { ...hook, staleUpdate, freshUpdate, stalePut, freshPut };
    }

    it("[High1] 夢1→2→1で新しい保存中に最初のPUTが成功しても、再取得・保存中解除・成功通知をしない", async () => {
      const { result, staleUpdate, freshUpdate, stalePut, freshPut } =
        await startStaleAndFreshUpdates();
      const getCountBefore = getCallCount("/dreams/1");

      await act(async () => {
        stalePut.resolve({});
      });

      expect(getCallCount("/dreams/1")).toBe(getCountBefore);
      expect(result.current.isUpdating).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      await expect(staleUpdate).resolves.toBe(false);

      // 新しい保存は通常どおり完了し、最新を再取得する
      await act(async () => {
        freshPut.resolve({});
      });
      await act(async () => {
        takeGet("/dreams/1").resolve(dream({ id: 1, title: "新しい編集" }));
      });
      await expect(freshUpdate).resolves.toBe(true);
      expect(result.current.dream?.title).toBe("新しい編集");
      expect(result.current.isUpdating).toBe(false);
    });

    it("[High1] 夢1→2→1で新しい保存中に最初のPUTが失敗しても、新しい画面にエラーを出さず保存中も解除しない", async () => {
      const { result, staleUpdate, stalePut } = await startStaleAndFreshUpdates();
      const getCountBefore = getCallCount("/dreams/1");

      await act(async () => {
        stalePut.reject(new Error("最初の保存に失敗"));
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isUpdating).toBe(true);
      expect(getCallCount("/dreams/1")).toBe(getCountBefore);
      await expect(staleUpdate).resolves.toBe(false);
    });
  });

  describe("[正常系] 保存", () => {
    it("夢を保存したら、最新の夢を再取得して表示し true を返す", async () => {
      const { result } = await renderLoaded("1", dream({ id: 1, title: "夢A" }));

      let updatePromise!: Promise<boolean>;
      act(() => {
        updatePromise = result.current.updateDream({ title: "夢A改" });
      });
      expect(result.current.isUpdating).toBe(true);

      await act(async () => {
        takePut("/dreams/1").resolve({});
      });
      expect(getCallCount("/dreams/1")).toBe(2);

      await act(async () => {
        takeGet("/dreams/1").resolve(dream({ id: 1, title: "夢A改" }));
      });

      await expect(updatePromise).resolves.toBe(true);
      expect(result.current.dream?.title).toBe("夢A改");
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("保存に失敗したら、エラーを表示して false を返す", async () => {
      const { result } = await renderLoaded("1", dream({ id: 1, title: "夢A" }));

      let updatePromise!: Promise<boolean>;
      act(() => {
        updatePromise = result.current.updateDream({ title: "夢A改" });
      });
      await act(async () => {
        takePut("/dreams/1").reject(new Error("更新に失敗しました"));
      });

      await expect(updatePromise).resolves.toBe(false);
      expect(result.current.error).toBe("更新に失敗しました");
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.dream?.title).toBe("夢A");
    });
  });

  describe("[Medium] 古いGETの応答", () => {
    it("夢1→2→3と連続移動し、応答が3→1→2の順に届いても夢3を表示する", async () => {
      const { result, rerender } = renderUseDream("1");
      rerender({ id: "2" });
      rerender({ id: "3" });

      await act(async () => {
        takeGet("/dreams/3").resolve(dream({ id: 3, title: "夢C" }));
      });
      await act(async () => {
        takeGet("/dreams/1").resolve(dream({ id: 1, title: "夢A" }));
      });
      await act(async () => {
        takeGet("/dreams/2").resolve(dream({ id: 2, title: "夢B" }));
      });

      expect(result.current.dream?.title).toBe("夢C");
      expect(result.current.isLoading).toBe(false);
    });

    it("夢1→2→1と移動し、最初の夢1の応答が最後に届いても、新しい方の夢1を表示する", async () => {
      const { result, rerender } = renderUseDream("1");
      rerender({ id: "2" });
      rerender({ id: "1" });

      const [firstGet1, get2, secondGet1] = pendingGets;
      expect([firstGet1.url, get2.url, secondGet1.url]).toEqual([
        "/dreams/1",
        "/dreams/2",
        "/dreams/1",
      ]);

      await act(async () => {
        secondGet1.resolve(dream({ id: 1, title: "夢A(新)" }));
      });
      await act(async () => {
        get2.resolve(dream({ id: 2, title: "夢B" }));
        firstGet1.resolve(dream({ id: 1, title: "夢A(古)" }));
      });

      expect(result.current.dream?.title).toBe("夢A(新)");
      expect(result.current.isLoading).toBe(false);
    });

    it("古いGETが失敗しても、新しい夢の画面にエラーを出さず、読み込み中も解除しない", async () => {
      const { result, rerender } = renderUseDream("1");
      rerender({ id: "2" });

      await act(async () => {
        takeGet("/dreams/1").reject(new Error("夢1の取得に失敗"));
      });
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        takeGet("/dreams/2").resolve(dream({ id: 2, title: "夢B" }));
      });
      expect(result.current.dream?.title).toBe("夢B");
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it("IDが変わった直後は、新しい夢の取得が終わるまで前の夢を返さない（編集・削除の対象にさせない）", async () => {
      const { result, rerender } = await renderLoaded("1", dream({ id: 1, title: "夢A" }));

      rerender({ id: "2" });

      expect(result.current.dream).toBeNull();
      expect(result.current.isLoading).toBe(true);
    });

    it("APIが返した夢のIDがURLのIDと異なる場合は、その夢を表示しない", async () => {
      const { result } = renderUseDream("2");

      await act(async () => {
        takeGet("/dreams/2").resolve(dream({ id: 1, title: "夢A" }));
      });

      expect(result.current.dream).toBeNull();
      expect(result.current.error).not.toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("[Medium] URLのID", () => {
    it.each(["1abc", "1.5", "-1", "0"])(
      "不正なID %p では夢を取得しない",
      async (invalidId) => {
        const { result } = renderUseDream(invalidId);
        await act(async () => {});

        expect(mockedGet).not.toHaveBeenCalled();
        expect(result.current.dream).toBeNull();
        expect(result.current.isLoading).toBe(false);
      }
    );

    it("正しいIDから不正なIDへ移動したら、前の夢を表示し続けない", async () => {
      const { result, rerender } = await renderLoaded("1", dream({ id: 1, title: "夢A" }));

      rerender({ id: "1abc" });
      await act(async () => {});

      expect(getCallCount("/dreams/1")).toBe(1);
      expect(result.current.dream).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it("安全な整数の範囲を超えるIDでは、丸められた別の夢を取得しない", async () => {
      const { result } = renderUseDream("9007199254740993");
      await act(async () => {});

      expect(mockedGet).not.toHaveBeenCalled();
      expect(result.current.dream).toBeNull();
    });

    it("取得中にIDなしへ変わったら、読み込み中を解除する", async () => {
      const { result, rerender } = renderUseDream("1");
      expect(result.current.isLoading).toBe(true);

      rerender({ id: undefined });
      await act(async () => {
        takeGet("/dreams/1").resolve(dream({ id: 1, title: "夢A" }));
      });

      expect(result.current.dream).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it("取得済みの夢からIDなしへ変わったら、前の夢を返さず読み込み中にもならない", async () => {
      const { result, rerender } = await renderLoaded("1", dream({ id: 1, title: "夢A" }));

      rerender({ id: undefined });
      await act(async () => {});

      expect(result.current.dream).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it("IDなしでは夢を取得しない", async () => {
      const { result } = renderUseDream(undefined);
      await act(async () => {});

      expect(mockedGet).not.toHaveBeenCalled();
      expect(result.current.dream).toBeNull();
    });

    it("夢がないIDで保存しようとしたら、PUTせずにエラーを返す", async () => {
      const { result } = renderUseDream("1abc");

      let updatePromise!: Promise<boolean>;
      act(() => {
        updatePromise = result.current.updateDream({ title: "x" });
      });

      // "1abc" を夢1として PUT してはいけない
      expect(mockedPut).not.toHaveBeenCalled();
      await expect(updatePromise).resolves.toBe(false);
      expect(result.current.error).toBe("更新対象の夢のIDがありません。");
    });
  });

  describe("[Medium] 認証状態", () => {
    it("認証確認中は取得せず読み込み中のまま、認証後に取得する", async () => {
      mockUseAuth.mockReturnValue({ authStatus: "checking", isLoggedIn: false });
      const { result, rerender } = renderUseDream("1");

      expect(mockedGet).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(true);

      mockUseAuth.mockReturnValue({ authStatus: "authenticated", isLoggedIn: true });
      rerender({ id: "1" });
      await act(async () => {
        takeGet("/dreams/1").resolve(dream({ id: 1, title: "夢A" }));
      });

      expect(result.current.dream?.title).toBe("夢A");
      expect(result.current.isLoading).toBe(false);
    });

    it("取得中にログアウトしたら、遅れて届いた応答で夢を表示しない", async () => {
      const { result, rerender } = renderUseDream("1");

      mockUseAuth.mockReturnValue({ authStatus: "unauthenticated", isLoggedIn: false });
      rerender({ id: "1" });

      await act(async () => {
        takeGet("/dreams/1").resolve(dream({ id: 1, title: "夢A" }));
      });

      expect(result.current.dream).toBeNull();
      expect(result.current.error).toBe("ログインが必要です");
      expect(result.current.isLoading).toBe(false);
    });

    async function startUpdateThenChangeAuth(auth: { authStatus: string; isLoggedIn: boolean }) {
      const hook = await renderLoaded("1", dream({ id: 1, title: "夢A" }));
      let updatePromise!: Promise<boolean>;
      act(() => {
        updatePromise = hook.result.current.updateDream({ title: "夢A改" });
      });
      mockUseAuth.mockReturnValue(auth);
      hook.rerender({ id: "1" });
      return { ...hook, updatePromise };
    }

    it("保存中に認証確認中へ変わったら、PUT成功後に再取得せず読み込み中も解除しない", async () => {
      const { result, updatePromise } = await startUpdateThenChangeAuth({
        authStatus: "checking",
        isLoggedIn: false,
      });
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        takePut("/dreams/1").resolve({});
      });

      expect(getCallCount("/dreams/1")).toBe(1);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      await expect(updatePromise).resolves.toBe(false);
    });

    it("保存中にログアウトしたら、PUT成功後に再取得しない", async () => {
      const { result, updatePromise } = await startUpdateThenChangeAuth({
        authStatus: "unauthenticated",
        isLoggedIn: false,
      });

      await act(async () => {
        takePut("/dreams/1").resolve({});
      });

      expect(getCallCount("/dreams/1")).toBe(1);
      expect(result.current.dream).toBeNull();
      expect(result.current.isUpdating).toBe(false);
      await expect(updatePromise).resolves.toBe(false);
    });

    it("保存中にログアウトしたら、PUT失敗のエラーで「ログインが必要です」を上書きしない", async () => {
      const { result, updatePromise } = await startUpdateThenChangeAuth({
        authStatus: "unauthenticated",
        isLoggedIn: false,
      });

      await act(async () => {
        takePut("/dreams/1").reject(new Error("401 Unauthorized"));
      });

      expect(result.current.error).toBe("ログインが必要です");
      expect(result.current.isUpdating).toBe(false);
      await expect(updatePromise).resolves.toBe(false);
    });
  });

  describe("[High2] 削除", () => {
    it("表示中の夢を削除したら true を返す（回帰）", async () => {
      const { result } = await renderLoaded("1", dream({ id: 1, title: "夢A" }));

      let deletePromise!: Promise<boolean>;
      act(() => {
        deletePromise = result.current.deleteDream(1);
      });
      expect(mockedDelete).toHaveBeenCalledWith("/dreams/1");

      await act(async () => {
        takeDelete("/dreams/1").resolve({});
      });
      await expect(deletePromise).resolves.toBe(true);
    });

    it("夢2を表示中に、古い確認から夢1の削除を要求されても DELETE を送らない", async () => {
      const { result, rerender } = await renderLoaded("1", dream({ id: 1, title: "夢A" }));
      rerender({ id: "2" });
      await act(async () => {
        takeGet("/dreams/2").resolve(dream({ id: 2, title: "夢B" }));
      });

      let deletePromise!: Promise<boolean>;
      act(() => {
        deletePromise = result.current.deleteDream(1);
      });

      expect(mockedDelete).not.toHaveBeenCalled();
      await expect(deletePromise).resolves.toBe(false);
    });

    it("夢の取得前（表示中の夢データがない）なら DELETE を送らない", async () => {
      const { result } = renderUseDream("1");

      let deletePromise!: Promise<boolean>;
      act(() => {
        deletePromise = result.current.deleteDream(1);
      });

      expect(mockedDelete).not.toHaveBeenCalled();
      await expect(deletePromise).resolves.toBe(false);
    });

    it("夢1の削除中に夢2へ移動したら、DELETEが遅れて成功しても true を返さない（/homeへ遷移させない）", async () => {
      const { result, rerender } = await renderLoaded("1", dream({ id: 1, title: "夢A" }));

      let deletePromise!: Promise<boolean>;
      act(() => {
        deletePromise = result.current.deleteDream(1);
      });
      rerender({ id: "2" });

      await act(async () => {
        takeDelete("/dreams/1").resolve({});
      });

      await expect(deletePromise).resolves.toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("[修正2] 同じ表示世代で保存が重なる場合（保存中は2件目を送らない）", () => {
    async function startTwoUpdates() {
      const hook = await renderLoaded("1", dream({ id: 1, title: "夢A" }));
      let firstUpdate!: Promise<boolean>;
      let secondUpdate!: Promise<boolean>;
      act(() => {
        firstUpdate = hook.result.current.updateDream({ title: "1件目" });
      });
      act(() => {
        secondUpdate = hook.result.current.updateDream({ title: "2件目" });
      });
      return { ...hook, firstUpdate, secondUpdate };
    }

    it("保存中に2件目を始めても PUT は送らず false を返し、保存中・エラーを変えない（2件目が先に完了）", async () => {
      const { result, secondUpdate } = await startTwoUpdates();

      expect(mockedPut).toHaveBeenCalledTimes(1);
      await expect(secondUpdate).resolves.toBe(false);
      expect(result.current.isUpdating).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it("1件目のPUTが成功したら、1件目の結果だけで再取得・保存中解除・true返却を行う", async () => {
      const { result, firstUpdate, secondUpdate } = await startTwoUpdates();
      expect(mockedPut).toHaveBeenCalledTimes(1);
      await expect(secondUpdate).resolves.toBe(false);

      await act(async () => {
        takePut("/dreams/1").resolve({});
      });
      expect(getCallCount("/dreams/1")).toBe(2);
      await act(async () => {
        takeGet("/dreams/1").resolve(dream({ id: 1, title: "1件目" }));
      });

      await expect(firstUpdate).resolves.toBe(true);
      expect(result.current.dream?.title).toBe("1件目");
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockedPut).toHaveBeenCalledTimes(1);
    });

    it("1件目のPUTが失敗したら、1件目のエラーを表示して false を返す", async () => {
      const { result, firstUpdate } = await startTwoUpdates();
      expect(mockedPut).toHaveBeenCalledTimes(1);

      await act(async () => {
        takePut("/dreams/1").reject(new Error("1件目の保存に失敗"));
      });

      await expect(firstUpdate).resolves.toBe(false);
      expect(result.current.error).toBe("1件目の保存に失敗");
      expect(result.current.isUpdating).toBe(false);
      expect(mockedPut).toHaveBeenCalledTimes(1);
    });

    it("1件目の完了後は、次の保存を通常どおり送れる", async () => {
      const { result, firstUpdate } = await startTwoUpdates();
      await act(async () => {
        takePut("/dreams/1").resolve({});
      });
      await act(async () => {
        takeGet("/dreams/1").resolve(dream({ id: 1, title: "1件目" }));
      });
      await expect(firstUpdate).resolves.toBe(true);

      let nextUpdate!: Promise<boolean>;
      act(() => {
        nextUpdate = result.current.updateDream({ title: "3件目" });
      });
      expect(mockedPut).toHaveBeenCalledTimes(2);
      await act(async () => {
        takePut("/dreams/1").resolve({});
      });
      await act(async () => {
        takeGet("/dreams/1").resolve(dream({ id: 1, title: "3件目" }));
      });

      await expect(nextUpdate).resolves.toBe(true);
      expect(result.current.dream?.title).toBe("3件目");
      expect(result.current.isUpdating).toBe(false);
    });
  });

  describe("[修正3] IDなし・不正IDへ切り替えたときの古いエラー", () => {
    it("GET失敗のあとIDなしへ変わったら、エラーを消し読み込み中も解除する", async () => {
      const { result, rerender } = renderUseDream("1");
      await act(async () => {
        takeGet("/dreams/1").reject(new Error("夢1の取得に失敗"));
      });
      expect(result.current.error).toBe("夢1の取得に失敗");

      rerender({ id: undefined });
      await act(async () => {});

      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.dream).toBeNull();
    });

    it("GET失敗のあと不正IDへ変わったら、エラーを消す", async () => {
      const { result, rerender } = renderUseDream("1");
      await act(async () => {
        takeGet("/dreams/1").reject(new Error("夢1の取得に失敗"));
      });

      rerender({ id: "1abc" });
      await act(async () => {});

      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it("取得中にIDなしへ変わり、そのあと古いGETが失敗してもエラーを再設定しない", async () => {
      const { result, rerender } = renderUseDream("1");

      rerender({ id: undefined });
      await act(async () => {
        takeGet("/dreams/1").reject(new Error("夢1の取得に失敗"));
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });
});
