if Rails.env.test?
  Rails.application.config.hosts = []
end