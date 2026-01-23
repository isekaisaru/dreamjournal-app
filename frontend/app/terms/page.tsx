import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '利用規約 | ユメログ',
  description: 'ユメログの利用規約',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8 md:p-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 text-center">
          📜 利用規約
        </h1>

        <div className="prose prose-lg max-w-none space-y-8">
          {/* はじめに */}
          <section>
            <p className="text-gray-700 leading-relaxed">
              ユメログ（以下「当サービス」）をご利用いただき、ありがとうございます。
              この利用規約（以下「本規約」）は、当サービスの使い方のルールを定めたものです。
              <strong>ご利用の前に、必ずお読みください。</strong>
            </p>
            <p className="text-sm text-gray-600 mt-4">
              <strong>最終更新日:</strong> 2026年1月24日
            </p>
          </section>

          {/* 1. 利用規約への同意 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>✅</span>
              <span>1. 利用規約への同意</span>
            </h2>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-gray-700">
                当サービスを使うことで、本規約に同意したものとみなします。
                同意できない場合は、サービスをご利用いただけません。
              </p>
            </div>
          </section>

          {/* 2. 保護者の同意（13歳未満の場合） */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>👨‍👩‍👧‍👦</span>
              <span>2. 保護者の同意（13歳未満の場合）</span>
            </h2>
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
              <p className="text-gray-700 mb-2">
                <strong>13歳未満のお子さまが当サービスを利用する場合は、保護者の方の同意が必要です。</strong>
              </p>
              <p className="text-sm text-gray-600">
                保護者の方へ: お子さまが安全に利用できるよう、一緒に設定や記録を確認してください。
              </p>
            </div>
          </section>

          {/* 3. アカウント登録 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🔑</span>
              <span>3. アカウント登録</span>
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>アカウント登録時は、以下のルールを守ってください：</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>正しいメールアドレスを登録してください</li>
                <li>パスワードは他人に教えないでください</li>
                <li>1人1アカウントが原則です（家族で共有する場合は例外）</li>
                <li>他人になりすましてアカウントを作らないでください</li>
              </ul>
            </div>
          </section>

          {/* 4. 禁止事項 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🚫</span>
              <span>4. やってはいけないこと</span>
            </h2>
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-gray-700 mb-3">以下の行為は禁止です：</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 text-sm ml-4">
                <li>他人のアカウントを勝手に使うこと</li>
                <li>暴力的・差別的・わいせつな内容を記録すること</li>
                <li>他人を傷つける内容を記録すること</li>
                <li>サービスの運営を妨害すること（攻撃、不正アクセスなど）</li>
                <li>商業目的での利用（広告、宣伝など）</li>
                <li>法律に違反する行為</li>
              </ul>
            </div>
          </section>

          {/* 5. 夢の記録について */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>📝</span>
              <span>5. 夢の記録について</span>
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>夢の記録に関するルール：</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>著作権</strong>: 記録した夢の内容の著作権は、あなたに帰属します</li>
                <li><strong>責任</strong>: 記録内容については、あなた自身が責任を持ってください</li>
                <li><strong>公開範囲</strong>: 現在は非公開（自分だけが見られる）です</li>
              </ul>
            </div>
          </section>

          {/* 6. AI分析機能について */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🤖</span>
              <span>6. AI分析機能について</span>
            </h2>
            <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
              <p className="text-gray-700 mb-2">
                当サービスのAI分析機能（モルペウス）は、夢の内容を解釈するものですが、
                <strong>医学的・心理学的な診断ではありません。</strong>
              </p>
              <p className="text-sm text-gray-600">
                ※ 心配なことがある場合は、専門家（医師、カウンセラーなど）にご相談ください。
              </p>
            </div>
          </section>

          {/* 7. サービスの変更・停止 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>⚙️</span>
              <span>7. サービスの変更・停止</span>
            </h2>
            <div className="space-y-2 text-gray-700">
              <p>当サービスは、予告なく以下を行うことがあります：</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>機能の追加・変更・削除</li>
                <li>メンテナンスによる一時停止</li>
                <li>サービスの終了</li>
              </ul>
              <p className="text-sm text-gray-600 mt-2">
                ※ サービス終了の場合は、事前にお知らせします。
              </p>
            </div>
          </section>

          {/* 8. 免責事項 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>⚠️</span>
              <span>8. 免責事項</span>
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>以下の場合、当サービスは責任を負いません：</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>サービスの利用によって生じた損害（データ消失など）</li>
                <li>第三者による不正アクセス</li>
                <li>天災、通信障害などによるサービス停止</li>
                <li>AI分析の内容に関する問題</li>
              </ul>
              <p className="text-sm text-gray-600 mt-3">
                ※ ただし、当サービスの故意または重大な過失による場合は除きます。
              </p>
            </div>
          </section>

          {/* 9. データのバックアップ */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>💾</span>
              <span>9. データのバックアップ</span>
            </h2>
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <p className="text-gray-700">
                大切な夢の記録は、定期的にバックアップすることをおすすめします。
                当サービスは、データの完全性を保証するものではありません。
              </p>
            </div>
          </section>

          {/* 10. アカウントの停止・削除 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🔒</span>
              <span>10. アカウントの停止・削除</span>
            </h2>
            <div className="space-y-2 text-gray-700">
              <p>以下の場合、アカウントを停止または削除することがあります：</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>本規約に違反した場合</li>
                <li>長期間（1年以上）ログインがない場合</li>
                <li>不正な利用が確認された場合</li>
              </ul>
            </div>
          </section>

          {/* 11. 規約の変更 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>📢</span>
              <span>11. 規約の変更</span>
            </h2>
            <div className="space-y-2 text-gray-700">
              <p>
                本規約は、サービスの改善にあわせて変更することがあります。
                変更後も継続して利用する場合は、変更後の規約に同意したものとみなします。
              </p>
            </div>
          </section>

          {/* 12. 準拠法・管轄裁判所 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>⚖️</span>
              <span>12. 準拠法・管轄裁判所</span>
            </h2>
            <div className="space-y-2 text-gray-700 text-sm">
              <p>本規約は、日本法に基づいて解釈されます。</p>
              <p>
                当サービスに関する紛争が生じた場合は、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
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
                利用規約について質問がある場合は、以下までご連絡ください：
              </p>
              <p className="text-gray-900 font-semibold">
                📧 Email: <a href="mailto:support@dreamjournal.example.com" className="text-indigo-600 hover:underline">
                  support@dreamjournal.example.com
                </a>
              </p>
              <p className="text-sm text-gray-600 mt-4">
                運営者: ユメログ開発チーム
              </p>
            </div>
          </section>
        </div>

        {/* フッターボタン */}
        <div className="mt-12 text-center">
          <a
            href="/"
            className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold px-8 py-3 rounded-full hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            ホームに戻る
          </a>
        </div>
      </div>
    </div>
  );
}
