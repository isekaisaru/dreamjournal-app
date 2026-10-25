# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Default-deny RLS', type: :model do
  EXPECTED_TABLES = %w[
    active_storage_attachments
    active_storage_blobs
    active_storage_variant_records
    ai_usage_logs
    checkout_attempts
    dream_emotions
    dream_image_generations
    dream_profiles
    dreams
    emotions
    payments
    processed_webhook_events
    subscriptions
    user_sessions
    users
  ].freeze

  let(:connection) { ActiveRecord::Base.connection }

  before(:context) do
    connection = ActiveRecord::Base.connection
    database_name = connection.select_value('SELECT current_database()')
    unless Rails.env.test? && database_name.match?(/test/i)
      raise "RLS isolation spec refused non-test database: #{database_name}"
    end

    %w[anon authenticated].each do |role_name|
      role_exists = connection.select_value(
        "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = #{connection.quote(role_name)})"
      )
      unless role_exists
        connection.execute("CREATE ROLE #{connection.quote_table_name(role_name)} NOLOGIN")
        (@roles_created_by_spec ||= []) << role_name
        connection.execute("GRANT USAGE ON SCHEMA public TO #{connection.quote_table_name(role_name)}")
        connection.execute(
          "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO #{connection.quote_table_name(role_name)}"
        )
        connection.execute(
          "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO #{connection.quote_table_name(role_name)}"
        )
      end
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

  it 'enables non-forced RLS without policies on every Data API-facing table' do
    rows = connection.exec_query(<<~SQL).to_a.index_by { |row| row.fetch('table_name') }
      SELECT c.relname AS table_name,
             c.relrowsecurity AS rls_enabled,
             c.relforcerowsecurity AS force_rls,
             COUNT(p.polname)::integer AS policy_count
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_policy p ON p.polrelid = c.oid
       WHERE n.nspname = 'public'
         AND c.relname IN (#{EXPECTED_TABLES.map { |name| connection.quote(name) }.join(', ')})
       GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity
    SQL

    aggregate_failures do
      EXPECTED_TABLES.each do |table_name|
        state = rows.fetch(table_name)
        expect(state.fetch('rls_enabled')).to be(true), table_name
        expect(state.fetch('force_rls')).to be(false), table_name
        expect(state.fetch('policy_count')).to eq(0), table_name
      end
    end
  end

  it 'allows the Rails connection role to keep accessing protected tables' do
    role_state = connection.exec_query(<<~SQL).first
      SELECT r.rolsuper,
             r.rolbypassrls,
             bool_and(c.relowner = r.oid) AS owns_all
        FROM pg_roles r
        CROSS JOIN pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE r.rolname = current_user
         AND n.nspname = 'public'
         AND c.relname IN (#{EXPECTED_TABLES.map { |name| connection.quote(name) }.join(', ')})
       GROUP BY r.rolsuper, r.rolbypassrls
    SQL

    expect(
      role_state.fetch('rolsuper') || role_state.fetch('rolbypassrls') || role_state.fetch('owns_all')
    ).to be(true)
  end

  %w[anon authenticated].each do |role_name|
    it "returns no user rows and rejects writes for the #{role_name} Data API role" do
      user = create(:user)

      expect {
        connection.transaction(requires_new: true) do
          connection.execute("SET LOCAL ROLE #{connection.quote_table_name(role_name)}")
          expect(connection.select_value('SELECT COUNT(*) FROM public.users').to_i).to eq(0)
          connection.execute(<<~SQL)
            INSERT INTO public.users (email, username, password_digest, created_at, updated_at)
            VALUES ('blocked@example.invalid', 'blocked', 'not-a-real-digest', NOW(), NOW())
          SQL
        end
      }.to raise_error(ActiveRecord::StatementInvalid, /row-level security policy/)

      expect(User.find_by(id: user.id)).to be_present
    end
  end
end
