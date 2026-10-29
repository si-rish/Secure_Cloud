BEGIN;

DO $$
DECLARE
    default_org_id UUID;
BEGIN
    SELECT id INTO default_org_id
    FROM organizations
    WHERE slug = 'default-organization';

    IF default_org_id IS NULL THEN
        RAISE EXCEPTION 'Default organization does not exist';
    END IF;

    EXECUTE format(
        'ALTER TABLE users ALTER COLUMN organization_id SET DEFAULT %L::uuid',
        default_org_id
    );
END $$;

COMMIT;
