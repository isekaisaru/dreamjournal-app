# frozen_string_literal: true

class EnableDefaultDenyRlsOnRemainingPublicTables < ActiveRecord::Migration[7.2]
  TABLES = %w[
    active_storage_attachments
    active_storage_blobs
    active_storage_variant_records
    dream_emotions
    dreams
    emotions
    subscriptions
    users
  ].freeze

  def up
    verify_connection_role_can_bypass_rls!

    TABLES.each do |table_name|
      execute "ALTER TABLE public.#{quote_table_name(table_name)} ENABLE ROW LEVEL SECURITY;"
    end
  end

  def down
    TABLES.each do |table_name|
      execute "ALTER TABLE public.#{quote_table_name(table_name)} DISABLE ROW LEVEL SECURITY;"
    end
  end

  private

  # Default-deny RLS intentionally has no policies. Before enabling it, fail closed
  # unless the same connection role can continue accessing every target table as a
  # superuser, BYPASSRLS role, or table owner. This prevents a migration from
  # silently taking the Rails API offline when DATABASE_URL uses a restricted role.
  def verify_connection_role_can_bypass_rls!
    inaccessible_tables = select_values(<<~SQL)
      SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_roles role_state ON role_state.rolname = current_user
       WHERE n.nspname = 'public'
         AND c.relname IN (#{TABLES.map { |name| connection.quote(name) }.join(', ')})
         AND NOT (
           role_state.rolsuper
           OR role_state.rolbypassrls
           OR c.relowner = role_state.oid
         )
    SQL

    return if inaccessible_tables.empty?

    raise ActiveRecord::MigrationError,
      "RLS would block the Rails database role for: #{inaccessible_tables.sort.join(', ')}"
  end
end
