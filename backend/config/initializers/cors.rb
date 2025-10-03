# cors.rb は、バックエンドさんのお家の「セキュリティ設定ファイル」です

# 環境変数から許可するオリジン（お友達の住所）のリストを作る
allow_origins = ENV.fetch("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8000").split(",").map(&:strip).reject(&:empty?)

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # 「お知らせ掲示板」に書いてあるお友達の住所を、門番に渡す
    origins(*allow_origins)

    # どのリソース（URL）に対して、どのHTTPメソッドを許可するかなどを設定します
    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true # Cookieを利用した認証に必須です
  end
end
