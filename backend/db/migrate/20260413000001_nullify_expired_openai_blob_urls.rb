class NullifyExpiredOpenaiBlobUrls < ActiveRecord::Migration[7.1]
  def up
    # OpenAI Blob URLs (oaidalleapiprodscus.blob.core.windows.net) expire ~60 minutes
    # after generation. Dreams saved with these URLs show 403 errors for users.
    # Setting to NULL lets users regenerate the image using gpt-image-1 which now
    # returns a persistent base64 data URL instead.
    affected = execute(<<~SQL)
      UPDATE dreams
      SET generated_image_url = NULL
      WHERE generated_image_url LIKE 'https://oaidalleapiprodscus.blob.core.windows.net/%'
    SQL
    Rails.logger.info "[NullifyExpiredOpenaiBlobUrls] Cleared #{affected.cmd_tuples} expired Blob URL(s)"
  end

  def down
    # Intentionally irreversible: we cannot restore the expired URLs.
    raise ActiveRecord::IrreversibleMigration
  end
end
