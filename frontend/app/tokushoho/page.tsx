import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 | YumeTree",
  description: "YumeTree（ユメツリー）の特定商取引法に基づく表記",
};

const DISCLOSE_ON_REQUEST = "請求があった場合には遅滞なく開示いたします。";

type Row = { label: string; value: ReactNode };

function ContactEmail() {
  if (!SUPPORT_EMAIL) {
    return <span>準備中</span>;
  }
  return (
    <a href={`mailto:${SUPPORT_EMAIL}`} className="text-indigo-600 hover:underline break-all">
      {SUPPORT_EMAIL}
    </a>
  );
}

const ROWS: Row[] = [
  { label: "販売事業者", value: DISCLOSE_ON_REQUEST },
  { label: "運営責任者", value: DISCLOSE_ON_REQUEST },
  { label: "所在地", value: DISCLOSE_ON_REQUEST },
  { label: "電話番号", value: DISCLOSE_ON_REQUEST },
  {
    label: "メールアドレス",
    value: (
      <>
        <ContactEmail />
        <span className="block text-sm text-gray-600 mt-1">
          販売事業者の情報の開示のご請求や、お支払い・解約についてのお問い合わせは、こちらのメールで受け付けます。
        </span>
      </>
    ),
  },
  { label: "サービス名", value: "YumeTree（ユメツリー）プレミアムプラン" },
  {
    label: "販売価格",
    value: (
      <>
        <span className="block">プレミアムプラン：月額590円（税込）</span>
        <span className="block">開発の応援（任意）：1回500円（税込）</span>
        <span className="block text-sm text-gray-600 mt-1">
          開発の応援は任意の1回払いで、プレミアムプランの機能は付きません。
        </span>
      </>
    ),
  },
  {
    label: "商品代金以外の必要料金",
    value: "インターネットに接続するための通信料は、お客様のご負担となります。",
  },
  { label: "支払方法", value: "クレジットカード（Stripe による決済）" },
  {
    label: "支払時期",
    value:
      "プレミアムプランは、お申し込み時に初回分をお支払いいただき、以降は毎月の更新日に自動でお支払いいただきます。開発の応援は、お申し込み時に1回のみお支払いいただきます。",
  },
  {
    label: "サービスの提供時期",
    value: "決済が完了した後、すぐにご利用いただけます。",
  },
  {
    label: "解約について",
    value:
      "設定ページの「サブスクリプションを管理する」から、いつでも解約できます（Stripe のお客様用ページに移動します）。解約すると、次回以降の請求は発生しません。",
  },
  {
    label: "返品・返金について",
    value:
      "デジタルサービスの性質上、お支払い済みの料金は原則として返金いたしません。サービスの不具合などでご利用いただけなかった場合は、メールでご相談ください。",
  },
  {
    label: "動作環境",
    value: "インターネットに接続できるパソコン・スマートフォンの、最新のブラウザでご利用ください。",
  },
];

export default function TokushohoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-12">
        <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-8 text-center">
          特定商取引法に基づく表記
        </h1>

        <dl className="divide-y divide-gray-200 border-y border-gray-200">
          {ROWS.map((row) => (
            <div key={row.label} className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="font-semibold text-gray-900">{row.label}</dt>
              <dd className="mt-1 text-gray-700 leading-relaxed sm:col-span-2 sm:mt-0">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-12 flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/terms" className="text-indigo-600 hover:underline">
            利用規約
          </Link>
          <Link href="/privacy" className="text-indigo-600 hover:underline">
            プライバシーポリシー
          </Link>
          <Link href="/" className="text-indigo-600 hover:underline">
            トップページへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
