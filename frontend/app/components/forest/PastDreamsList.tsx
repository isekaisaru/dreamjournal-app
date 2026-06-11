"use client";

import { useState } from "react";
import Link from "next/link";
import type { Dream } from "@/app/types";

export default function PastDreamsList({ dreams }: { dreams: Dream[] }) {
  const [open, setOpen] = useState(false);
  if (dreams.length === 0) return null;

  return (
    <section className="mx-auto mt-8 w-full max-w-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white/90"
      >
        <span>むかしの ゆめ（{dreams.length}件）</span>
        <span className="text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <ul className="mt-2 space-y-1">
          {dreams.map((d) => (
            <li key={d.id}>
              <Link
                href={`/dream/${d.id}`}
                className="block truncate rounded-lg px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
              >
                {d.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
