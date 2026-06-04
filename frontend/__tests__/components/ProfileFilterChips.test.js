import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfileFilterChips from "@/app/components/ProfileFilterChips";

const profiles = [
  {
    id: 1,
    name: "自分",
    avatar_emoji: "😴",
    color: "#6366f1",
    relationship: "self",
    active: true,
    position: 0,
    archived: false,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
  {
    id: 2,
    name: "モカ",
    avatar_emoji: "🐱",
    color: "#10b981",
    relationship: "pet",
    active: true,
    position: 1,
    archived: false,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
  {
    id: 3,
    name: "古いプロフィール",
    avatar_emoji: "👤",
    color: "#94a3b8",
    relationship: "other",
    active: false,
    position: 2,
    archived: true,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
];

describe("ProfileFilterChips", () => {
  it("すべてチップとactiveプロフィールだけを表示する", () => {
    render(
      <ProfileFilterChips
        profiles={profiles}
        selectedProfileId={null}
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "すべて" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /自分/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /モカ/ })).toBeInTheDocument();
    expect(screen.queryByText("古いプロフィール")).not.toBeInTheDocument();
  });

  it("選択中プロフィールをaria-pressedで表す", () => {
    render(
      <ProfileFilterChips
        profiles={profiles}
        selectedProfileId="2"
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /モカ/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "すべて" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("プロフィールチップをクリックするとプロフィールIDを渡す", async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();

    render(
      <ProfileFilterChips
        profiles={profiles}
        selectedProfileId={null}
        onSelect={onSelect}
      />
    );

    await user.click(screen.getByRole("button", { name: /モカ/ }));

    expect(onSelect).toHaveBeenCalledWith("2");
  });

  it("すべてチップをクリックするとnullを渡す", async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();

    render(
      <ProfileFilterChips
        profiles={profiles}
        selectedProfileId="2"
        onSelect={onSelect}
      />
    );

    await user.click(screen.getByRole("button", { name: "すべて" }));

    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
