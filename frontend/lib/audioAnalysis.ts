import type { AnalysisResult } from "@/app/types";

export async function uploadAndAnalyzeAudio(
  audioBlob: Blob
): Promise<AnalysisResult> {
  const formData = new FormData();
  
  // Blobの型から拡張子を決定 (Safariは audio/mp4 や audio/aac になるため)
  let ext = "webm";
  if (audioBlob.type.includes("mp4") || audioBlob.type.includes("m4a")) {
    ext = "mp4";
  } else if (audioBlob.type.includes("aac")) {
    ext = "aac";
  } else if (audioBlob.type.includes("ogg")) {
    ext = "ogg";
  } else if (audioBlob.type.includes("wav")) {
    ext = "wav";
  }

  formData.append("file", audioBlob, `dream-recording-${Date.now()}.${ext}`);

  const res = await fetch("/api/analyze_audio_dream", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    let message = "音声解析に失敗しました。";
    try {
      const data = await res.json();
      console.error("Debug: API Error Response", data);
      if (data?.error && typeof data.error === "string") {
        message = data.error;
      }
    } catch (e) {
      console.error("Debug: Failed to parse API error JSON", e);
    }
    throw new Error(message);
  }

  return (await res.json()) as AnalysisResult;
}
