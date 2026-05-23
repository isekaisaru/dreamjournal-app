"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import toast from "react-hot-toast";
import { EmotionTag } from "./EmotionTag";

type DreamShareCardProps = {
  imageUrl: string;
  title: string;
  recordedAt: string;
  emotionLabels: string[];
  imageAlt: string;
};

function formatDate(dateInput: string): string {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// blob URL に差し替えた img が描画可能になるまで待つ。
// decode() が使えない環境では complete チェックか onload にフォールバックする。
async function waitForImageReady(img: HTMLImageElement): Promise<void> {
  if (typeof img.decode === "function") {
    await img.decode();
    return;
  }
  if (img.complete && img.naturalWidth > 0) return;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("image load failed"));
  });
}

export default function DreamShareCard({
  imageUrl,
  title,
  recordedAt,
  emotionLabels,
  imageAlt,
}: DreamShareCardProps) {
  const formattedDate = formatDate(recordedAt);
  const cardRef = useRef<HTMLElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;

  const handleSave = async () => {
    if (!cardRef.current || isSaving) return;
    setIsSaving(true);

    const card = cardRef.current;
    const img = card.querySelector("img");
    const originalSrc = img?.src;
    let objectUrl: string | null = null;

    try {
      if (img) {
        // Fetch image via same-origin proxy to avoid tainted canvas CORS error
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error("proxy fetch failed");
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        img.src = objectUrl;
        await waitForImageReady(img);
      }

      const dataUrl = await toPng(card, { pixelRatio: 2 });
      const filename = `yumetree-dream-card-${todayIso()}.png`;

      // iOS Safari: try Web Share API with file
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          const pngBlob = await fetch(dataUrl).then((r) => r.blob());
          const file = new File([pngBlob], filename, { type: "image/png" });
          if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file] });
            toast.success("画像をシェアしました");
            return;
          }
        } catch (err) {
          // ユーザーが共有シートをキャンセルした場合は何もしない（<a download> にフォールバックしない）
          if (err instanceof DOMException && err.name === "AbortError") return;
          // canShare/share 非対応・その他エラー → <a download> にフォールバック
        }
      }

      // PC / Android Chrome: <a download>
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      a.click();
      toast.success("画像を保存しました");
    } catch {
      toast.error("画像の保存に失敗しました");
    } finally {
      if (img && originalSrc !== undefined) img.src = originalSrc;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setIsSaving(false);
    }
  };

  return (
    <>
      <section
        ref={cardRef}
        aria-label="夢画像シェアカード"
        data-testid="dream-share-card"
        className="mt-6 overflow-hidden rounded-lg border border-sky-200/70 bg-gradient-to-br from-sky-50 via-white to-amber-50 text-slate-900 shadow-lg"
      >
        <div className="relative aspect-square overflow-hidden bg-slate-100">
          <Image
            src={imageUrl}
            alt={`${imageAlt} シェアカード`}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            unoptimized
          />
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase text-sky-700">
              YumeTree
            </p>
            <p className="text-xs font-semibold text-slate-500">ユメツリー</p>
          </div>

          <div>
            {formattedDate && (
              <p className="text-sm font-medium text-slate-500">
                {formattedDate}
              </p>
            )}
            <h2 className="mt-1 text-2xl font-bold leading-tight text-slate-950">
              {title}
            </h2>
          </div>

          {emotionLabels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {emotionLabels.slice(0, 4).map((label, index) => (
                <EmotionTag key={`${label}-${index}`} label={label} />
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          data-testid="save-image-button"
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 disabled:opacity-50"
        >
          {isSaving ? "保存中..." : "画像として保存"}
        </button>
      </div>
    </>
  );
}
