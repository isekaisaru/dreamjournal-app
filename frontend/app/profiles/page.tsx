"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Plus, Archive, RotateCcw, Pencil } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Loading from "@/app/loading";
import {
  getDreamProfiles,
  createDreamProfile,
  updateDreamProfile,
  archiveDreamProfile,
  restoreDreamProfile,
} from "@/lib/apiClient";
import type { DreamProfile, DreamRelationship } from "@/app/types";
import { toast } from "@/lib/toast";

const RELATIONSHIP_LABELS: Record<DreamRelationship, string> = {
  self: "自分",
  partner: "パートナー",
  child: "子ども",
  parent: "親",
  friend: "友達",
  pet: "ペット",
  other: "その他",
};

const COLOR_PALETTE = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
];

const EMOJI_SUGGESTIONS = [
  "😴", "🙂", "😊", "🧑", "👶", "🧒", "👦", "👧",
  "💕", "🥰", "👨", "👩", "🧓", "👴", "👵",
  "🐱", "🐶", "🐰", "🐹", "✨", "🌟", "🎭", "🌙",
];

interface ProfileFormState {
  name: string;
  avatar_emoji: string;
  color: string;
  relationship: DreamRelationship;
}

const DEFAULT_FORM: ProfileFormState = {
  name: "",
  avatar_emoji: "🌙",
  color: "#6366f1",
  relationship: "other",
};

