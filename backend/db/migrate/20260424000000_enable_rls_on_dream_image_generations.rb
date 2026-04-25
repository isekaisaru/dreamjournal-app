# frozen_string_literal: true

# Supabase セキュリティアドバイザーの RLS 警告を解消するマイグレーション
#
# 【背景】
# public.dream_image_generations テーブルに RLS が有効化されておらず、
# Supabase PostgREST 経由で誰でもデータを読み書きできる状態だった。
#
# 【設計方針】
# このアプリは Rails API のみが DB に接続する設計のため、
# PostgREST（Supabase の直接接続口）からのアクセスは全遮断が正しい。
# RLS を有効化し、ポリシーを追加しないことで「デフォルト拒否（Default Deny）」を実現。
#
class EnableRlsOnDreamImageGenerations < ActiveRecord::Migration[7.2]
  def up
    # RLS を有効化（ポリシーなし＝全行を拒否 = Default Deny）
    execute "ALTER TABLE public.dream_image_generations ENABLE ROW LEVEL SECURITY;"

    # Rails サービスアカウントは BYPASSRLS 権限を持つため引き続き全アクセス可能
    # Supabase PostgREST / anon ロールからのアクセスは遮断される
  end

  def down
    execute "ALTER TABLE public.dream_image_generations DISABLE ROW LEVEL SECURITY;"
  end
end
