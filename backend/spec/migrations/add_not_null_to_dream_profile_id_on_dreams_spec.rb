require 'rails_helper'
require Rails.root.join('db/migrate/20260704000000_add_not_null_to_dream_profile_id_on_dreams.rb')

RSpec.describe AddNotNullToDreamProfileIdOnDreams do
  subject(:migration) { described_class.new }

  def column_nullable?
    ActiveRecord::Base.connection.columns(:dreams).find { |c| c.name == 'dream_profile_id' }.null
  end

  context 'NOT NULL 制約が既に適用されている場合（通常の本番デプロイ後の状態）' do
    it '適用済みなら dream_profile_id は NOT NULL である' do
      expect(column_nullable?).to eq(false)
    end
  end

  context 'NULL の夢が残っている場合（想定外の混入を想定した安全策の検証）' do
    let!(:user) { create(:user) }

    before do
      # NOT NULL 制約を一時的に外し、NULLの夢を意図的に作る（テスト内トランザクションでロールバックされる）
      ActiveRecord::Base.connection.change_column_null(:dreams, :dream_profile_id, true)
      create(:dream, user: user, dream_profile_id: nil)
    end

    it 'migrationを中断し、NOT NULL化しない' do
      expect { migration.up }.to raise_error(ActiveRecord::MigrationError, /NULL.*1 件/)
      expect(column_nullable?).to eq(true)
    end
  end
end
