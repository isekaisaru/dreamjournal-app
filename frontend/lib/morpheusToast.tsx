"use client";

import { custom } from "./toast";

export function showNightCeremonyToast() {
  custom(
    (t: { visible: boolean }) => (
      <div
        className={`${
          t.visible ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-2"
        } pointer-events-auto flex w-[min(92vw,360px)] items-center gap-3 rounded-[28px] border border-sky-200/40 bg-slate-950/90 px-4 py-4 text-slate-50 shadow-[0_18px_50px_rgba(15,23,42,0.45)] ring-1 ring-white/10 backdrop-blur-md transition-all duration-300`}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-400/15 text-2xl">
          🌙
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
            Night Ceremony
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            夢をそっと保存したよ
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            モルペウスが星をひとつ、きょうの記録に結んでおいたよ。
          </p>
        </div>
      </div>
    ),
    { duration: 4200, position: "top-center" }
  );
}
