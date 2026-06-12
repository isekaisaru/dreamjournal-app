import React from "react";
import { render, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import apiClient, { ApiError } from "@/lib/apiClient";
import { usePathname, useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

/**
 * apiClient をまるごとモックし、ApiError クラスを同一インスタンスとして提供する。
 * AuthContext.tsx の `err instanceof ApiError` チェックがテスト内と同じクラスを参照できる。
 */
jest.mock("@/lib/apiClient", () => {
  class ApiError extends Error {
    status: number = 0;
    data?: unknown;
    constructor(message: string) {
      super(message);
      this.name = "ApiError";
      Object.setPrototypeOf(this, ApiError.prototype);
    }
  }
  return {
    __esModule: true,
    ApiError,
    default: {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
      put: jest.fn(),
    },
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AUTH_HINT_KEY = "dreamjournal_auth_hint";
const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockedPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockedDelete = apiClient.delete as jest.MockedFunction<
  typeof apiClient.delete
>;
const mockedUsePathname = usePathname as jest.MockedFunction<
  typeof usePathname
>;
const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

function makeApiError(status: number): ApiError {
  const err = new ApiError(`Error ${status}`);
  err.status = status;
  return err;
}

function makeNetworkError(): Error {
  return new Error("Failed to fetch");
}

/** context 値をキャプチャするだけのヘルパーコンポーネント */
type CapturedContext = {
  authStatus: string;
  user: unknown;
  userId: string | null;
  error: string | null;
  logout: () => Promise<void>;
  deleteUser: () => Promise<void>;
};
const captured: CapturedContext = {
  authStatus: "",
  user: undefined,
  userId: null,
  error: null,
  logout: async () => {},
  deleteUser: async () => {},
};

function ContextReader() {
  const ctx = useAuth();
  captured.authStatus = ctx.authStatus;
  captured.user = ctx.user;
  captured.userId = ctx.userId;
  captured.error = ctx.error;
  captured.logout = ctx.logout;
  captured.deleteUser = ctx.deleteUser;
  return null;
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <ContextReader />
    </AuthProvider>
  );
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockedUsePathname.mockReturnValue("/home"); // 保護パス
  mockedUseRouter.mockReturnValue({ push: jest.fn() } as never);
});

// ---------------------------------------------------------------------------
// 1. 非一時障害エラー → 恒久的障害としてログアウト扱い
//    対象: 401 / 403 / 404 / 500 （TRANSIENT_STATUSES 外のすべて）
// ---------------------------------------------------------------------------

describe("401 Unauthorized", () => {
  it("authStatus が unauthenticated になる", async () => {
    localStorage.setItem(AUTH_HINT_KEY, "1");
    mockedGet.mockRejectedValue(makeApiError(401));

    renderWithProvider();

    await waitFor(() => {
      expect(captured.authStatus).toBe("unauthenticated");
    });
  });

  it("authHint が消える", async () => {
    localStorage.setItem(AUTH_HINT_KEY, "1");
    mockedGet.mockRejectedValue(makeApiError(401));

    renderWithProvider();

    await waitFor(() => {
      expect(captured.authStatus).toBe("unauthenticated");
    });
    expect(localStorage.getItem(AUTH_HINT_KEY)).toBeNull();
  });

  it("user と userId が null になる", async () => {
    localStorage.setItem(AUTH_HINT_KEY, "1");
    mockedGet.mockRejectedValue(makeApiError(401));

    renderWithProvider();

    await waitFor(() => {
      expect(captured.authStatus).toBe("unauthenticated");
    });
    expect(captured.user).toBeNull();
    expect(captured.userId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 1b. 403 / 404 / 500 → 恒久的エラーとしてログアウト扱い（リトライしない）
// ---------------------------------------------------------------------------

describe("403 / 404 / 500 (恒久的エラー)", () => {
  it.each([403, 404, 500])(
    "%i の場合は authStatus が unauthenticated になる",
    async (status) => {
      localStorage.setItem(AUTH_HINT_KEY, "1");
      mockedGet.mockRejectedValue(makeApiError(status));

      renderWithProvider();

      await waitFor(() => {
        expect(captured.authStatus).toBe("unauthenticated");
      });
    }
  );

  it.each([403, 404, 500])("%i の場合は authHint が消える", async (status) => {
    localStorage.setItem(AUTH_HINT_KEY, "1");
    mockedGet.mockRejectedValue(makeApiError(status));

    renderWithProvider();

    await waitFor(() => {
      expect(captured.authStatus).toBe("unauthenticated");
    });
    expect(localStorage.getItem(AUTH_HINT_KEY)).toBeNull();
  });

  it("500 の場合はリトライしない（get が1回だけ呼ばれる）", async () => {
    jest.useFakeTimers();
    localStorage.setItem(AUTH_HINT_KEY, "1");
    mockedGet.mockRejectedValue(makeApiError(500));

    renderWithProvider();
    await act(async () => {});

    expect(mockedGet).toHaveBeenCalledTimes(1);

    // タイマーを進めても再呼び出しされない
    await act(async () => {
      jest.advanceTimersByTime(7000);
    });
    await act(async () => {});
    expect(mockedGet).toHaveBeenCalledTimes(1);

    act(() => {
      jest.runAllTimers();
    });
    jest.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// 2. 502 / 503 / 504 / network error → 一時障害扱い
// ---------------------------------------------------------------------------

describe("一時障害 (502/503/504/network error)", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    // 残っているタイマーをすべて消化してから実タイマーに戻す
    act(() => {
      jest.runAllTimers();
    });
    jest.useRealTimers();
  });

  async function assertTransientError(error: Error) {
    localStorage.setItem(AUTH_HINT_KEY, "1");
    mockedGet.mockRejectedValue(error);

    renderWithProvider();

    // 初回 verifyToken の非同期完了を待つ
    await act(async () => {});

    expect(captured.authStatus).not.toBe("unauthenticated");
    expect(localStorage.getItem(AUTH_HINT_KEY)).toBe("1");
    expect(captured.error).toBe(
      "サーバーを起動しています。しばらくお待ちください。"
    );
  }

  it("502: authStatus が unauthenticated にならない", async () => {
    await assertTransientError(makeApiError(502));
  });

  it("503: authStatus が unauthenticated にならない", async () => {
    await assertTransientError(makeApiError(503));
  });

  it("504: authStatus が unauthenticated にならない", async () => {
    await assertTransientError(makeApiError(504));
  });

  it("network error: authStatus が unauthenticated にならない", async () => {
    await assertTransientError(makeNetworkError());
  });

  it("502: authHint が消えない", async () => {
    localStorage.setItem(AUTH_HINT_KEY, "1");
    mockedGet.mockRejectedValue(makeApiError(502));

    renderWithProvider();
    await act(async () => {});

    expect(localStorage.getItem(AUTH_HINT_KEY)).toBe("1");
  });

  it("502: user / userId が即 null にならない（初回時はそもそも null のまま）", async () => {
    // ログイン済みユーザーが一時障害に遭った場合、user は null のまま（今回は初回検証なのでnull）
    // 重要なのは authHint と authStatus が維持されること
    localStorage.setItem(AUTH_HINT_KEY, "1");
    mockedGet.mockRejectedValue(makeApiError(502));

    renderWithProvider();
    await act(async () => {});

    // authStatus が checking のまま（unauthenticated に変わっていない）
    expect(captured.authStatus).toBe("checking");
  });

  it("6秒後にリトライが発火する（2回目の get が呼ばれる）", async () => {
    localStorage.setItem(AUTH_HINT_KEY, "1");
    mockedGet.mockRejectedValue(makeApiError(502));

    renderWithProvider();
    // 1回目の失敗を消化
    await act(async () => {});
    expect(mockedGet).toHaveBeenCalledTimes(1);

    // 6秒進める → retry タイマー発火
    await act(async () => {
      jest.advanceTimersByTime(6100);
    });
    // 2回目のリトライ非同期を消化
    await act(async () => {});

    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it("リトライが最大3回で止まる（4回以上 get が呼ばれない）", async () => {
    localStorage.setItem(AUTH_HINT_KEY, "1");
    mockedGet.mockRejectedValue(makeApiError(502));

    renderWithProvider();

    // 1回目
    await act(async () => {});
    // 2回目
    await act(async () => {
      jest.advanceTimersByTime(6100);
    });
    await act(async () => {});
    // 3回目
    await act(async () => {
      jest.advanceTimersByTime(6100);
    });
    await act(async () => {});
    // 4回目（上限超え → タイマーは設定されない）
    await act(async () => {
      jest.advanceTimersByTime(6100);
    });
    await act(async () => {});

    // 初回 + リトライ3回 = 4回まで
    expect(mockedGet).toHaveBeenCalledTimes(4);
    // 5回目以上のタイマーは存在しないので、さらに進めても get は増えない
    await act(async () => {
      jest.advanceTimersByTime(6100);
    });
    await act(async () => {});
    expect(mockedGet).toHaveBeenCalledTimes(4);
  });
});

// ---------------------------------------------------------------------------
// 3. リトライ上限到達後の挙動
// ---------------------------------------------------------------------------

describe("リトライ上限 (3回) 到達後", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    act(() => {
      jest.runAllTimers();
    });
    jest.useRealTimers();
  });

  async function exhaustRetries() {
    localStorage.setItem(AUTH_HINT_KEY, "1");
    mockedGet.mockRejectedValue(makeApiError(502));
    renderWithProvider();

    // 初回 + 3回リトライ = 4回分の失敗を消化
    await act(async () => {});
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        jest.advanceTimersByTime(6100);
      });
      await act(async () => {});
    }
  }

  it("authHint は消さない", async () => {
    await exhaustRetries();
    expect(localStorage.getItem(AUTH_HINT_KEY)).toBe("1");
  });

  it("unauthenticated に強制しない", async () => {
    await exhaustRetries();
    expect(captured.authStatus).not.toBe("unauthenticated");
  });

  it("再読み込みを促すエラーメッセージが入る", async () => {
    await exhaustRetries();
    expect(captured.error).toBe(
      "サーバーへの接続に失敗しました。ページを再読み込みしてください。"
    );
  });
});

// ---------------------------------------------------------------------------
// 4. 明示的な logout() → 従来通り authHint を消す
// ---------------------------------------------------------------------------

describe("logout()", () => {
  it("authHint を消す", async () => {
    localStorage.setItem(AUTH_HINT_KEY, "1");
    mockedGet.mockResolvedValue({ user: { id: 1, email: "a@b.com" } } as never);
    mockedPost.mockResolvedValue(null as never);

    renderWithProvider();

    await waitFor(() => {
      expect(captured.authStatus).toBe("authenticated");
    });

    await act(async () => {
      await captured.logout();
    });

    expect(localStorage.getItem(AUTH_HINT_KEY)).toBeNull();
  });

  it("authStatus が unauthenticated になる", async () => {
    localStorage.setItem(AUTH_HINT_KEY, "1");
    mockedGet.mockResolvedValue({ user: { id: 1, email: "a@b.com" } } as never);
    mockedPost.mockResolvedValue(null as never);

    renderWithProvider();

    await waitFor(() => {
      expect(captured.authStatus).toBe("authenticated");
    });

    await act(async () => {
      await captured.logout();
    });

    expect(captured.authStatus).toBe("unauthenticated");
  });

  it("user と userId が null になる", async () => {
    localStorage.setItem(AUTH_HINT_KEY, "1");
    mockedGet.mockResolvedValue({ user: { id: 1, email: "a@b.com" } } as never);
    mockedPost.mockResolvedValue(null as never);

    renderWithProvider();

    await waitFor(() => {
      expect(captured.authStatus).toBe("authenticated");
    });

    await act(async () => {
      await captured.logout();
    });

    expect(captured.user).toBeNull();
    expect(captured.userId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. deleteUser() — アカウント削除
// ---------------------------------------------------------------------------

describe("deleteUser()", () => {
  async function renderAuthenticated() {
    localStorage.setItem(AUTH_HINT_KEY, "1");
    mockedGet.mockResolvedValue({ user: { id: 1, email: "a@b.com" } } as never);

    renderWithProvider();

    await waitFor(() => {
      expect(captured.authStatus).toBe("authenticated");
    });
  }

  it("API削除が失敗したら例外を再throwする", async () => {
    await renderAuthenticated();
    mockedDelete.mockRejectedValue(makeApiError(500));

    await act(async () => {
      await expect(captured.deleteUser()).rejects.toThrow();
    });
  });

  it("API削除が失敗したら認証状態を維持し logout API を呼ばない", async () => {
    await renderAuthenticated();
    mockedDelete.mockRejectedValue(makeApiError(500));

    await act(async () => {
      await captured.deleteUser().catch(() => {});
    });

    expect(captured.authStatus).toBe("authenticated");
    expect(localStorage.getItem(AUTH_HINT_KEY)).toBe("1");
    expect(mockedPost).not.toHaveBeenCalledWith("/auth/logout");
  });

  it("削除成功時は logout API を呼ばずローカル認証状態をクリアする", async () => {
    await renderAuthenticated();
    mockedDelete.mockResolvedValue(null as never);

    await act(async () => {
      await captured.deleteUser();
    });

    // バックエンドの destroy が Cookie を破棄済みのため /auth/logout は呼ばない
    expect(mockedPost).not.toHaveBeenCalledWith("/auth/logout");
    expect(captured.authStatus).toBe("unauthenticated");
    expect(captured.user).toBeNull();
    expect(captured.userId).toBeNull();
    expect(localStorage.getItem(AUTH_HINT_KEY)).toBeNull();
  });

  it("userId が無い場合は例外を投げ、削除APIを呼ばない", async () => {
    mockedGet.mockRejectedValue(makeApiError(401));

    renderWithProvider();

    await waitFor(() => {
      expect(captured.authStatus).toBe("unauthenticated");
    });

    await act(async () => {
      await expect(captured.deleteUser()).rejects.toThrow();
    });
    expect(mockedDelete).not.toHaveBeenCalled();
  });
});
