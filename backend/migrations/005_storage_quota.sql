BEGIN;

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS storage_quota_bytes BIGINT
NOT NULL DEFAULT 1073741824
CHECK (storage_quota_bytes > 0);

COMMIT;