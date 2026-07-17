import MorpheusImage from "@/app/components/MorpheusImage";

type AuthVisualPanelProps = {
  variant: "login" | "register";
};

const COPY: Record<AuthVisualPanelProps["variant"], string> = {
  login: "また来てくれたんだね。今日はどんな夢を見たのか、聞かせてくれるかな？",
  register: "はじめまして。ぼくはモルペウス。きみの夢を一緒に記録していくよ。",
};

/**
 * ログイン/登録ページの右側（lg+のみ）に表示する夜空＋モルペウスの装飾パネル。
 * 認証ロジックには一切関与しない純粋な見た目のコンポーネント。
 */
export default function AuthVisualPanel({ variant }: AuthVisualPanelProps) {
  return (
    <div
      aria-hidden="true"
      className="relative hidden flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-sky-950 px-10 lg:flex"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-75"
        style={{
          backgroundImage:
            "radial-gradient(2px 2px at 16% 20%, #fde68a, transparent), radial-gradient(1.6px 1.6px at 80% 26%, #fff, transparent), radial-gradient(1.6px 1.6px at 60% 14%, #c7d2fe, transparent), radial-gradient(2px 2px at 30% 68%, #fff, transparent)",
        }}
      />
      <div className="relative mb-6 h-52 w-52 animate-morpheus-float">
        <div className="absolute inset-1 rounded-full bg-amber-300/25 blur-3xl animate-moon-pulse" />
        <MorpheusImage
          variant="login"
          size={208}
          className="relative drop-shadow-[0_20px_40px_rgba(99,102,241,0.5)]"
        />
      </div>
      <p className="relative max-w-xs rounded-2xl bg-white/92 px-5 py-4 text-center text-sm font-semibold leading-relaxed text-slate-800">
        {COPY[variant]}
      </p>
    </div>
  );
}
