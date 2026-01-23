import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー | ユメログ",
  description: "ユメログのプライバシーポリシー（個人情報保護方針）",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8 md:p-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 text-center">
          🛡️ プライバシーポリシー
        </h1>

        <div className="prose prose-lg max-w-none space-y-8">
          {/* はじめに */}
          <section>
            <p className="text-gray-700 leading-relaxed">
              ユメログ（以下「当サービス」）は、みなさまの大切な夢の記録を安全に守ります。
              このページでは、どんな情報を集めて、どのように使うかを、わかりやすく説明します。
            </p>
            <p className="text-sm text-gray-600 mt-4">
              <strong>最終更新日:</strong> 2026年1月24日
            </p>
          </section>

          {/* 1. 収集する情報 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>📝</span>
              <span>1. あつめる情報</span>
            </h2>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <h3 className="font-semibold text-gray-900 mb-2">
                当サービスで集める情報：
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>
                  <strong>メールアドレス</strong>: ログインするために使います
                </li>
                <li>
                  <strong>パスワード</strong>: 安全に暗号化して保存します
                </li>
                <li>
                  <strong>夢の記録</strong>:
                  タイトル、内容、感情タグ、記録した日時
                </li>
                <li>
                  <strong>利用状況</strong>:
                  いつログインしたか、どのページを見たかなど
                </li>
              </ul>
            </div>
          </section>

          {/* 2. 情報の利用目的 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🎯</span>
              <span>2. 情報の使いみち</span>
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>あつめた情報は、以下の目的でのみ使います：</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>ログイン機能の提供（本人確認）</li>
                <li>夢の記録・検索・分析機能の提供</li>
                <li>サービスの改善（エラー検知、使いやすさの向上）</li>
                <li>お問い合わせへの対応</li>
              </ul>
            </div>
          </section>

          {/* 3. 第三者への提供 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🔐</span>
              <span>3. 他の人に情報を渡すことはありますか？</span>
            </h2>
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <p className="font-semibold text-gray-900 mb-2">
                ✅ 基本的に、みなさまの情報を他の人に渡すことはありません。
              </p>
              <p className="text-gray-700 text-sm">
                ただし、以下の場合は例外です：
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm mt-2 ml-4">
                <li>法律で決められている場合（警察からの要請など）</li>
                <li>みなさまの同意がある場合</li>
              </ul>
            </div>
          </section>

          {/* 4. 外部サービスの利用 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🔌</span>
              <span>4. 使っている外部サービス</span>
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>当サービスは、以下の外部サービスを使っています：</p>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">🤖 OpenAI API</h4>
                  <p className="text-sm">
                    夢の分析機能で使用。夢の内容を送信しますが、OpenAIは学習には使いません。
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">📊 Sentry</h4>
                  <p className="text-sm">
                    エラー監視で使用。エラー発生時の情報のみを送信します。
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">🗄️ Supabase</h4>
                  <p className="text-sm">
                    データベースサービス。すべてのデータを安全に保存します。
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">☁️ Vercel / Render</h4>
                  <p className="text-sm">
                    サーバーサービス。アプリの動作に必要です。
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 5. セキュリティ対策 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🛡️</span>
              <span>5. 安全対策</span>
            </h2>
            <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
              <p className="text-gray-700 mb-2">
                みなさまの情報を守るために、以下の対策をしています：
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 text-sm ml-4">
                <li>
                  <strong>パスワードの暗号化</strong>:
                  パスワードは誰にも見えない形で保存
                </li>
                <li>
                  <strong>通信の暗号化</strong>: HTTPS（鍵マーク🔒）で安全に通信
                </li>
                <li>
                  <strong>データベースの保護</strong>:
                  許可された人だけがアクセス可能
                </li>
                <li>
                  <strong>エラー監視</strong>: 24時間体制で問題を検知
                </li>
              </ul>
            </div>
          </section>

          {/* 6. お子さまの利用について */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>👨‍👩‍👧‍👦</span>
              <span>6. お子さまの利用について</span>
            </h2>
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
              <p className="text-gray-700">
                当サービスは家族みんなで使えるように作られています。
                <strong>
                  13歳未満のお子さまが使う場合は、保護者の方の同意が必要です。
                </strong>
              </p>
              <p className="text-sm text-gray-600 mt-2">
                ※ 保護者の方へ:
                お子さまの夢の記録は、お子さまの心の成長を見守るためのものです。
                安心してご利用ください。
              </p>
            </div>
          </section>

          {/* 7. データの保存期間 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>⏰</span>
              <span>7. データの保存期間</span>
            </h2>
            <div className="space-y-2 text-gray-700">
              <p>みなさまの情報は、以下の期間保存します：</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  <strong>夢の記録</strong>: アカウント削除まで永久保存
                </li>
                <li>
                  <strong>ログイン情報</strong>: アカウント削除まで保存
                </li>
                <li>
                  <strong>エラーログ</strong>: 最大90日間
                </li>
              </ul>
            </div>
          </section>

          {/* 8. アカウント削除 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🗑️</span>
              <span>8. アカウントの削除</span>
            </h2>
            <div className="space-y-2 text-gray-700">
              <p>
                アカウントを削除したい場合は、設定ページから削除できます。
                削除すると、すべての夢の記録も消えます（元に戻せません）。
              </p>
              <p className="text-sm text-gray-600 mt-2">
                ※
                お子さまの誤操作を防ぐため、削除には「ジュニアロック」がかかっています。
              </p>
            </div>
          </section>

          {/* 9. Cookie（クッキー）について */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🍪</span>
              <span>9. Cookie（クッキー）について</span>
            </h2>
            <div className="space-y-2 text-gray-700">
              <p>
                当サービスは、ログイン状態を保つために「Cookie」という技術を使います。
                これは、ブラウザに小さなメモを残しておく仕組みです。
              </p>
              <p className="text-sm text-gray-600">
                ※ Cookieを無効にすると、ログインできなくなります。
              </p>
            </div>
          </section>

          {/* 10. プライバシーポリシーの変更 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>📢</span>
              <span>10. このページの変更について</span>
            </h2>
            <div className="space-y-2 text-gray-700">
              <p>
                このプライバシーポリシーは、サービスの改善にあわせて変更することがあります。
                変更した場合は、このページでお知らせします。
              </p>
            </div>
          </section>

          {/* お問い合わせ */}
          <section className="border-t-2 border-gray-200 pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>✉️</span>
              <span>お問い合わせ</span>
            </h2>
            <div className="bg-indigo-50 p-6 rounded-lg">
              <p className="text-gray-700 mb-2">
                プライバシーポリシーについて質問がある場合は、以下までご連絡ください：
              </p>
              <p className="text-gray-900 font-semibold">
                📧 Email:{" "}
                <Link
                  href="mailto:support@dreamjournal.example.com"
                  className="text-indigo-600 hover:underline"
                >
                  support@dreamjournal.example.com
                </Link>
              </p>
              <p className="text-sm text-gray-600 mt-4">
                運営者: ユメログ開発チーム
              </p>
            </div>
          </section>
        </div>

        {/* フッターボタン */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold px-8 py-3 rounded-full hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
