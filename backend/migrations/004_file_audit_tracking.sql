BEGIN;

-- Add modification tracking
ALTER TABLE files
    ADD COLUMN IF NOT EXISTS modified_by UUID,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Keep modifier within the same organization
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'files_modified_by_organization_fkey'
          AND conrelid = 'files'::regclass
    ) THEN
        ALTER TABLE files
            ADD CONSTRAINT files_modified_by_organization_fkey
            FOREIGN KEY (modified_by, organization_id)
            REFERENCES users(id, organization_id)
            ON DELETE SET NULL (modified_by);
    END IF;
END;
$$;

-- Modification lookup indexes
CREATE INDEX IF NOT EXISTS idx_files_modified_by
    ON files(modified_by);

CREATE INDEX IF NOT EXISTS idx_files_updated_at
    ON files(updated_at DESC);

-- Permanent file audit history
CREATE TABLE IF NOT EXISTS file_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE RESTRICT,

    file_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,

    actor_user_id UUID,
    actor_name VARCHAR(150) NOT NULL,
    actor_email VARCHAR(255) NOT NULL,

    event_type VARCHAR(30) NOT NULL
        CHECK (
            event_type IN (
                'upload',
                'modify',
                'download',
                'delete',
                'share',
                'unshare',
                'permission_change'
            )
        ),

    target_user_id UUID,
    details JSONB NOT NULL DEFAULT '{}'::JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit indexes
CREATE INDEX IF NOT EXISTS idx_file_audit_organization
    ON file_audit_logs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_file_audit_file
    ON file_audit_logs(file_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_file_audit_actor
    ON file_audit_logs(actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_file_audit_event
    ON file_audit_logs(event_type, created_at DESC);

COMMIT;
