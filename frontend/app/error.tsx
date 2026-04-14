"use client";

import React from "react";
import Link from "next/link";

const ErrorComponent = ({ reset }: { reset: () => void }) => {
  return (
    <div
      className="mx-auto mt-6 max-w-md rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-center shadow-md"
      aria-live="assertive"
    >
      <h3 className="mb-2 text-lg font-bold text-destructive">
        うまく ひらけなかったよ
      </h3>
      <p className="text-sm leading-relaxed text-destructive">
        ちょっと つまずいちゃったみたい。
        <br />
        もういちど ためすか、おうちに もどってみてね。
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={() => reset()}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground transition duration-200 hover:bg-destructive/90"
        >
          もういちど
        </button>
        <Link
          href="/home"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-muted"
        >
          おうちへ
        </Link>
      </div>
    </div>
  );
};

export default ErrorComponent;
