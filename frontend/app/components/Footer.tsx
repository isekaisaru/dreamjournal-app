import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 text-white py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          {/* About Section */}
          <div>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <span>🌙</span>
              <span>ユメログについて</span>
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              家族みんなで使える、夢の記録アプリ。
              モルペウスと一緒に、夢の世界を探検しよう！
            </p>
          </div>

          {/* Links Section */}
          <div>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <span>📚</span>
              <span>リンク</span>
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/privacy"
                  className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center gap-1"
                >
                  <span>🛡️</span>
                  <span>プライバシーポリシー</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center gap-1"
                >
                  <span>📜</span>
                  <span>利用規約</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Section */}
          <div>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <span>✉️</span>
              <span>お問い合わせ</span>
            </h3>
            <p className="text-sm text-gray-300">
              ご質問・ご要望は
              <br />
              GitHub Issues からどうぞ。
            </p>
            <a
              href="https://github.com/isekaisaru/dreamjournal-app/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-300 hover:text-indigo-200 transition-colors duration-200 mt-2 inline-block"
            >
              GitHub Issues →
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              © {currentYear} ユメログ (DreamJournal). All rights reserved.
            </p>
            <p className="text-xs text-gray-500">Made with ❤️ for families</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
