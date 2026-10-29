# SecureCloud database migrations

## Migration 001 — organization foundation

`001_organization_foundation.sql` adds `organizations` and `departments`, associates existing users and files with a `Default Organization`, and allows the `manager` role in addition to the existing `admin` and `user` roles.

**Do not run this migration until you have a PostgreSQL backup and have reviewed the current working tree.** It is a foundation migration, not the complete authorization implementation. The backend still needs to be updated to assign `organization_id` when creating files and to scope all file operations by the authenticated user's organization. `files.organization_id` is therefore intentionally nullable for compatibility with the current file repository until that code change is applied.

Example backup command (run from a machine with `pg_dump` configured for the database):

```powershell
pg_dump -h localhost -p 5432 -U securecloud_user -d securecloud -Fc -f securecloud-before-org-migration.dump
```

Apply the migration only after confirming the backup exists:

```powershell
psql -h localhost -p 5432 -U securecloud_user -d securecloud -v ON_ERROR_STOP=1 -f backend/migrations/001_organization_foundation.sql
```

Afterward, verify with:

```sql
\dt
\d users
\d departments
\d files
SELECT id, name, slug FROM organizations;
SELECT role, COUNT(*) FROM users GROUP BY role;
SELECT COUNT(*) AS users_without_org FROM users WHERE organization_id IS NULL;
SELECT COUNT(*) AS files_without_org FROM files WHERE organization_id IS NULL;
```
