export type EmotionColor = {
  bg: string;
  text: string;
  border: string;
};

const emotionColorMap: Record<string, EmotionColor> = {
  嬉しい: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-300",
  },
  楽しい: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-300",
  },
  悲しい: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-300",
  },
  怒り: { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
  不安: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    border: "border-purple-300",
  },
  怖い: {
    bg: "bg-indigo-100",
    text: "text-indigo-800",
    border: "border-indigo-300",
  },
  不思議: {
    bg: "bg-teal-100",
    text: "text-teal-800",
    border: "border-teal-300",
  },
  感動的: {
    bg: "bg-pink-100",
    text: "text-pink-800",
    border: "border-pink-300",
  },
};

export function getEmotionColors(name: string): EmotionColor {
  return (
    emotionColorMap[name] || {
      bg: "bg-muted",
      text: "text-muted-foreground",
      border: "border-border",
    }
  );
}
