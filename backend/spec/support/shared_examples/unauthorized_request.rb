RSpec.shared_examples 'unauthorized request' do |method, path, params = {}|
  it '401エラーを返す' do
    headers = { 'HOST' => 'backend' }
    # GET/DELETE 以外のリクエストでは Content-Type を設定
    headers['Content-Type'] = 'application/json' if %i[post put patch].include?(method)

    send(method, path, params: params.to_json, headers: headers)
    expect(response).to have_http_status(:unauthorized)
  end
end
