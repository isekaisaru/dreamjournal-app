"use client";

/**
 * CommandPalette — ⌘K コマンドパレット（redesign-code STEP 3 / 改善②）
 *
 * 検索・記録・移動を1ストロークで。Context で全アプリから palette.open() を呼べる。
 * ⌘K / Ctrl+K で開閉、Esc で閉じる、↑↓ で選択、Enter で実行。
 * 依存は lucide-react / next/navigation / AuthContext / apiClient のみ（外部ライブラリ不要）。
 *
 * - 認証時のみ有効（未ログインでは何も描画せず、キー監視もしない）。
 * - 「さいきんの ゆめ」は初回 open 時に遅延 fetch（/dreams 先頭6件）。
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { House, Moon, Plus, Search, Settings, Sparkles, Trees } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/apiClient";
import type { Dream } from "@/app/types";

type PaletteCtx = { open: () => void; close: () => void; toggle: () => void };

const Ctx = createContext<PaletteCtx | null>(null);

export function useCommandPalette(): PaletteCtx {
  const ctx = useContext(Ctx);
  // Provider 外で呼ばれても落とさない（no-op）
  return ctx ?? { open: () => {}, close: () => {}, toggle: () => {} };
}

type Command = {
  id: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  run: () => void;
  group: "action" | "dream";
};

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [recentDreams, setRecentDreams] = useState<Dream[]>([]);
  const fetchedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const open = useCallback(() => {
    if (isLoggedIn) setIsOpen(true);
  }, [isLoggedIn]);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => {
    if (isLoggedIn) setIsOpen((v) => !v);
  }, [isLoggedIn]);

  // ⌘K / Ctrl+K（認証時のみ）
  useEffect(() => {
    if (!isLoggedIn) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((v) => !v);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLoggedIn]);

  // 開いたら入力欄を初期化・フォーカス
  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setActive(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);

  // 初回 open 時に最近の夢を遅延 fetch（失敗は非致命）
  useEffect(() => {
    if (!isOpen || fetchedRef.current || !isLoggedIn) return;
    fetchedRef.current = true;
    apiClient
      .get<Dream[]>("/dreams")
      .then((dreams) => setRecentDreams(dreams.slice(0, 6)))
      .catch(() => {
        // 取得失敗時はクイック操作のみ表示
      });
  }, [isOpen, isLoggedIn]);

  const commands = useMemo<Command[]>(() => {
    const actions: Command[] = [
      { id: "new", label: "新しい夢を記録", icon: <Plus size={16} />, group: "action", run: () => router.push("/dream/new") },
      { id: "home", label: "ホームへ", icon: <House size={16} />, group: "action", run: () => router.push("/home") },
      { id: "forest", label: "もりへ", icon: <Trees size={16} />, group: "action", run: () => router.push("/forest") },
      { id: "my-dreams", label: "マイ夢へ", icon: <Moon size={16} />, group: "action", run: () => router.push("/my-dreams") },
      { id: "settings", label: "設定へ", icon: <Settings size={16} />, group: "action", run: () => router.push("/settings") },
    ];
    const dreamCmds: Command[] = recentDreams.map((d) => ({
      id: `dream-${d.id}`,
      label: d.title,
      hint: d.created_at
        ? new Date(d.created_at).toLocaleDateString("ja-JP", {
            month: "long",
            day: "numeric",
            timeZone: "Asia/Tokyo",
          })
        : undefined,
      icon: <Sparkles size={16} />,
      group: "dream",
      run: () => router.push(`/dream/${d.id}`),
    }));
    return [...actions, ...dreamCmds];
  }, [recentDreams, router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  const runActive = useCallback(() => {
    const cmd = filtered[active];
    if (!cmd) return;
    setIsOpen(false);
    cmd.run();
  }, [filtered, active]);

  const ctxValue = useMemo<PaletteCtx>(
    () => ({ open, close, toggle }),
    [open, close, toggle]
  );

  return (
    <Ctx.Provider value={ctxValue}>
      {children}
      {isOpen && isLoggedIn && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="コマンドパレット"
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border px-5 py-4">
              <Search size={20} className="text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((i) => Math.min(i + 1, filtered.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    runActive();
                  }
                }}
                placeholder="夢を検索 / コマンド…"
                aria-label="夢を検索 / コマンド"
                className="flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
              />
              <kbd className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                esc
              </kbd>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  一致する夢やコマンドがありません
                </div>
              ) : (
                <>
                  <CommandGroup title="クイック操作" group="action" filtered={filtered} active={active} setActive={setActive} runActive={runActive} />
                  <CommandGroup title="さいきんの ゆめ" group="dream" filtered={filtered} active={active} setActive={setActive} runActive={runActive} />
                </>
              )}
            </div>

            <div className="flex items-center gap-4 border-t border-border bg-muted/30 px-5 py-2.5 text-[11px] font-medium text-muted-foreground">
              <span>↑↓ 移動</span>
              <span>↵ 開く</span>
              <span className="ml-auto">⌘K でいつでも</span>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

function CommandGroup({
  title,
  group,
  filtered,
  active,
  setActive,
  runActive,
}: {
  title: string;
  group: Command["group"];
  filtered: Command[];
  active: number;
  setActive: (i: number) => void;
  runActive: () => void;
}) {
  const items = filtered.filter((c) => c.group === group);
  if (items.length === 0) return null;
  return (
    <div className="mb-1">
      <div className="px-3 py-1.5 text-[10.5px] font-semibold tracking-wide text-muted-foreground">
        {title}
      </div>
      {items.map((cmd) => {
        const idx = filtered.indexOf(cmd);
        const isActive = idx === active;
        return (
          <button
            key={cmd.id}
            type="button"
            onMouseEnter={() => setActive(idx)}
            onClick={runActive}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
              isActive ? "bg-primary/10" : "hover:bg-muted/60"
            }`}
          >
            <span
              className={`grid h-8 w-8 place-items-center rounded-lg ${
                isActive ? "bg-card text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              {cmd.icon}
            </span>
            <span className="truncate text-sm font-semibold text-foreground">
              {cmd.label}
            </span>
            {cmd.hint && (
              <span className="ml-auto shrink-0 text-[11px] font-medium text-muted-foreground">
                {cmd.hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
