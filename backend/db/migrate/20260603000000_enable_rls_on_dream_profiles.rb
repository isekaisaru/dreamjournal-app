# frozen_string_literal: true

# Supabase セキュリティアドバイザーの RLS 警告を解消するマイグレーション
#
# 【背景】
# public.dream_profiles テーブルに RLS が有効化されておらず、
# Supabase Security Advisor に警告が出ていた。
#
# 【設計方針】
# このアプリは Rails API のみが DB に接続する設計のため、
# PostgREST（Supabase の直接接続口）からのアクセスは全遮断が正しい。
# RLS を有効化し、ポリシーを追加しないことで「デフォルト拒否（Default Deny）」を実現。
#
# 【影響範囲】
# Rails は postgres ロール（スーパーユーザー / BYPASSRLS 権限あり）で接続するため
# RLS 有効化後も既存処理（プロフィール一覧・作成・編集・アーカイブ）に影響なし。
# フロントエンドから Supabase への直接アクセスはないため anon / authenticated ロール用
# ポリシーの追加は不要。
#
# 【注意】
# schema.rb（Ruby形式）は RLS 設定を記録しない。
# このmigrationでバージョン管理する。
class EnableRlsOnDreamProfiles < ActiveRecord::Migration[7.1]
  def up
    # RLS を有効化（ポリシーなし = 全行を拒否 = Default Deny）
    execute "ALTER TABLE public.dream_profiles ENABLE ROW LEVEL SECURITY;"

    # Rails サービスアカウントは BYPASSRLS 権限を持つため引き続き全アクセス可能
    # Supabase PostgREST / anon ロールからのアクセスは遮断される
  end

  def down
    execute "ALTER TABLE public.dream_profiles DISABLE ROW LEVEL SECURITY;"
  end
end
