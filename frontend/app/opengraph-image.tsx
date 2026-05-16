import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "YumeTree | モルペウスと育てるAI夢ノート";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * OGP画像を動的に生成する
 * SNS でシェアしたときに表示される「チラシ」の役割
 */
export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0b1120 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* 星の装飾 */}
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 120,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#fde68a",
            opacity: 0.7,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 180,
            right: 200,
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#93c5fd",
            opacity: 0.6,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 120,
            left: 300,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#c4b5fd",
            opacity: 0.5,
          }}
        />

        {/* メインコンテンツ */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 64 }}>🌙</span>
          <span
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: "#38bdf8",
              letterSpacing: "-2px",
            }}
          >
            YumeTree
          </span>
          <span style={{ fontSize: 48 }}>✨</span>
        </div>

        <p
          style={{
            fontSize: 32,
            color: "#e2e8f0",
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          モルペウスと育てるAI夢ノート
        </p>

        <p
          style={{
            fontSize: 22,
            color: "#94a3b8",
            maxWidth: 700,
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          毎日の夢をAIが分析。感情タグ・検索で心の変化を可視化する
          セルフケア・家族向けAI夢ノート
        </p>

        {/* フッター */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            gap: 24,
            fontSize: 18,
            color: "#64748b",
          }}
        >
          <span>Next.js</span>
          <span>Ruby on Rails</span>
          <span>OpenAI</span>
          <span>Stripe</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
