import React from "react";

type SearchBarProps = {
  query?: string | string[] | undefined;
  startDate?: string | string[] | undefined;
  endDate?: string | string[] | undefined;
};

function normalizeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export default function SearchBar({
  query,
  startDate,
  endDate,
}: SearchBarProps) {
  const normalizedQuery = normalizeParam(query);
  const normalizedStartDate = normalizeParam(startDate);
  const normalizedEndDate = normalizeParam(endDate);

  return (
    <form
      action="/home"
      method="get"
      className="p-4 mb-6 bg-card border border-border rounded-lg w-full"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
        <div className="sm:col-span-2 md:col-span-2">
          <label
            htmlFor="search-query"
            className="block text-sm font-medium text-card-foreground mb-1"
          >
            さがしたい ことば
          </label>
          <input
            id="search-query"
            name="query"
            type="text"
            defaultValue={normalizedQuery}
            placeholder="「ねこ」「こわい」など..."
            className="w-full border border-input bg-background text-foreground p-2 rounded focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label
            htmlFor="start-date"
            className="block text-sm font-medium text-card-foreground mb-1"
          >
            いつから
          </label>
          <input
            id="start-date"
            name="startDate"
            type="date"
            defaultValue={normalizedStartDate}
            className="w-full border border-input bg-background text-foreground p-2 rounded focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label
            htmlFor="end-date"
            className="block text-sm font-medium text-card-foreground mb-1"
          >
            いつまで
          </label>
          <input
            id="end-date"
            name="endDate"
            type="date"
            defaultValue={normalizedEndDate}
            className="w-full border border-input bg-background text-foreground p-2 rounded focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <a
          href="/home"
          className="inline-flex items-center justify-center bg-muted hover:bg-muted/80 text-muted-foreground p-2 rounded text-sm"
        >
          もどす
        </a>
        <button
          type="submit"
          className="bg-primary hover:bg-primary/90 text-primary-foreground p-2 rounded text-sm"
        >
          さがす
        </button>
      </div>
    </form>
  );
}
