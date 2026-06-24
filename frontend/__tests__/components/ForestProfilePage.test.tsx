import type { Dream, DreamProfile } from "@/app/types";
import {
  findActiveForestProfile,
  isValidForestProfileId,
  normalizeDreamProfilesResponse,
  normalizeProfileDreamsResponse,
} from "@/app/forest/[profileId]/page";

function profile(overrides: Partial<DreamProfile> = {}): DreamProfile {
  return {
    id: 1,
    name: "自分",
    avatar_emoji: "😴",
    color: "#6366f1",
    relationship: "self",
    active: true,
    position: 0,
    archived: false,
    created_at: "2026-06-24T00:00:00Z",
    updated_at: "2026-06-24T00:00:00Z",
    dreams_count: 0,
    ...overrides,
  };
}

function dream(overrides: Partial<Dream> = {}): Dream {
  return {
    id: 1,
    title: "森のゆめ",
    content: "森を歩いた",
    userId: 1,
    created_at: "2026-06-24T00:00:00Z",
    updated_at: "2026-06-24T00:00:00Z",
    emotions: [],
    ...overrides,
  };
}

describe("ForestProfilePage guards", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("accepts a valid profileId and rejects invalid profileIds before API calls", () => {
    expect(isValidForestProfileId(1)).toBe(true);
    expect(isValidForestProfileId(0)).toBe(false);
    expect(isValidForestProfileId(-1)).toBe(false);
    expect(isValidForestProfileId(Number.NaN)).toBe(false);
  });

  it("keeps an empty dreams array safe for rendering", () => {
    expect(normalizeProfileDreamsResponse([])).toEqual([]);
  });

  it("falls back to an empty dreams array when the dreams response is unexpected", () => {
    expect(normalizeProfileDreamsResponse({ error: "temporary failure" })).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Unexpected dreams response for forest detail",
      { error: "temporary failure" }
    );
  });

  it("keeps an array dreams response unchanged", () => {
    const dreams = [dream({ id: 10 })];
    expect(normalizeProfileDreamsResponse(dreams)).toBe(dreams);
  });

  it("returns null when the profiles response is unexpected", () => {
    expect(normalizeDreamProfilesResponse({ error: "bad response" })).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Unexpected dream profiles response for forest detail",
      { error: "bad response" }
    );
  });

  it("finds only active profiles for the requested profileId", () => {
    const active = profile({ id: 1, archived: false });
    const archived = profile({ id: 2, archived: true });

    expect(findActiveForestProfile([active, archived], 1)).toBe(active);
    expect(findActiveForestProfile([active, archived], 2)).toBeNull();
    expect(findActiveForestProfile([active], 999)).toBeNull();
  });
});
