import type { Emotion } from "@/app/types";

import { getChildFriendlyEmotionLabel } from "./EmotionTag";

export type EmotionGroup = {
  displayLabel: string;
  ids: number[];
  representativeId: number;
};

export function groupEmotionsByDisplayLabel(
  emotions: Emotion[]
): EmotionGroup[] {
  const grouped: Record<string, EmotionGroup> = {};

  emotions.forEach((emotion) => {
    const displayLabel = getChildFriendlyEmotionLabel(emotion.name);

    if (!grouped[displayLabel]) {
      grouped[displayLabel] = {
        displayLabel,
        ids: [],
        representativeId: emotion.id,
      };
    }

    grouped[displayLabel].ids.push(emotion.id);
  });

  return Object.values(grouped);
}
