# frozen_string_literal: true

# Supabase セキュリティアドバイザーの RLS 警告を解消するマイグレーション
#
# 【背景】
# public.payments と public.processed_webhook_events の両テーブルに
# Supabase PostgREST 経由の直接アクセスを遮断する RLS を有効化する。
#
# 【設計方針】
# このアプリは Rails API のみが DB に接続する設計のため、
# PostgREST（Supabase の直接接続口）からのアクセスは全遮断が正しい。
# RLS を有効化し、ポリシーを追加しないことで「デフォルト拒否（Default Deny）」を実現。
#
class EnableRlsOnPaymentTables < ActiveRecord::Migration[7.1]
  def up
    # RLS を有効化（ポリシーなし＝全行を拒否 = Default Deny）
    execute "ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;"
    execute "ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;"

    # Rails サービスアカウントは BYPASSRLS 権限を持つため引き続き全アクセス可能
    # Supabase PostgREST / anon ロールからのアクセスは遮断される
  end

  def down
    execute "ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;"
    execute "ALTER TABLE public.processed_webhook_events DISABLE ROW LEVEL SECURITY;"
  end
end
