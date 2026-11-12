# frozen_string_literal: true

# Standard-library-only test: no Rails, database, Docker or network access.
require 'yaml'
require 'tmpdir'
require 'fileutils'
require 'open3'
require 'shellwords'

workflow_path = File.expand_path('../../../.github/workflows/backend-docker-security.yml', __dir__)
workflow = YAML.load_file(workflow_path)
steps = workflow.fetch('jobs').fetch('build-and-check').fetch('steps')
check = steps.select { |step| step['name'] == 'Verify secret files are absent from image' }
raise 'Expected exactly one image verification step' unless check.length == 1

# Extract the actual workflow body; do not duplicate the four checks in the test.
command = check.first.fetch('run')
match = command.match(/\Adocker run --rm --entrypoint sh yumetree-backend-secret-check -c '\n(.*?)\n\s*'\s*\z/m)
raise 'Unexpected image verification command' unless match
script = match[1]
paths = %w[.env config/master.key config/credentials/production.key private.pem]
checked_paths = script.scan(/^\s*test ! -e \/app\/(\S+)\s*$/).flatten
raise 'Verification targets changed' unless checked_paths == paths

Dir.mktmpdir('yumetree-secret-exclusion-') do |root|
  # Only /app paths are remapped. The shell options and checks are unchanged.
  local_script = script.gsub('/app/', "#{Shellwords.escape(root)}/")
  env = { 'PATH' => '/usr/bin:/bin' }
  _, syntax_error, syntax_status = Open3.capture3(env, '/bin/sh', '-n', '-c', local_script,
                                               unsetenv_others: true)
  raise 'Verification shell syntax failed' unless syntax_status.success? && syntax_error.empty?

  ([nil] + paths).each do |path|
    if path
      target = File.join(root, path)
      FileUtils.mkdir_p(File.dirname(target))
      File.write(target, "non-secret-sentinel\n")
    end

    stdout, stderr, status = Open3.capture3(
      env, '/bin/sh', '-c', "printf 'CHECK_STARTED\\n'\n#{local_script}",
      unsetenv_others: true
    )
    # A launch/syntax error, signal or unexpected diagnostic is not detection.
    expected_rc = path ? 1 : 0
    expected_output = "CHECK_STARTED\n"
    unless status.exited? && status.exitstatus == expected_rc && stderr.empty? && stdout == expected_output
      raise "FAIL #{path || 'no-secret-files'}: expected normal shell exit #{expected_rc}"
    end
    puts "PASS #{path || 'no-secret-files'} (exit #{expected_rc})"
    File.unlink(target) if path
  end
end
