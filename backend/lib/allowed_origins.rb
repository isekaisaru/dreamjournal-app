# CORS(cors.rb)とCSRF由来のOrigin検証(ApplicationController#verify_request_origin!)の
# 両方が、同じ「許可オリジン一覧」を参照する必要があるため、一箇所にまとめている。
module AllowedOrigins
  def self.list
    ENV.fetch("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8000")
       .split(",")
       .map(&:strip)
       .reject(&:empty?)
  end
end
