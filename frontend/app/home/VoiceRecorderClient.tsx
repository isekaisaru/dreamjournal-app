"use client";

import dynamic from "next/dynamic";

const DreamRecorderFloating = dynamic(
  () => import("./components/DreamRecorderFloating"),
  { ssr: false }
);

export default function VoiceRecorderClient() {
  return <DreamRecorderFloating />;
}
