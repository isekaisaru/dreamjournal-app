"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Emotion } from "@/app/types";
import { getJSTDateStr } from "@/lib/date";
import { Button } from "./ui/button";
import { groupEmotionsByDisplayLabel } from "./emotionGrouping";

type SearchBarProps = {
  query?: string | string[] | undefined;
  startDate?: string | string[] | undefined;
  endDate?: string | string[] | undefined;
  // dreamProfileId は prop で受け取らず、submit 時に window.location.search から読む
  // （ProfileFilterChips の router.push 後も含め、常に現在の URL の値を使うため）
  emotions?: Emotion[];
  selectedEmotionIds?: string[];
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
  emotions = [],
  selectedEmotionIds = [],
}: SearchBarProps) {
  const router = useRouter();
  const normalizedSelectedEmotionIds = selectedEmotionIds.map((id) => Number(id));
  const selectedIdsKey = normalizedSelectedEmotionIds.join(",");
  const [queryValue, setQueryValue] = useState(normalizeParam(query));
  const [dateFrom, setDateFrom] = useState(normalizeParam(startDate));
  const [dateTo, setDateTo] = useState(normalizeParam(endDate));
  const [selectedIds, setSelectedIds] = useState<number[]>(
    normalizedSelectedEmotionIds
  );

  const hasAdvancedFilters =
    !!normalizeParam(startDate) ||
    !!normalizeParam(endDate) ||
    selectedEmotionIds.length > 0;
  const [isExpanded, setIsExpanded] = useState(hasAdvancedFilters);

  const groupedEmotions = groupEmotionsByDisplayLabel(emotions);

  // URL パラメータ（props）が変わったとき（例：ブラウザ戻る・検索リセット）に
  // フォームの表示値を同期する。
  useEffect(() => {
    setQueryValue(normalizeParam(query));
  }, [query]);

  useEffect(() => {
    setDateFrom(normalizeParam(startDate));
  }, [startDate]);

  useEffect(() => {
    setDateTo(normalizeParam(endDate));
  }, [endDate]);

  useEffect(() => {
    setSelectedIds(normalizedSelectedEmotionIds);
  }, [selectedIdsKey]);

  useEffect(() => {
    if (hasAdvancedFilters) {
      setIsExpanded(true);
    }
  }, [hasAdvancedFilters]);

  /**
   * フォーム送信を router.push に委譲する。
   *
   * - ネイティブ form 送信（action="/home" GET）を preventDefault で止める
   * - dream_profile_id は window.location.search から読む
   *   → [すべて]チップが router.push で URL を変更した後でも正しい値を取得できる
   * - これにより「[すべて]クリック後にフォームが再送信して dream_profile_id を復元する」
   *   バグを防ぐ
   */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 現在の URL から dream_profile_id を取得する
    const currentParams = new URLSearchParams(window.location.search);
    const nextParams = new URLSearchParams();

    if (queryValue) {
      nextParams.set("query", queryValue);
    }
    if (dateFrom) {
      nextParams.set("startDate", dateFrom);
    }
    if (dateTo) {
      nextParams.set("endDate", dateTo);
    }
    selectedIds.forEach((id) => nextParams.append("emotion_ids[]", String(id)));

    // dream_profile_id は現在の URL から引き継ぐ（prop や hidden input は使わない）
    const dreamProfileId = currentParams.get("dream_profile_id");
    if (dreamProfileId) {
      nextParams.set("dream_profile_id", dreamProfileId);
    }

    const queryString = nextParams.toString();
    router.push(queryString ? `/home?${queryString}` : "/home");
  };

  const applyPreset = (from: Date, to: Date) => {
    setDateFrom(getJSTDateStr(from));
    setDateTo(getJSTDateStr(to));
  };

  const presets = [
    {
      label: "きょう",
      onClick: () => {
        const t = new Date();
        applyPreset(t, t);
      },
    },
    {
      label: "今週",
      onClick: () => {
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - 6);
        applyPreset(from, to);
      },
    },
    {
      label: "今月",
      onClick: () => {
        const to = new Date();
        const from = new Date(to.getFullYear(), to.getMonth(), 1);
        applyPreset(from, to);
      },
    },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 w-full rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      {/* dream_profile_id の hidden input は削除 — handleSubmit で window.location.search から読む */}
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="emotion_ids[]" value={id} />
      ))}
      {/* 折りたたみ時も日付フィルターを保持する */}
      {!isExpanded && dateFrom && (
        <input type="hidden" name="startDate" value={dateFrom} />
      )}
      {!isExpanded && dateTo && (
        <input type="hidden" name="endDate" value={dateTo} />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <label
            htmlFor="search-query"
            className="block text-sm font-medium text-card-foreground mb-1"
          >
            ゆめの ことば
          </label>
          <input
            id="search-query"
            name="query"
            type="text"
            value={queryValue}
            onChange={(e) => setQueryValue(e.target.value)}
            placeholder="ねこ、そら、とぶ など"
            className="min-h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="min-h-12 flex-1 rounded-xl px-4 text-sm sm:flex-none"
            onClick={() => setIsExpanded((current) => !current)}
            aria-expanded={isExpanded}
          >
            {isExpanded ? "かんたんにする" : "くわしく さがす"}
          </Button>
          <Button
            type="submit"
            className="min-h-12 flex-1 rounded-xl px-5 text-sm font-bold sm:flex-none"
          >
            さがす
          </Button>
        </div>
      </div>

      {isExpanded ? (
        <div className="mt-4 space-y-4 rounded-2xl border border-border/70 bg-muted/30 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="start-date"
                className="mb-1 block text-sm font-medium text-card-foreground"
              >
                いつから
              </label>
              <input
                id="start-date"
                name="startDate"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label
                htmlFor="end-date"
                className="mb-1 block text-sm font-medium text-card-foreground"
              >
                いつまで
              </label>
              <input
                id="end-date"
                name="endDate"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {presets.map(({ label, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className="min-h-11 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                {label}
              </button>
            ))}
          </div>

          {groupedEmotions.length > 0 ? (
            <fieldset>
              <legend className="mb-2 block text-sm font-medium text-card-foreground">
                きもちで しぼる
              </legend>
              <div className="flex flex-wrap gap-2">
                {groupedEmotions.map((group) => {
                  const isSelected = group.ids.some((id) =>
                    selectedIds.includes(id)
                  );

                  return (
                    <button
                      key={group.displayLabel}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedIds((current) =>
                            current.filter((id) => !group.ids.includes(id))
                          );
                          return;
                        }

                        setSelectedIds((current) => [
                          ...new Set([...current, ...group.ids]),
                        ]);
                      }}
                      aria-pressed={isSelected}
                      className={[
                        "min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted",
                      ].join(" ")}
                    >
                      {group.displayLabel}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          <div className="flex justify-end">
            <a
              href="/home"
              className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              けんさくを やめる
            </a>
          </div>
        </div>
      ) : null}
    </form>
  );
}
