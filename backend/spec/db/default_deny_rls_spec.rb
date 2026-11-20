# frozen_string_literal: true

require 'rails_helper'

# Supabase の Data API（anon / authenticated ロール）から public の表を読み書きできないことを確かめる。
# 新しい表を足したときに RLS を付け忘れると、最初の例が落ちる。
RSpec.describe 'Default-deny RLS on public tables', type: :model do
  RLS_SPEC_DATA_API_ROLES = %w[anon authenticated].freeze

  let(:connection) { ActiveRecord::Base.connection }

  before(:context) do
    connection = ActiveRecord::Base.connection
    database_name = connection.select_value('SELECT current_database()')
    unless Rails.env.test? && database_name.match?(/test/i)
      raise "RLS spec refused non-test database: #{database_name}"
    end

    @roles_created_by_spec = []
    # anon / authenticated がもともとある DB（Supabase のローカル環境など）では、ロールを作らず
    # 権限もそのまま使う。CI の新しい PostgreSQL にはロールが無いので、ここで作る。
    RLS_SPEC_DATA_API_ROLES.each do |role_name|
      next if connection.select_value(
        "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = #{connection.quote(role_name)})"
      )

      # Supabase の既存の表と同じく、Data API のロールに表の権限がある状態を作る。
      quoted_role = connection.quote_table_name(role_name)
      connection.execute("CREATE ROLE #{quoted_role} NOLOGIN")
      @roles_created_by_spec << role_name
      connection.execute("GRANT USAGE ON SCHEMA public TO #{quoted_role}")
      connection.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO #{quoted_role}")
      connection.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO #{quoted_role}")
    end
  end

  after(:context) do
    connection = ActiveRecord::Base.connection
    connection.execute('RESET ROLE')

    Array(@roles_created_by_spec).each do |role_name|
      quoted_role = connection.quote_table_name(role_name)
      connection.execute("REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM #{quoted_role}")
      connection.execute("REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM #{quoted_role}")
      connection.execute("REVOKE USAGE ON SCHEMA public FROM #{quoted_role}")
      connection.execute("DROP ROLE #{quoted_role}")
    end
  end

  it 'enables non-forced RLS without policies on every public table' do
    states = connection.exec_query(<<~SQL).to_a
      SELECT c.relname AS table_name,
             c.relrowsecurity AS rls_enabled,
             c.relforcerowsecurity AS force_rls,
             COUNT(p.polname)::integer AS policy_count
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_policy p ON p.polrelid = c.oid
       WHERE n.nspname = 'public'
         AND c.relkind IN ('r', 'p')
       GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity
       ORDER BY c.relname
    SQL

    # 0件で素通りしないよう、主要な表が対象に入っていることも確かめる。
    expect(states.map { |row| row.fetch('table_name') }).to include('users', 'dreams', 'schema_migrations', 'payments')

    aggregate_failures do
      states.each do |state|
        table_name = state.fetch('table_name')
        expect(state.fetch('rls_enabled')).to be(true), "#{table_name}: RLS is disabled"
        expect(state.fetch('force_rls')).to be(false), "#{table_name}: FORCE RLS would block Rails"
        expect(state.fetch('policy_count')).to eq(0), "#{table_name}: has policies"
      end
    end
  end

  it 'lets the Rails connection role bypass RLS on every public table' do
    role_state = connection.exec_query(<<~SQL).first
      SELECT r.rolsuper,
             r.rolbypassrls,
             bool_and(c.relowner = r.oid) AS owns_all
        FROM pg_roles r
        CROSS JOIN pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE r.rolname = current_user
         AND n.nspname = 'public'
         AND c.relkind IN ('r', 'p')
       GROUP BY r.rolsuper, r.rolbypassrls
    SQL

    expect(
      role_state.fetch('rolsuper') || role_state.fetch('rolbypassrls') || role_state.fetch('owns_all')
    ).to be(true)
  end

  RLS_SPEC_DATA_API_ROLES.each do |role_name|
    it "hides rows and rejects writes for the #{role_name} Data API role" do
      user = create(:user)
      dream = create(:dream, user: user)

      expect {
        connection.transaction(requires_new: true) do
          connection.execute("SET LOCAL ROLE #{connection.quote_table_name(role_name)}")
          expect(connection.select_value('SELECT COUNT(*) FROM public.users').to_i).to eq(0)
          expect(connection.select_value('SELECT COUNT(*) FROM public.dreams').to_i).to eq(0)
          connection.execute(<<~SQL)
            INSERT INTO public.users (email, username, password_digest, created_at, updated_at)
            VALUES ('blocked@example.invalid', 'blocked', 'not-a-real-digest', NOW(), NOW())
          SQL
        end
      }.to raise_error(ActiveRecord::StatementInvalid, /row-level security policy/)

      # Rails の接続からは、これまでどおり読める
      expect(User.find_by(id: user.id)).to be_present
      expect(Dream.find_by(id: dream.id)).to be_present
    end
  end
end
