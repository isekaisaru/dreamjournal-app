import type { AnalysisResult } from "@/app/types";

// Next.js プロキシ (app/api/analyze_audio_dream/route.ts) は backend 呼び出しを
// 15 秒で打ち切り 504 を返す。クライアント側はそれに「モバイル回線でのアップロード時間」
// を上乗せした余裕のある値にし、応答が返らないまま待ち続ける状態だけを防ぐ。
export const AUDIO_UPLOAD_TIMEOUT_MS = 60_000;

export const AUDIO_UPLOAD_TIMEOUT_MESSAGE =
  "送信がタイムアウトしました。通信状況を確認して、もう一度送信してください。";

type UploadAndAnalyzeAudioOptions = {
  timeoutMs?: number;
};

export async function uploadAndAnalyzeAudio(
  audioBlob: Blob,
  { timeoutMs = AUDIO_UPLOAD_TIMEOUT_MS }: UploadAndAnalyzeAudioOptions = {}
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("/api/analyze_audio_dream", {
      method: "POST",
      body: formData,
      signal: controller.signal,
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
  } catch (err) {
    // タイムアウトによる中断は、録音を保持したまま再送できる失敗として扱う
    if (controller.signal.aborted) {
      throw new Error(AUDIO_UPLOAD_TIMEOUT_MESSAGE);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