export default function ProfilesPage() {
  const { authStatus } = useAuth();
  const router = useRouter();

  const [profiles, setProfiles] = useState<DreamProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<DreamProfile | null>(null);
  const [form, setForm] = useState<ProfileFormState>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const loadProfiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getDreamProfiles();
      setProfiles(data);
    } catch {
      toast.error("プロフィールの取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") {
      loadProfiles();
    }
  }, [authStatus, loadProfiles, router]);

  const activeProfiles = profiles.filter((p) => !p.archived);
  const archivedProfiles = profiles.filter((p) => p.archived);
  const remaining = 5 - activeProfiles.length;

  const openCreate = () => {
    setEditingProfile(null);
    setForm(DEFAULT_FORM);
    setModalOpen(true);
  };

  const openEdit = (profile: DreamProfile) => {
    setEditingProfile(profile);
    setForm({
      name: profile.name,
      avatar_emoji: profile.avatar_emoji,
      color: profile.color,
      relationship: profile.relationship,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("なまえ を いれてね。");
      return;
    }
    setIsSaving(true);
    try {
      if (editingProfile) {
        const updated = await updateDreamProfile(editingProfile.id, form);
        setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        toast.success("プロフィールを更新しました。");
      } else {
        const created = await createDreamProfile(form);
        setProfiles((prev) => [...prev, created]);
        toast.success("プロフィールを作成しました。");
      }
      setModalOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "保存できませんでした。";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async (profile: DreamProfile) => {
    try {
      const updated = await archiveDreamProfile(profile.id);
      setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast.success(`${profile.name} をアーカイブしました。`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "アーカイブできませんでした。";
      toast.error(msg);
    }
  };

  const handleRestore = async (profile: DreamProfile) => {
    try {
      const updated = await restoreDreamProfile(profile.id);
      setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast.success(`${profile.name} を復元しました。`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "復元できませんでした。";
      toast.error(msg);
    }
  };

  if (authStatus === "checking") return <Loading />;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-border/50">
        <div className="container max-w-2xl mx-auto px-4 h-16 flex items-center">
          <Link
            href="/settings"
            className="flex items-center text-muted-foreground hover:text-primary transition-colors pr-4"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            もどる
          </Link>
          <h1 className="text-xl font-bold">夢プロフィール</h1>
          <span className="ml-auto text-sm text-muted-foreground">
            残り <span className="font-bold text-foreground">{remaining}</span> 枠
          </span>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-8 space-y-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          夢プロフィールを作ると、自分・家族・ペットなど、誰の夢かを分けて記録できます。
          夢を書くときに選ぶと、あとから人ごとに見返しやすくなります。最大5つまで。
        </p>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {activeProfiles.map((p) => (
              <ProfileCard
                key={p.id}
                profile={p}
                onEdit={() => openEdit(p)}
                onArchive={() => handleArchive(p)}
              />
            ))}

            {remaining > 0 && (
              <button
                onClick={openCreate}
                className="flex flex-col items-center justify-center gap-2 h-36 rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="w-6 h-6" />
                <span className="text-sm font-medium">ついか</span>
              </button>
            )}
          </div>
        )}

        {archivedProfiles.length > 0 && (
          <section>
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              <Archive className="w-4 h-4" />
              アーカイブ済み ({archivedProfiles.length}件)
              <span className="text-xs">{showArchived ? "▲" : "▼"}</span>
            </button>

            {showArchived && (
              <div className="space-y-2">
                {archivedProfiles.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/50"
                  >
                    <span
                      className="text-2xl w-10 h-10 flex items-center justify-center rounded-full shrink-0"
                      style={{ backgroundColor: p.color + "22" }}
                    >
                      {p.avatar_emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-muted-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{RELATIONSHIP_LABELS[p.relationship]}</p>
                    </div>
                    {remaining > 0 && (
                      <button
                        onClick={() => handleRestore(p)}
                        className="shrink-0 flex items-center gap-1 text-xs text-primary hover:text-primary/70 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        復元
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl border border-border/50 overflow-hidden">
            <div className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
              <h2 className="text-lg font-bold">
                {editingProfile ? "プロフィールを編集" : "プロフィールを追加"}
              </h2>

              <div className="flex justify-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                  style={{ backgroundColor: form.color + "33" }}
                >
                  {form.avatar_emoji}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">なまえ</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  maxLength={30}
                  placeholder="例: たろう / ねこのミー"
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-ring"
                />
              </div>

              {editingProfile?.relationship !== "self" && (
                <div>
                  <label className="block text-sm font-medium mb-2">かんけい</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(
                      Object.entries(RELATIONSHIP_LABELS) as [DreamRelationship, string][]
                    )
                      .filter(([val]) => val !== "self")
                      .map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, relationship: val }))}
                          className={`py-1.5 px-2 text-xs rounded-lg border transition-colors ${
                            form.relationship === val
                              ? "border-primary bg-primary/10 text-primary font-semibold"
                              : "border-border bg-background text-foreground hover:bg-muted"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">えもじ</label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_SUGGESTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, avatar_emoji: emoji }))}
                      className={`w-9 h-9 text-lg rounded-lg transition-all ${
                        form.avatar_emoji === emoji
                          ? "bg-primary/20 ring-2 ring-primary"
                          : "bg-muted hover:bg-muted/70"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">いろ</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color }))}
                      className={`w-8 h-8 rounded-full transition-all ${
                        form.color === color
                          ? "ring-2 ring-offset-2 ring-foreground scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={color}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-muted text-muted-foreground font-bold hover:bg-muted/80 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isSaving ? "ほぞん中..." : "ほぞんする"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileCard({
  profile,
  onEdit,
  onArchive,
}: {
  profile: DreamProfile;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const isSelf = profile.relationship === "self";
  return (
    <div className="relative flex flex-col items-center gap-2 p-4 rounded-2xl border border-border/50 bg-card shadow-sm">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-3xl"
        style={{ backgroundColor: profile.color + "33" }}
      >
        {profile.avatar_emoji}
      </div>
      <p className="font-semibold text-sm text-center truncate w-full">{profile.name}</p>
      <p className="text-xs text-muted-foreground">{RELATIONSHIP_LABELS[profile.relationship]}</p>
      <div className="flex gap-2 mt-1">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          aria-label="編集"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        {!isSelf && (
          <button
            onClick={onArchive}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="アーカイブ"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
