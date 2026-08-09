require 'rails_helper'

# Codexレビュー(#414 P2)対応の回帰確認。
# レガシー refresh token（users.refresh_token）は使い捨てのはずだが、
# 素朴な find→update だと並列リクエストが両方とも nullify 前に同じユーザーを
# 読んでしまい、1本のトークンから複数セッションが生成されてしまう。
#
# 実スレッドでの競合再現は Ruby の GVL とローカルDBの高速な往復のせいで
# ウィンドウが狭すぎて安定的に踏めない（検証済み: 素朴実装に戻しても
# 単純なスレッド+バリアでは3回中3回とも競合が再現しなかった）。
# そのため、find_by が返った直後・with_lock に入る前に「別リクエストが
# 先に消費した」状態を確定的に作り出し、ロック後の再読込チェックが
# 効いていることを直接検証する。
RSpec.describe AuthService, type: :service do
  describe '.consume_legacy_refresh_token' do
    let(:legacy_token) { SecureRandom.urlsafe_base64(64) }
    let!(:user) { create(:user) }

    before { user.update_column(:refresh_token, legacy_token) }

    it '通常時は消費に成功し、トークンをnullifyしてユーザーを返す' do
      consumed = AuthService.consume_legacy_refresh_token(legacy_token)

      expect(consumed).to eq(user)
      expect(user.reload.refresh_token).to be_nil
    end

    it '存在しないトークンは InvalidRefreshTokenError' do
      expect {
        AuthService.consume_legacy_refresh_token('bogus-token')
      }.to raise_error(AuthService::InvalidRefreshTokenError)
    end

    it '2回目の消費は失敗する（同一トークンの使い回し不可）' do
      AuthService.consume_legacy_refresh_token(legacy_token)

      expect {
        AuthService.consume_legacy_refresh_token(legacy_token)
      }.to raise_error(AuthService::InvalidRefreshTokenError)
    end

    context 'find_by 直後・with_lock に入る前に、別リクエストが先に消費していた場合' do
      before do
        # find_by が user オブジェクトを返した「直後」に割り込み、
        # 実DBの行を別トランザクションが既に nullify 済みの状態にする。
        # with_lock の再読込チェックがなければ、ここで二重に消費されてしまう。
        allow(User).to receive(:find_by).with(refresh_token: legacy_token).and_wrap_original do |original, *args|
          result = original.call(*args)
          User.where(id: result.id).update_all(refresh_token: nil) if result
          result
        end
      end

      it '不一致を検知して InvalidRefreshTokenError になり、update_column を呼ばない' do
        expect {
          AuthService.consume_legacy_refresh_token(legacy_token)
        }.to raise_error(AuthService::InvalidRefreshTokenError)
      end

      it 'セッションを作らない（refresh_token 経由で呼んだ場合も二重発行されない）' do
        expect {
          begin
            AuthService.refresh_token(legacy_token)
          rescue AuthService::InvalidRefreshTokenError
            nil
          end
        }.not_to change(UserSession, :count)
      end
    end
  end
end
