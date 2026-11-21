# frozen_string_literal: true

# public schema のうち、リポジトリに RLS の記録が無かった表すべてに、policy なしの RLS（Default Deny）をかける。
#
# 【背景】
# これまでは Supabase Security Advisor の rls_disabled_in_public 警告が出るたびに、
# 新しい表を1つずつ migration で Default Deny にしてきた（payments, dream_profiles, checkout_attempts など7表）。
# 古くからある users / dreams などは migration と structure.sql に記録が無かった。
# 2026-11-22 に本番を読むだけで確かめたところ、本番ではこれらにもすでに RLS が有効だった
# （記録の無い手作業と思われる）。この migration は本番の状態を変えず、記録を本番にそろえる。
# 新しく作る環境（CI・手元）でも同じ状態になり、付け忘れはテストと CI が止める。
#
# なお Supabase は 2026-10-30 から新しい表を Data API に自動公開しなくなったが、
# それより前からある表は anon / authenticated への grant を保つ。
# RLS が無いと anon キーで Data API から読み書きできうるため、RLS を外してはいけない。
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
    verify_target_tables_exist!
    verify_connection_role_can_bypass_rls!

    # すでに有効な表（本番ではすべて）には ALTER をかけない。
    # ENABLE は有効な表にかけても状態は変わらないが、ACCESS EXCLUSIVE ロックを取り、
    # migration の終わりまで持ち続けるため、本番の読み書きを止めうる。
    tables_to_enable = tables_without_rls
    return if tables_to_enable.empty?

    # 長いトランザクションの後ろで待つと後続の読み書きが詰まるため、待ちすぎたら失敗させ、再実行で対応する。
    execute "SET LOCAL lock_timeout = '3s'"
    tables_to_enable.each do |table_name|
      execute "ALTER TABLE public.#{quote_table_name(table_name)} ENABLE ROW LEVEL SECURITY;"
    end
  end

  # 本番ではこの migration の前から RLS が有効だったため、down で外すと適用前より弱くなる。
  # 戻す必要が出ても RLS は外さない。
  def down
    raise ActiveRecord::IrreversibleMigration,
      'RLS was already enabled in production before this migration; disabling it would expose tables to the Data API'
  end

  private

  # 表が無いのに「適用済み」と記録しないよう、想定と違うスキーマでは止める。
  def verify_target_tables_exist!
    existing_tables = select_values(<<~SQL)
      SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relname IN (#{TABLES.map { |name| connection.quote(name) }.join(', ')})
    SQL
    missing_tables = TABLES - existing_tables
    return if missing_tables.empty?

    raise ActiveRecord::MigrationError, "Expected tables not found: #{missing_tables.sort.join(', ')}"
  end

  def tables_without_rls
    select_values(<<~SQL)
      SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relname IN (#{TABLES.map { |name| connection.quote(name) }.join(', ')})
         AND NOT c.relrowsecurity
       ORDER BY c.relname
    SQL
  end

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
