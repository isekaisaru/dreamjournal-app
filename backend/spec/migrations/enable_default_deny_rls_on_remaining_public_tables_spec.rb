# frozen_string_literal: true

require 'rails_helper'
require Rails.root.join('db/migrate/20261121000000_enable_default_deny_rls_on_remaining_public_tables.rb')

# structure.sql は migration 適用後の状態なので、down で一度外してから up を直接呼ぶ。
# どちらも例のトランザクションの中で行い、終わったら元に戻る。
RSpec.describe EnableDefaultDenyRlsOnRemainingPublicTables do
  RLS_MIGRATION_SPEC_PROBE_ROLE = 'rls_guard_probe'

  let(:connection) { ActiveRecord::Base.connection }
  let(:migration) { described_class.new }

  def rls_enabled?(table_name)
    connection.select_value(<<~SQL)
      SELECT c.relrowsecurity
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = #{connection.quote(table_name)}
    SQL
  end

  before(:context) do
    connection = ActiveRecord::Base.connection
    @probe_role_created = !connection.select_value(
      "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = #{connection.quote(RLS_MIGRATION_SPEC_PROBE_ROLE)})"
    )
    # superuser でも BYPASSRLS でも表の owner でもない、ふつうのロール
    connection.execute("CREATE ROLE #{connection.quote_table_name(RLS_MIGRATION_SPEC_PROBE_ROLE)} NOLOGIN") if @probe_role_created
  end

  after(:context) do
    connection = ActiveRecord::Base.connection
    connection.execute('RESET ROLE')
    connection.execute("DROP ROLE #{connection.quote_table_name(RLS_MIGRATION_SPEC_PROBE_ROLE)}") if @probe_role_created
  end

  it 'down で対象の表だけ RLS を外し、up でまた有効にする' do
    ActiveRecord::Migration.suppress_messages { migration.migrate(:down) }
    expect(described_class::TABLES.map { |name| rls_enabled?(name) }).to all(be(false))
    # 以前の migration で有効にした表には触れない
    expect(rls_enabled?('payments')).to be(true)

    ActiveRecord::Migration.suppress_messages { migration.migrate(:up) }
    expect(described_class::TABLES.map { |name| rls_enabled?(name) }).to all(be(true))
  end

  it '接続ロールが RLS を通り抜けられないときは、有効にする前に止まる' do
    ActiveRecord::Migration.suppress_messages { migration.migrate(:down) }

    expect {
      connection.transaction(requires_new: true) do
        connection.execute("SET LOCAL ROLE #{connection.quote_table_name(RLS_MIGRATION_SPEC_PROBE_ROLE)}")
        ActiveRecord::Migration.suppress_messages { migration.migrate(:up) }
      end
    }.to raise_error(ActiveRecord::MigrationError, /RLS would block the Rails database role for: .*users/)

    # 1つも有効にしていない（アプリが DB を読めなくなる事故を起こさない）
    expect(described_class::TABLES.map { |name| rls_enabled?(name) }).to all(be(false))
  end
end
