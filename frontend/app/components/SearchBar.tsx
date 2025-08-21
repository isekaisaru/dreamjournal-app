"use client";
import React, { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const SearchBar = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URLのクエリパラメータから初期値を取得し、フォームに表示
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [startDate, setStartDate] = useState(
    searchParams.get("startDate") || ""
  );
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set("query", query.trim());
    } else {
      params.delete("query");
    }
    if (startDate) {
      params.set("startDate", startDate.trim());
    } else {
      params.delete("startDate");
    }
    if (endDate) {
      params.set("endDate", endDate.trim());
    } else {
      params.delete("endDate");
    }
    // URLを更新して、サーバーコンポーネントに再レンダリングをトリガーさせる
    router.push(`/home?${params.toString()}`);
  };

  const handleReset = () => {
    setQuery("");
    setStartDate("");
    setEndDate("");
    // クエリパラメータなしでホームページに遷移
    router.push("/home");
  };

  return (
    <form
      onSubmit={handleSearchSubmit}
      className="p-4 mb-6 bg-card border border-border rounded-lg w-full"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
        <div className="sm:col-span-2 md:col-span-2">
          <label
            htmlFor="search-query"
            className="block text-sm font-medium text-card-foreground mb-1"
          >
            キーワード
          </label>
          <input
            id="search-query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="キーワード、感情タグなどで検索"
            className="w-full border border-input bg-background text-foreground p-2 rounded focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label
            htmlFor="start-date"
            className="block text-sm font-medium text-card-foreground mb-1"
          >
            開始日
          </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-input bg-background text-foreground p-2 rounded focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label
            htmlFor="end-date"
            className="block text-sm font-medium text-card-foreground mb-1"
          >
            終了日
          </label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-input bg-background text-foreground p-2 rounded focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button
          type="button"
          onClick={handleReset}
          className="bg-muted hover:bg-muted/80 text-muted-foreground p-2 rounded text-sm"
        >
          リセット
        </button>
        <button
          type="submit"
          className="bg-primary hover:bg-primary/90 text-primary-foreground p-2 rounded text-sm"
        >
          検索
        </button>
      </div>
    </form>
  );
};

export default SearchBar;
