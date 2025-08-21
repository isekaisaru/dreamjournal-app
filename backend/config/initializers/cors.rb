# cors.rb は、バックエンドさんのお家の「セキュリティ設定ファイル」です

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # 許可するお家の住所（オリジン）をここに書きます
    # 開発環境のフロントエンドのURLを許可します
    origins 'http://localhost:3000', 'http://localhost:8000'

    # どのリソース（URL）に対して、どのHTTPメソッドを許可するかなどを設定します
    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true # Cookieを利用した認証に必須です
      # expose: ['Set-Cookie'] # この行はCORSエラーの原因となるため削除します。Set-Cookieはブラウザが自動で処理するため、公開する必要はありません。
  end
end
