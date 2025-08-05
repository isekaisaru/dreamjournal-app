# cors.rb は、バックエンドさんのお家の「セキュリティ設定ファイル」です

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # 許可するお家の住所（オリジン）をここに書きます
    origins 'http://localhost:3000', 'http://localhost:8000', 'http://frontend:3000'

    # どのリソース（URL）に対して、どのHTTPメソッドを許可するかなどを設定します
    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true # Cookieを利用した認証に必須
  end
end
