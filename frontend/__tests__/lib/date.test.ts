import { getJSTDateStr, getJSTYearMonthKey } from "@/lib/date";

describe("date utilities", () => {
  it("returns a stable JST date string in YYYY-MM-DD format", () => {
    expect(getJSTDateStr("2026-03-27T18:30:00.000Z")).toBe("2026-03-28");
  });

  it("returns a stable JST year-month key in YYYY-MM format", () => {
    expect(getJSTYearMonthKey("2026-03-27T18:30:00.000Z")).toBe("2026-03");
  });
});
