import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import DreamRoomPage from "@/app/room/[profileId]/page";
import type { Dream, DreamProfile } from "@/app/types";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    alt,
    fill: _fill,
    unoptimized: _unoptimized,
    sizes: _sizes,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    unoptimized?: boolean;
    sizes?: string;
  }) => <img alt={alt} {...props} />,
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRouter = { push: mockPush, replace: mockReplace };
jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useParams: () => ({ profileId: "1" }),
}));

const mockUseAuth = jest.fn<() => { authStatus: string }>();
jest.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/app/loading", () => ({
  __esModule: true,
  default: () => <div>Loading</div>,
}));

const mockGetDreamProfiles = jest.fn<() => Promise<DreamProfile[]>>();
const mockGetDreamsForProfile = jest.fn<(profileId: number) => Promise<Dream[]>>();
const mockApiGet = jest.fn<
  (url: string, options?: { signal?: AbortSignal }) => Promise<Dream>
>();
jest.mock("@/lib/apiClient", () => ({
  __esModule: true,
  default: {
    get: (url: string, options?: { signal?: AbortSignal }) =>
      mockApiGet(url, options),
  },
  getDreamProfiles: () => mockGetDreamProfiles(),
  getDreamsForProfile: (profileId: number) => mockGetDreamsForProfile(profileId),
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

function detailFor(dream: Dream): Dream {
  return { ...dream, generated_image_url: `https://img.example/${dream.id}.png` };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ authStatus: "authenticated" });
  mockGetDreamProfiles.mockResolvedValue([makeProfile()]);
});

it("image_generated_at降順・同時刻はid降順で最大6枚を並べる", async () => {
  const dreams = [
    makeDream(1, { image_generated_at: "2026-07-01T00:00:00Z" }),
    makeDream(2, { image_generated_at: "2026-07-05T00:00:00Z" }),
    makeDream(3, { image_generated_at: "2026-07-05T00:00:00Z" }),
    makeDream(4, { image_generated_at: "2026-07-03T00:00:00Z" }),
    makeDream(5, { image_generated_at: "2026-07-02T00:00:00Z" }),
    makeDream(6, { image_generated_at: "2026-07-04T00:00:00Z" }),
    makeDream(7, { image_generated_at: "2026-07-06T00:00:00Z" }),
  ];
  mockGetDreamsForProfile.mockResolvedValue(dreams);
  mockApiGet.mockImplementation((url: string) => {
    const dream = dreams.find((item) => url === `/dreams/${item.id}`)!;
    return Promise.resolve(detailFor(dream));
  });

  render(<DreamRoomPage />);

  await screen.findByAltText("夢5");
  expect(screen.getAllByTestId(/room-frame-/).map((node) => node.dataset.testid)).toEqual([
    "room-frame-7",
    "room-frame-3",
    "room-frame-2",
    "room-frame-6",
    "room-frame-4",
    "room-frame-5",
  ]);
  expect(screen.queryByTestId("room-frame-1")).not.toBeInTheDocument();
});

it("画像詳細を1枚ずつ直列取得する", async () => {
  const dreams = [
    makeDream(2, { image_generated_at: "2026-07-02T00:00:00Z" }),
    makeDream(1, { image_generated_at: "2026-07-01T00:00:00Z" }),
  ];
  mockGetDreamsForProfile.mockResolvedValue(dreams);
  let resolveFirst!: (dream: Dream) => void;
  mockApiGet
    .mockImplementationOnce(() => new Promise<Dream>((resolve) => { resolveFirst = resolve; }))
    .mockResolvedValueOnce(detailFor(dreams[1]));

  render(<DreamRoomPage />);

  await waitFor(() => expect(mockApiGet).toHaveBeenCalledTimes(1));
  expect(mockApiGet).toHaveBeenNthCalledWith(1, "/dreams/2", expect.any(Object));

  await act(async () => resolveFirst(detailFor(dreams[0])));
  await waitFor(() => expect(mockApiGet).toHaveBeenCalledTimes(2));
  expect(mockApiGet).toHaveBeenNthCalledWith(2, "/dreams/1", expect.any(Object));
});

it("1枚の失敗後も次を取得し、失敗額縁だけ再試行できる", async () => {
  const dreams = [
    makeDream(2, { image_generated_at: "2026-07-02T00:00:00Z" }),
    makeDream(1, { image_generated_at: "2026-07-01T00:00:00Z" }),
  ];
  mockGetDreamsForProfile.mockResolvedValue(dreams);
  mockApiGet
    .mockRejectedValueOnce(new Error("network error"))
    .mockResolvedValueOnce(detailFor(dreams[1]))
    .mockResolvedValueOnce(detailFor(dreams[0]));

  render(<DreamRoomPage />);

  const failedFrame = await screen.findByTestId("room-frame-2");
  const retry = await within(failedFrame).findByRole("button", { name: "もういちど" });
  expect(await screen.findByAltText("夢1")).toBeInTheDocument();

  fireEvent.click(retry);
  expect(await screen.findByAltText("夢2")).toBeInTheDocument();
  expect(mockApiGet).toHaveBeenCalledTimes(3);
});

it("ページ離脱時に進行中の画像取得signalを中断する", async () => {
  const dream = makeDream(1, { image_generated_at: "2026-07-01T00:00:00Z" });
  mockGetDreamsForProfile.mockResolvedValue([dream]);
  mockApiGet.mockImplementation(() => new Promise(() => {}));

  const { unmount } = render(<DreamRoomPage />);
  await waitFor(() => expect(mockApiGet).toHaveBeenCalled());
  const signal = mockApiGet.mock.calls[0][1]?.signal as AbortSignal;

  unmount();
  expect(signal.aborted).toBe(true);
});

it("夢が0件なら夢の記録へのCTAを表示する", async () => {
  mockGetDreamsForProfile.mockResolvedValue([]);
  render(<DreamRoomPage />);

  expect(await screen.findByRole("link", { name: "ゆめを きろくする" })).toHaveAttribute(
    "href",
    "/dream/new"
  );
});

it("夢はあるが画像0件なら最新夢の画像生成へのCTAを表示する", async () => {
  mockGetDreamsForProfile.mockResolvedValue([makeDream(2), makeDream(1)]);
  render(<DreamRoomPage />);

  expect(await screen.findByRole("link", { name: "ゆめのえを つくる" })).toHaveAttribute(
    "href",
    "/dream/2"
  );
});

it("長いプロフィール名をtruncateし、画像altとキーボード操作を提供する", async () => {
  const profile = makeProfile({ name: "とてもながいなまえのぷろふぃーるだよ" });
  const dream = makeDream(1, {
    title: "星空の夢",
    image_generated_at: "2026-07-01T00:00:00Z",
  });
  mockGetDreamProfiles.mockResolvedValue([profile]);
  mockGetDreamsForProfile.mockResolvedValue([dream]);
  mockApiGet.mockResolvedValue(detailFor(dream));

  render(<DreamRoomPage />);

  expect((await screen.findByRole("heading", { level: 1 })).className).toContain("truncate");
  expect(await screen.findByAltText("星空の夢")).toBeInTheDocument();
  const frameButton = screen.getByRole("button", { name: "星空の夢をひらく" });
  frameButton.focus();
  fireEvent.keyDown(frameButton, { key: "Enter", code: "Enter" });
  fireEvent.click(frameButton);
  expect(mockPush).toHaveBeenCalledWith("/dream/1");
});
