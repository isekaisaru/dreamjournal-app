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

  beforeEach(() => {
    jest.clearAllMocks();
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = jest.fn(() => "blob:fake-object-url");
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
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

    it("保存ボタンはシェアカードのDOM外にある", () => {
      render(<DreamShareCard {...DEFAULT_PROPS} />);
      const card = screen.getByTestId("dream-share-card");
      expect(card.contains(screen.getByTestId("save-image-button"))).toBe(false);
    });

    it("夢本文はカードDOMに含まれない（propsとして受け取らない）", () => {
      render(<DreamShareCard {...DEFAULT_PROPS} />);
      const card = screen.getByTestId("dream-share-card");
      expect(card).toBeTruthy();
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
});
