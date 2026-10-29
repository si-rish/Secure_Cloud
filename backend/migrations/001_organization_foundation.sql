BEGIN;

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_departments_organization_name UNIQUE (organization_id, name),
    CONSTRAINT uq_departments_id_organization UNIQUE (id, organization_id)
);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS organization_id UUID,
    ADD COLUMN IF NOT EXISTS department_id UUID;

-- Preserve the existing application while assigning current accounts to a tenant.
INSERT INTO organizations (name, slug)
VALUES ('Default Organization', 'default-organization')
ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE
    default_org_id UUID;
BEGIN
    SELECT id INTO default_org_id
    FROM organizations
    WHERE slug = 'default-organization';

    UPDATE users
    SET organization_id = default_org_id
    WHERE organization_id IS NULL;
END $$;

-- Add the organization foreign key only if this migration has not added it before.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_organization_id_fkey'
          AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_organization_id_fkey
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- Ensure a department belongs to the same organization as its user.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_department_organization_fkey'
          AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_department_organization_fkey
            FOREIGN KEY (department_id, organization_id)
            REFERENCES departments(id, organization_id)
            ON DELETE SET NULL (department_id);
    END IF;
END $$;

ALTER TABLE users ALTER COLUMN organization_id SET NOT NULL;

-- Extend the current role list without changing existing admin/user values.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role::text = ANY (ARRAY['user', 'admin', 'manager']::text[]));

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_users_id_organization'
          AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT uq_users_id_organization UNIQUE (id, organization_id);
    END IF;
END $$;

ALTER TABLE files
    ADD COLUMN IF NOT EXISTS organization_id UUID;

DO $$
DECLARE
    default_org_id UUID;
BEGIN
    SELECT id INTO default_org_id
    FROM organizations
    WHERE slug = 'default-organization';

    UPDATE files AS f
    SET organization_id = u.organization_id
    FROM users AS u
    WHERE f.owner_id = u.id
      AND f.organization_id IS NULL;

    -- Keep this fallback for any legacy file whose owner is unexpectedly missing.
    UPDATE files
    SET organization_id = default_org_id
    WHERE organization_id IS NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'files_organization_id_fkey'
          AND conrelid = 'files'::regclass
    ) THEN
        ALTER TABLE files
            ADD CONSTRAINT files_organization_id_fkey
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_files_organization_id ON files(organization_id);

COMMIT;
