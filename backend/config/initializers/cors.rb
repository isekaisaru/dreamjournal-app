# cors.rb は、バックエンドさんのお家の「セキュリティ設定ファイル」です

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # 「お知らせ掲示板」に書いてあるお友達の住所を、門番に渡す
    # （ApplicationController#verify_request_origin! と同じ一覧を共有している）
    origins(*AllowedOrigins.list)

    # どのリソース（URL）に対して、どのHTTPメソッドを許可するかなどを設定します
    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true # Cookieを利用した認証に必須です
  end
end
