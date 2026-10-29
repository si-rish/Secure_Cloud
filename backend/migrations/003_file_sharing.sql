BEGIN;

-- 1. Backfill organization IDs for existing files.
UPDATE files AS f
SET organization_id = u.organization_id
FROM users AS u
WHERE f.owner_id = u.id
  AND f.organization_id IS NULL;

-- 2. Ensure every file belongs to an organization.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM files
        WHERE organization_id IS NULL
    ) THEN
        RAISE EXCEPTION
            'Migration aborted: files with NULL organization_id exist';
    END IF;
END $$;

ALTER TABLE files
    ALTER COLUMN organization_id SET NOT NULL;

-- 3. Add composite unique key required by file-sharing foreign keys.
CREATE UNIQUE INDEX IF NOT EXISTS uq_files_id_organization
    ON files(id, organization_id);

-- 4. Enforce matching file-owner organization.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'files_owner_organization_fkey'
          AND conrelid = 'files'::regclass
    ) THEN
        ALTER TABLE files
            ADD CONSTRAINT files_owner_organization_fkey
            FOREIGN KEY (owner_id, organization_id)
            REFERENCES users(id, organization_id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Create organization-scoped sharing records.
CREATE TABLE IF NOT EXISTS file_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    file_id UUID NOT NULL,
    organization_id UUID NOT NULL,

    shared_with_user_id UUID NOT NULL,
    shared_by_user_id UUID NOT NULL,

    permission VARCHAR(10) NOT NULL DEFAULT 'read'
        CHECK (permission IN ('read', 'write')),

    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT file_shares_file_organization_fkey
        FOREIGN KEY (file_id, organization_id)
        REFERENCES files(id, organization_id)
        ON DELETE CASCADE,

    CONSTRAINT file_shares_recipient_organization_fkey
        FOREIGN KEY (shared_with_user_id, organization_id)
        REFERENCES users(id, organization_id)
        ON DELETE CASCADE,

    CONSTRAINT file_shares_sharer_organization_fkey
        FOREIGN KEY (shared_by_user_id, organization_id)
        REFERENCES users(id, organization_id)
        ON DELETE CASCADE
);

-- 6. Add lookup indexes.
CREATE INDEX IF NOT EXISTS idx_file_shares_recipient
    ON file_shares(shared_with_user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_file_shares_file
    ON file_shares(file_id, organization_id);

COMMIT;
