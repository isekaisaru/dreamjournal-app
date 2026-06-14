import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import TreePreviewSheet from "@/app/components/forest/TreePreviewSheet";
import type { Dream, DreamProfile } from "@/app/types";
import { getDreamsForProfile } from "@/lib/apiClient";

jest.mock("@/lib/apiClient", () => ({
  getDreamsForProfile: jest.fn(),
}));

const mockedGetDreamsForProfile = getDreamsForProfile as jest.MockedFunction<
  typeof getDreamsForProfile
>;

function profile(overrides: Partial<DreamProfile>): DreamProfile {
  return {
    id: 1,
    name: "自分",
    avatar_emoji: "🧑",
    color: "#8b5cf6",
    relationship: "self",
    active: true,
    position: 1,
    archived: false,
    created_at: "2026-06-14T00:00:00Z",
    updated_at: "2026-06-14T00:00:00Z",
    dreams_count: 1,
    ...overrides,
  };
}

function dream(overrides: Partial<Dream>): Dream {
  return {
    id: 1,
    title: "古い木のゆめ",
    userId: 1,
    created_at: "2026-06-14T00:00:00Z",
    updated_at: "2026-06-14T00:00:00Z",
    emotions: [{ id: 1, name: "喜び" }],
    ...overrides,
  };
}

describe("TreePreviewSheet", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("clears the previous recent dream when loading another profile fails", async () => {
    mockedGetDreamsForProfile
      .mockResolvedValueOnce([dream({ title: "前の木のゆめ" })])
      .mockRejectedValueOnce(new Error("temporary failure"));

    const { rerender } = render(
      <TreePreviewSheet
        profile={profile({ id: 1, name: "自分" })}
        onOpen={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(await screen.findByText(/前の木のゆめ/)).toBeInTheDocument();

    rerender(
      <TreePreviewSheet
        profile={profile({ id: 2, name: "家族", dreams_count: 2 })}
        onOpen={jest.fn()}
        onClose={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(mockedGetDreamsForProfile).toHaveBeenCalledWith(2);
    });

    await waitFor(() => {
      expect(screen.queryByText(/前の木のゆめ/)).not.toBeInTheDocument();
      expect(screen.queryByText("さいきんの ゆめ：")).not.toBeInTheDocument();
    });
  });
});
