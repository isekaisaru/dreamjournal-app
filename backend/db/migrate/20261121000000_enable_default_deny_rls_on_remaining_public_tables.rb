# frozen_string_literal: true

# public schema に残っていた RLS 無しの表すべてに、policy なしの RLS（Default Deny）をかける。
#
# 【背景】
# これまでは Supabase Security Advisor の rls_disabled_in_public 警告が出るたびに、
# 新しい表を1つずつ Default Deny にしてきた（payments, dream_profiles, checkout_attempts など7表）。
# 古くからある users / dreams などは RLS が無いまま残っていた。
# Supabase は 2026-10-30 から新しい表を Data API に自動公開しなくなったが、
# それより前からある表は anon / authenticated への grant を保つ。
# そのため、RLS が無いと anon キーで Data API から読み書きできうる。
#
# 【設計方針】
# 既存の7表と同じく、Rails API だけが DB に接続する前提で policy は追加しない。
# schema_migrations / ar_internal_metadata も Data API から書き換えられると
# migration の記録が壊れるため、同じく閉じる。
#
# 【影響範囲】
# Rails は表の owner で、BYPASSRLS 権限も持つ postgres ロールで接続するため、
# FORCE ROW LEVEL SECURITY を付けない限り、これまでどおり全行を読み書きできる。
# 念のため、接続ロールが superuser / BYPASSRLS / 全対象表の owner のどれでもなければ、
# RLS を有効にする前に例外で止める（アプリが DB を読めなくなる事故を防ぐ）。
class EnableDefaultDenyRlsOnRemainingPublicTables < ActiveRecord::Migration[8.1]
  TABLES = %w[
    active_storage_attachments
    active_storage_blobs
    active_storage_variant_records
    ar_internal_metadata
    dream_emotions
    dreams
    emotions
    schema_migrations
    subscriptions
    users
  ].freeze

  def up
    verify_connection_role_can_bypass_rls!

    TABLES.each do |table_name|
      execute "ALTER TABLE public.#{quote_table_name(table_name)} ENABLE ROW LEVEL SECURITY;"
    end
  end

  def down
    TABLES.each do |table_name|
      execute "ALTER TABLE public.#{quote_table_name(table_name)} DISABLE ROW LEVEL SECURITY;"
    end
  end

  private

  def verify_connection_role_can_bypass_rls!
    blocked_tables = select_values(<<~SQL)
      SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_roles r ON r.rolname = current_user
       WHERE n.nspname = 'public'
         AND c.relname IN (#{TABLES.map { |name| connection.quote(name) }.join(', ')})
         AND NOT (r.rolsuper OR r.rolbypassrls OR c.relowner = r.oid)
    SQL

    return if blocked_tables.empty?

    raise ActiveRecord::MigrationError,
      "RLS would block the Rails database role for: #{blocked_tables.sort.join(', ')}"
  end
end
