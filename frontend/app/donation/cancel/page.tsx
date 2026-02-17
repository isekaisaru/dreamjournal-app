"use client";

import Link from "next/link";

export default function DonationCancelPage() {
  return (
    <div className="cancel-container">
      <div className="cancel-card">
        <div className="icon">😌</div>
        <h1>キャンセルされました</h1>
        <p>決済がキャンセルされました。</p>
        <p className="sub-text">
          また気が向いたら、応援していただけると嬉しいです。
        </p>
        <Link href="/" className="home-link">
          ホームに戻る
        </Link>
      </div>

      <style jsx>{`
        .cancel-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #718096 0%, #4a5568 100%);
          padding: 2rem;
        }

        .cancel-card {
          background: white;
          border-radius: 16px;
          padding: 3rem;
          max-width: 500px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        h1 {
          color: #2d3748;
          font-size: 2rem;
          margin-bottom: 1rem;
        }

        p {
          color: #4a5568;
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
        }

        .sub-text {
          font-size: 0.9rem;
          color: #718096;
          margin-bottom: 2rem;
        }

        .home-link {
          display: inline-block;
          background: #4a5568;
          color: white;
          padding: 0.75rem 2rem;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
          transition: all 0.3s ease;
        }

        .home-link:hover {
          background: #2d3748;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}
