import { render, screen } from "@testing-library/react";
import MoodCalendar from "@/app/components/MoodCalendar";
import { Dream } from "@/app/types";

function dream(id: number, createdAt: string, emotion: string): Dream {
  return {
    id,
    created_at: createdAt,
    analysis_json: { emotion_tags: [emotion] },
  } as unknown as Dream;
}

describe("MoodCalendar", () => {
  it("曜日見出し（日〜土）を描画する", () => {
    render(<MoodCalendar dreams={[]} month="2026-06" />);
    ["日", "月", "火", "水", "木", "金", "土"].forEach((w) => {
      expect(screen.getByText(w)).toBeInTheDocument();
    });
  });

  it("夢のある日を感情色のセルにする（記録なしのbg-mutedではない）", () => {
    const { container } = render(
      <MoodCalendar
        dreams={[dream(1, "2026-06-15T03:00:00Z", "嬉しい")]}
        month="2026-06"
      />
    );
    // うれしい系 → bg-orange-400 の日セル（titleに感情と件数）が存在する
    const cell = container.querySelector('[title*="うれしい"]');
    expect(cell).not.toBeNull();
    expect(cell?.className).toContain("bg-orange-400");
    expect(cell?.className).not.toContain("bg-muted");
  });

  it("AIタグが空でも手動の感情で色がつく（バグ回帰防止）", () => {
    const manualDream = {
      id: 2,
      created_at: "2026-06-20T03:00:00Z",
      analysis_json: { emotion_tags: [] },
      emotions: [{ id: 1, name: "嬉しい" }],
    } as unknown as Dream;
    const { container } = render(
      <MoodCalendar dreams={[manualDream]} month="2026-06" />
    );
    const cell = container.querySelector('[title*="うれしい"]');
    expect(cell).not.toBeNull();
    expect(cell?.className).toContain("bg-orange-400");
  });

  it("凡例を描画する", () => {
    render(<MoodCalendar dreams={[]} month="2026-06" />);
    expect(screen.getByText("記録なし")).toBeInTheDocument();
  });
});
