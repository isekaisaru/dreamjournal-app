# frozen_string_literal: true

require "ipaddr"

# ============================================================
# Rack::Attack — レート制限設定
#
# 目的:
#   1. OpenAI API のコスト暴走を防ぐ（preview_analysis / analyze）
#   2. ブルートフォース攻撃を緩和（login / register）
#   3. 全体的な過負荷を防ぐ
#
# 方針:
#   - 本番環境では Rails.cache（Render 単一インスタンスでは FileStore）を使用
#   - 複数インスタンス構成にスケールする場合は Redis に切り替えること
#   - 現状は Render 無料プラン（単一インスタンス）のため FileStore で十分
# ============================================================

class Rack::Attack
  def self.throttle_ip(req)
    forwarded_for = req.get_header("HTTP_X_FORWARDED_FOR").to_s
    forwarded_for.split(",").map(&:strip).find { |ip| valid_ip?(ip) } || req.ip
  end

  def self.valid_ip?(ip)
    IPAddr.new(ip)
    true
  rescue IPAddr::InvalidAddressError
    false
  end

  # ----------------------------------------------------------
  # 1. 全 API: 1 IP あたり 1分 60 リクエスト
  # ----------------------------------------------------------
  throttle("req/ip", limit: 60, period: 1.minute) do |req|
    throttle_ip(req)
  end

  # ----------------------------------------------------------
  # 2. AI 分析（preview_analysis）: 認証ユーザー 1時間 10回
  #    → OpenAI API コストの主な発生源
  # ----------------------------------------------------------
  throttle("ai_analysis/user", limit: 10, period: 1.hour) do |req|
    if req.path == "/dreams/preview_analysis" && req.post?
      # Cookie から access_token を取得してユーザー識別
      # トークンのデコードはコストが低いため throttle 判定に使用可能
      token = req.cookies["access_token"]
      if token
        decoded = AuthService.decode_token(token) rescue nil
        decoded&.dig("user_id")&.to_s
      end
    end
  end

  # ----------------------------------------------------------
  # 3. 夢の分析（analyze）: 認証ユーザー 1時間 10回
  # ----------------------------------------------------------
  throttle("dream_analyze/user", limit: 10, period: 1.hour) do |req|
    if req.path.match?(%r{^/dreams/\d+/analyze$}) && req.post?
      token = req.cookies["access_token"]
      if token
        decoded = AuthService.decode_token(token) rescue nil
        decoded&.dig("user_id")&.to_s
      end
    end
  end

  # ----------------------------------------------------------
  # 4. 音声分析: 認証ユーザー 1時間 5回
  #    → Whisper + GPT の二重課金のため厳しめ
  # ----------------------------------------------------------
  throttle("audio_analysis/user", limit: 5, period: 1.hour) do |req|
    if req.path == "/analyze_audio_dream" && req.post?
      token = req.cookies["access_token"]
      if token
        decoded = AuthService.decode_token(token) rescue nil
        decoded&.dig("user_id")&.to_s
      end
    end
  end

  # ----------------------------------------------------------
  # 5. ログイン: 1 IP あたり 15分 5回
  #    → ブルートフォース対策
  # ----------------------------------------------------------
  throttle("login/ip", limit: 5, period: 15.minutes) do |req|
    throttle_ip(req) if req.path == "/auth/login" && req.post?
  end

  # ----------------------------------------------------------
  # 6. ユーザー登録: 1 IP あたり 1時間 5回
  #    → 大量アカウント作成防止
  # ----------------------------------------------------------
  throttle("register/ip", limit: 5, period: 1.hour) do |req|
    throttle_ip(req) if req.path == "/auth/register" && req.post?
  end

  # ----------------------------------------------------------
  # 7. トライアルログイン: 1 IP あたり 1時間 10回
  # ----------------------------------------------------------
  throttle("trial/ip", limit: 10, period: 1.hour) do |req|
    throttle_ip(req) if req.path == "/auth/trial_login" && req.post?
  end

  # ----------------------------------------------------------
  # 8. パスワードリセット: 1 IP あたり 1時間 3回
  # ----------------------------------------------------------
  throttle("password_reset/ip", limit: 3, period: 1.hour) do |req|
    throttle_ip(req) if req.path == "/password_resets" && req.post?
  end

  # ----------------------------------------------------------
  # レスポンス: 429 Too Many Requests
  # ----------------------------------------------------------
  self.throttled_responder = lambda do |request|
    match_data = request.env["rack.attack.match_data"] || {}
    retry_after = (match_data[:period] || 60).to_i

    headers = {
      "Content-Type" => "application/json",
      "Retry-After" => retry_after.to_s
    }

    body = {
      error: "リクエストが多すぎます。しばらく待ってからもう一度お試しください。",
      retry_after: retry_after
    }.to_json

    [429, headers, [body]]
  end
end
