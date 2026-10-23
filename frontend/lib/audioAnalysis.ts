import type { AnalysisResult } from "@/app/types";

// Next.js プロキシ (app/api/analyze_audio_dream/route.ts) は backend 呼び出しを
// 15 秒で打ち切り 504 を返す。クライアント側はそれに「モバイル回線でのアップロード時間」
// を上乗せした余裕のある値にし、応答が返らないまま待ち続ける状態だけを防ぐ。
export const AUDIO_UPLOAD_TIMEOUT_MS = 60_000;

export const AUDIO_UPLOAD_TIMEOUT_MESSAGE =
  "送信がタイムアウトしました。通信状況を確認して、もう一度送信してください。";

/**
 * 音声送信の失敗。`Error` を継承しているので、message だけを見る既存の呼び出し側はそのまま動く。
 * - retryable: 同じ録音を再送すれば結果が変わりうるか（422 無音 / 400 / 回数上限は false）
 * - maybeSaved: サーバー側ではすでに Dream が保存済みの可能性があるか（タイムアウト / 504）
 */
export class AudioUploadError extends Error {
  readonly status?: number;
  readonly retryable: boolean;
  readonly maybeSaved: boolean;

  constructor(
    message: string,
    {
      status,
      retryable = true,
      maybeSaved = false,
    }: { status?: number; retryable?: boolean; maybeSaved?: boolean } = {}
  ) {
    super(message);
    this.name = "AudioUploadError";
    this.status = status;
    this.retryable = retryable;
    this.maybeSaved = maybeSaved;
  }
}

// 再送しても同じ結果になる失敗。メール未確認の 403 は確認後に再送できるので対象外
const isRetryableFailure = (
  status: number,
  data: { limit_reached?: unknown } | null
): boolean => {
  if (status === 400 || status === 422) return false;
  if (status === 403 && data?.limit_reached === true) return false;
  return true;
};

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
      let data: { error?: unknown; limit_reached?: unknown } | null = null;
      try {
        data = await res.json();
        console.error("Debug: API Error Response", data);
        if (data?.error && typeof data.error === "string") {
          message = data.error;
        }
      } catch (e) {
        console.error("Debug: Failed to parse API error JSON", e);
      }
      throw new AudioUploadError(message, {
        status: res.status,
        retryable: isRetryableFailure(res.status, data),
        // プロキシの 504 は backend の応答待ちで切れただけで、保存済みの可能性がある
        maybeSaved: res.status === 504,
      });
    }

    return (await res.json()) as AnalysisResult;
  } catch (err) {
    // タイムアウトによる中断は、録音を保持したまま再送できる失敗として扱う。
    // サーバーで保存済みの可能性があるので maybeSaved も立てる
    if (controller.signal.aborted) {
      throw new AudioUploadError(AUDIO_UPLOAD_TIMEOUT_MESSAGE, {
        retryable: true,
        maybeSaved: true,
      });
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
