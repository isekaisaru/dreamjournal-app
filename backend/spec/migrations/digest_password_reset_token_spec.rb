require 'rails_helper'
require Rails.root.join('db/migrate/20260711000000_digest_password_reset_token.rb')

# Codexレビュー(P2)対応の回帰確認。
# 現在のschema.rbは既にこのmigration適用後の状態（reset_password_token_digest
# のみ存在）になっているため、「migration実行前の状態」（平文カラムがあり、
# digestカラムが無い）をテスト内で一時的に再現してから、このmigrationの
# upを直接呼び出す。
RSpec.describe DigestPasswordResetToken do
  around do |example|
    conn = ActiveRecord::Base.connection
    conn.remove_column(:users, :reset_password_token_digest)
    conn.add_column(:users, :reset_password_token, :string)
    User.reset_column_information
    example.run
  ensure
    User.reset_column_information
  end

  it '発行から60分以内の有効なリセットトークンをdigestへバックフィルしてから平文カラムを削除する' do
    user = create(:user)
    raw_token = SecureRandom.urlsafe_base64(32)
    conn = ActiveRecord::Base.connection
    conn.execute(
      "UPDATE users SET reset_password_token = #{conn.quote(raw_token)}, " \
      "reset_password_sent_at = NOW() WHERE id = #{user.id}"
    )

    described_class.new.up
    User.reset_column_information

    # 平文カラムは削除されている
    expect(conn.column_exists?(:users, :reset_password_token)).to be false
    # バックフィルされたdigestで、元のトークンのまま引ける
    # （＝デプロイ直前に発行された有効なリンクがmigration後も使える）
    expect(User.find_by_password_reset_token(raw_token)).to eq(user)
  end

  it 'トークンが無いユーザーはdigestもnilのまま（バックフィル対象外）' do
    user = create(:user)

    described_class.new.up
    User.reset_column_information

    expect(user.reload.reset_password_token_digest).to be_nil
  end

  it '複数ユーザーの有効なトークンをそれぞれ正しくバックフィルする' do
    user_a = create(:user)
    user_b = create(:user)
    token_a = SecureRandom.urlsafe_base64(32)
    token_b = SecureRandom.urlsafe_base64(32)
    conn = ActiveRecord::Base.connection
    conn.execute(
      "UPDATE users SET reset_password_token = #{conn.quote(token_a)}, reset_password_sent_at = NOW() " \
      "WHERE id = #{user_a.id}"
    )
    conn.execute(
      "UPDATE users SET reset_password_token = #{conn.quote(token_b)}, reset_password_sent_at = NOW() " \
      "WHERE id = #{user_b.id}"
    )

    described_class.new.up
    User.reset_column_information

    expect(User.find_by_password_reset_token(token_a)).to eq(user_a)
    expect(User.find_by_password_reset_token(token_b)).to eq(user_b)
  end
end
