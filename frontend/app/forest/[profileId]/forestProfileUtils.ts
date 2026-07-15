import type { Dream, DreamProfile } from "@/app/types";

export function isValidForestProfileId(profileId: number): boolean {
  return Number.isInteger(profileId) && profileId > 0;
}

export function normalizeDreamProfilesResponse(value: unknown): DreamProfile[] | null {
  if (Array.isArray(value)) return value as DreamProfile[];

  console.error("Unexpected dream profiles response for forest detail", value);
  return null;
}

export function normalizeProfileDreamsResponse(value: unknown): Dream[] {
  if (Array.isArray(value)) return value as Dream[];

  console.error("Unexpected dreams response for forest detail", value);
  return [];
}

export function findActiveForestProfile(
  profiles: DreamProfile[],
  profileId: number
): DreamProfile | null {
  return profiles.find((p) => p.id === profileId && !p.archived) ?? null;
}
