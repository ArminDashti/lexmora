ALTER TABLE app_settings
  DROP CONSTRAINT IF EXISTS app_settings_api_provider_check;

ALTER TABLE app_settings
  DROP COLUMN IF EXISTS api_provider,
  DROP COLUMN IF EXISTS gemini_api_key;
