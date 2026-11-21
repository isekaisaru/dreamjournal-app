# frozen_string_literal: true

require 'rails_helper'
require Rails.root.join('db/migrate/20261121000000_enable_default_deny_rls_on_remaining_public_tables.rb')

# structure.sql は migration 適用後の状態なので、必要な例では SQL で一度 RLS を外してから up を直接呼ぶ。
# どれも例のトランザクションの中で行い、終わったら元に戻る。
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

  def disable_rls_on_target_tables!
    described_class::TABLES.each do |table_name|
      connection.execute("ALTER TABLE public.#{connection.quote_table_name(table_name)} DISABLE ROW LEVEL SECURITY")
    end
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

  def security_snapshot
    connection.exec_query(<<~SQL).to_a
      SELECT c.relname,
             c.relrowsecurity,
             c.relforcerowsecurity,
             c.relacl::text AS acl,
             (SELECT COUNT(*) FROM pg_policy p WHERE p.polrelid = c.oid)::integer AS policy_count
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
       ORDER BY c.relname
    SQL
  end

  it 'up で RLS の無い対象の表だけに有効化をかける' do
    disable_rls_on_target_tables!
    expect(described_class::TABLES.map { |name| rls_enabled?(name) }).to all(be(false))

    allow(connection).to receive(:execute).and_call_original
    expect(connection).to receive(:execute)
      .with(/ENABLE ROW LEVEL SECURITY/)
      .exactly(described_class::TABLES.size).times
      .and_call_original

    ActiveRecord::Migration.suppress_messages { migration.migrate(:up) }

    expect(described_class::TABLES.map { |name| rls_enabled?(name) }).to all(be(true))
  end

  it 'すでに RLS が有効な表（本番の状態）には ALTER もかけず、状態を何も変えない' do
    before_snapshot = security_snapshot
    expect(described_class::TABLES.map { |name| rls_enabled?(name) }).to all(be(true))

    # 有効な表に ALTER をかけると、状態は変わらなくても ACCESS EXCLUSIVE ロックを取ってしまう
    allow(connection).to receive(:execute).and_call_original
    expect(connection).not_to receive(:execute).with(/ALTER TABLE/)

    expect {
      ActiveRecord::Migration.suppress_messages { migration.migrate(:up) }
    }.not_to raise_error

    # RLS・FORCE・grant（ACL）・policy の数が、前後で1つも変わっていない
    expect(security_snapshot).to eq(before_snapshot)
  end

  it 'down は RLS を外さずに止まる（本番では適用前から有効だったため）' do
    expect {
      ActiveRecord::Migration.suppress_messages { migration.migrate(:down) }
    }.to raise_error(ActiveRecord::IrreversibleMigration)

    expect(described_class::TABLES.map { |name| rls_enabled?(name) }).to all(be(true))
  end

  it '接続ロールが RLS を通り抜けられないときは、有効にする前に止まる' do
    disable_rls_on_target_tables!

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
