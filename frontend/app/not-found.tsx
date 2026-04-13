import React from "react";
import Link from "next/link";

const NotFound = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground px-4 sm:px-6 lg:px-8">
      <div className="p-8 rounded-2xl shadow-md text-center bg-card text-card-foreground border border-border max-w-lg mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4">404</h1>
        <p className="text-muted-foreground leading-relaxed">
          その ぺーじは みつからなかったよ。
          <br />
          おうちに もどって、もういちど みてみよう。
        </p>
        <Link
          href="/home"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          おうちへ かえる
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
