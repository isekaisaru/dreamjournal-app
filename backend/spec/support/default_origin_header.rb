# ApplicationController#verify_request_origin!（CSRF対策のOrigin検証）を、
# 個々のrequest specがいちいち意識しなくて済むよう、既定でOriginヘッダーを送る。
# 偽装Originを検証したいテスト（csrf_origin_protection_spec.rb等）は、
# headers: { 'Origin' => '...' } を明示的に渡せば上書きできる。
module DefaultOriginHeader
  DEFAULT_ORIGIN = 'http://localhost:3000'.freeze

  %i[get post put patch delete].each do |verb|
    define_method(verb) do |path, **options|
      options[:headers] = { 'Origin' => DEFAULT_ORIGIN }.merge(options[:headers] || {})
      super(path, **options)
    end
  end
end

RSpec.configure do |config|
  config.include DefaultOriginHeader, type: :request
end
