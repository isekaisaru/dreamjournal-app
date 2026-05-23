import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DreamShareCard from "@/app/components/DreamShareCard";
import * as htmlToImage from "html-to-image";

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

jest.mock("html-to-image", () => ({
  toPng: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const toast = require("react-hot-toast").default as {
  success: ReturnType<typeof jest.fn>;
  error: ReturnType<typeof jest.fn>;
};

const IMAGE_URL =
  "https://oaidalleapiprodscus.blob.core.windows.net/private/img-test.png";
const PROXY_URL = `/api/image-proxy?url=${encodeURIComponent(IMAGE_URL)}`;

const DEFAULT_PROPS = {
  imageUrl: IMAGE_URL,
  title: "星空を走る夢",
  recordedAt: "2025-01-15T00:00:00.000Z",
  emotionLabels: ["楽しい", "不思議"],
  imageAlt: "星空",
};

function setupFetchMock(ok = true) {
  const blob = new Blob(["fake"], { type: "image/png" });
  const mockFetch = jest.fn<typeof fetch>();
  mockFetch.mockResolvedValue({ ok, blob: async () => blob } as unknown as Response);
  global.fetch = mockFetch as unknown as typeof fetch;
  return { mockFetch, blob };
}

describe("DreamShareCard", () => {
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;
  // Capture the real createElement before any spy can intercept it
  const realCreateElement = document.createElement.bind(document);
  // mockDecode は各テストで参照できるよう describe スコープで宣言
  let mockDecode: ReturnType<typeof jest.fn>;
  let writeTextMock: ReturnType<typeof jest.fn>;

  beforeEach(() => {
    jest.clearAllMocks();
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = jest.fn(() => "blob:fake-object-url");
    URL.revokeObjectURL = jest.fn();
    // jsdom は HTMLImageElement.prototype.decode を実装していないため、
    // waitForImageReady が onload 待ちに入ってテストがハングしないよう
    // プロトタイプレベルで即時 resolve するモックを注入する
    mockDecode = jest.fn().mockImplementation(() => Promise.resolve());
    Object.defineProperty(HTMLImageElement.prototype, "decode", {
      value: mockDecode,
      writable: true,
      configurable: true,
    });
    writeTextMock = jest.fn().mockImplementation(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    // プロトタイプに追加した decode モックを毎テスト後に削除する
    delete (HTMLImageElement.prototype as unknown as Record<string, unknown>).decode;
  });

  describe("レンダリング", () => {
    it("シェアカードが表示される", () => {
      render(<DreamShareCard {...DEFAULT_PROPS} />);
      expect(screen.getByTestId("dream-share-card")).toBeTruthy();
    });

    it("タイトルと感情タグが表示される", () => {
      render(<DreamShareCard {...DEFAULT_PROPS} />);
      expect(screen.getByText("星空を走る夢")).toBeTruthy();
    });

    it("「画像として保存」ボタンが表示される", () => {
      render(<DreamShareCard {...DEFAULT_PROPS} />);
      expect(screen.getByTestId("save-image-button")).toBeTruthy();
      expect(screen.getByText("画像として保存")).toBeTruthy();
    });

    it("「リンクをコピー」ボタンが表示される", () => {
      render(<DreamShareCard {...DEFAULT_PROPS} />);
      expect(screen.getByTestId("copy-link-button")).toBeTruthy();
      expect(screen.getByText("リンクをコピー")).toBeTruthy();
    });

    it("操作ボタンはシェアカードのDOM外にある", () => {
      render(<DreamShareCard {...DEFAULT_PROPS} />);
      const card = screen.getByTestId("dream-share-card");
      expect(card.contains(screen.getByTestId("save-image-button"))).toBe(false);
      expect(card.contains(screen.getByTestId("copy-link-button"))).toBe(false);
    });

    it("夢本文はカードDOMに含まれない（propsとして受け取らない）", () => {
      render(<DreamShareCard {...DEFAULT_PROPS} />);
      const card = screen.getByTestId("dream-share-card");
      expect(card).toBeTruthy();
    });
  });

  describe("リンクコピー", () => {
    it("リンクコピーボタンをクリックすると現在のURLをクリップボードにコピーする", async () => {
      render(<DreamShareCard {...DEFAULT_PROPS} />);
      fireEvent.click(screen.getByTestId("copy-link-button"));

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith(window.location.href);
      });
    });

    it("コピー対象URLに夢本文は含まれない", async () => {
      render(<DreamShareCard {...DEFAULT_PROPS} />);
      fireEvent.click(screen.getByTestId("copy-link-button"));

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalled();
      });
      expect(writeTextMock.mock.calls[0][0]).not.toContain(
        "これは共有カードに出してはいけない夢本文です"
      );
    });

    it("コピー成功時に成功トーストを表示する", async () => {
      render(<DreamShareCard {...DEFAULT_PROPS} />);
      fireEvent.click(screen.getByTestId("copy-link-button"));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("リンクをコピーしました");
      });
    });

    it("コピー失敗時にエラートーストを表示する", async () => {
      writeTextMock.mockRejectedValue(new Error("clipboard error"));

      render(<DreamShareCard {...DEFAULT_PROPS} />);
      fireEvent.click(screen.getByTestId("copy-link-button"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "リンクのコピーに失敗しました"
        );
      });
    });
  });

  describe("PNG保存（PC/Android: <a download>）", () => {
    function setupAnchorSpy() {
      const mockAnchor = { href: "", download: "", click: jest.fn() };
      jest
        .spyOn(document, "createElement")
        .mockImplementation((tag: string) => {
          if (tag === "a") return mockAnchor as unknown as HTMLElement;
          return realCreateElement(tag as keyof HTMLElementTagNameMap) as HTMLElement;
        });
      return { mockAnchor };
    }

    it("保存ボタンをクリックすると proxy URL で fetch を呼ぶ", async () => {
      const { mockFetch } = setupFetchMock();
      jest.mocked(htmlToImage.toPng).mockResolvedValue("data:image/png;base64,abc");
      setupAnchorSpy();

      render(<DreamShareCard {...DEFAULT_PROPS} />);
      fireEvent.click(screen.getByTestId("save-image-button"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(PROXY_URL);
      });
    });

    it("toPng が呼ばれる", async () => {
      setupFetchMock();
      jest.mocked(htmlToImage.toPng).mockResolvedValue("data:image/png;base64,abc");
      setupAnchorSpy();

      render(<DreamShareCard {...DEFAULT_PROPS} />);
      fireEvent.click(screen.getByTestId("save-image-button"));

      await waitFor(() => {
        expect(htmlToImage.toPng).toHaveBeenCalled();
      });
    });

    it("アンカーの download ファイル名が yumetree-dream-card-YYYY-MM-DD.png 形式になる", async () => {
      setupFetchMock();
      jest.mocked(htmlToImage.toPng).mockResolvedValue("data:image/png;base64,abc");
      const { mockAnchor } = setupAnchorSpy();

      render(<DreamShareCard {...DEFAULT_PROPS} />);
      fireEvent.click(screen.getByTestId("save-image-button"));

      await waitFor(() => {
        expect(mockAnchor.click).toHaveBeenCalled();
      });
      expect(mockAnchor.download).toMatch(
        /^yumetree-dream-card-\d{4}-\d{2}-\d{2}\.png$/
      );
    });

    it("成功時に成功トーストを表示する", async () => {
      setupFetchMock();
      jest.mocked(htmlToImage.toPng).mockResolvedValue("data:image/png;base64,abc");
      setupAnchorSpy();

      render(<DreamShareCard {...DEFAULT_PROPS} />);
      fireEvent.click(screen.getByTestId("save-image-button"));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("画像を保存しました");
      });
    });
  });

  describe("エラーハンドリング", () => {
    it("proxy fetch が失敗したらエラートーストを表示する", async () => {
      setupFetchMock(false);
      jest.mocked(htmlToImage.toPng).mockResolvedValue("data:image/png;base64,abc");

      render(<DreamShareCard {...DEFAULT_PROPS} />);
      fireEvent.click(screen.getByTestId("save-image-button"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("画像の保存に失敗しました");
      });
    });

    it("toPng が例外を投げたらエラートーストを表示する", async () => {
      setupFetchMock();
      jest.mocked(htmlToImage.toPng).mockRejectedValue(new Error("canvas error"));

      render(<DreamShareCard {...DEFAULT_PROPS} />);
      fireEvent.click(screen.getByTestId("save-image-button"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("画像の保存に失敗しました");
      });
    });

    it("保存中は二重クリックしても2回目は無視される", async () => {
      setupFetchMock();
      jest.mocked(htmlToImage.toPng).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve("data:image/png;base64,abc"), 200)
          )
      );
      const mockAnchor = { href: "", download: "", click: jest.fn() };
      jest
        .spyOn(document, "createElement")
        .mockImplementation((tag: string) => {
          if (tag === "a") return mockAnchor as unknown as HTMLElement;
          return realCreateElement(tag as keyof HTMLElementTagNameMap) as HTMLElement;
        });

      render(<DreamShareCard {...DEFAULT_PROPS} />);
      fireEvent.click(screen.getByTestId("save-image-button"));
      fireEvent.click(screen.getByTestId("save-image-button"));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("iOS Web Share API", () => {
    function setupNavigatorShare(rejectWith?: unknown) {
      const mockShare = rejectWith
        ? jest.fn().mockImplementation(() => Promise.reject(rejectWith))
        : jest.fn().mockImplementation(() => Promise.resolve());
      const mockCanShare = jest.fn().mockReturnValue(true);
      Object.defineProperty(navigator, "share", {
        value: mockShare,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(navigator, "canShare", {
        value: mockCanShare,
        writable: true,
        configurable: true,
      });
      return { mockShare, mockCanShare };
    }

    afterEach(() => {
      // navigator への追加プロパティを削除
      try {
        Object.defineProperty(navigator, "share", {
          value: undefined,
          writable: true,
          configurable: true,
        });
        Object.defineProperty(navigator, "canShare", {
          value: undefined,
          writable: true,
          configurable: true,
        });
      } catch {
        // 環境によっては削除できない場合があるため無視
      }
    });

    it("ユーザーが共有シートをキャンセルしても <a download> は呼ばれない", async () => {
      setupFetchMock();
      jest.mocked(htmlToImage.toPng).mockResolvedValue("data:image/png;base64,abc");

      const abortError = new DOMException("", "AbortError");
      setupNavigatorShare(abortError);

      const mockAnchor = { href: "", download: "", click: jest.fn() };
      jest
        .spyOn(document, "createElement")
        .mockImplementation((tag: string) => {
          if (tag === "a") return mockAnchor as unknown as HTMLElement;
          return realCreateElement(tag as keyof HTMLElementTagNameMap) as HTMLElement;
        });

      render(<DreamShareCard {...DEFAULT_PROPS} />);
      fireEvent.click(screen.getByTestId("save-image-button"));

      // isSaving が false に戻るまで待つ（保存処理完了の代理条件）
      await waitFor(() => {
        expect(screen.getByText("画像として保存")).toBeTruthy();
      });

      expect(mockAnchor.click).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  describe("img.decode によるロード待機", () => {
    it("img.decode が保存時に呼ばれる", async () => {
      setupFetchMock();
      jest.mocked(htmlToImage.toPng).mockResolvedValue("data:image/png;base64,abc");

      render(<DreamShareCard {...DEFAULT_PROPS} />);
      fireEvent.click(screen.getByTestId("save-image-button"));

      await waitFor(() => {
        expect(mockDecode).toHaveBeenCalled();
      });
    });

    it("decode完了後に toPng が呼ばれる（呼び出し順序）", async () => {
      const callOrder: string[] = [];
      mockDecode.mockImplementation(async () => {
        callOrder.push("decode");
      });
      jest.mocked(htmlToImage.toPng).mockImplementation(async () => {
        callOrder.push("toPng");
        return "data:image/png;base64,abc";
      });
      setupFetchMock();

      render(<DreamShareCard {...DEFAULT_PROPS} />);
      fireEvent.click(screen.getByTestId("save-image-button"));

      await waitFor(() => {
        expect(callOrder).toEqual(["decode", "toPng"]);
      });
    });

    it("decode が失敗したらエラートーストになり toPng は呼ばれない", async () => {
      setupFetchMock();
      jest.mocked(htmlToImage.toPng).mockResolvedValue("data:image/png;base64,abc");

      render(<DreamShareCard {...DEFAULT_PROPS} />);

      // インスタンスレベルで reject する decode を上書き（プロトタイプより優先される）
      const imgEl = screen.getByRole("img") as HTMLImageElement;
      imgEl.decode = jest
        .fn()
        .mockImplementation(() =>
          Promise.reject(new Error("decode failed"))
        ) as unknown as () => Promise<void>;

      fireEvent.click(screen.getByTestId("save-image-button"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("画像の保存に失敗しました");
      });
      expect(htmlToImage.toPng).not.toHaveBeenCalled();
    });
  });
});
