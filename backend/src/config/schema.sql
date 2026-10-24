CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    original_name VARCHAR(255) NOT NULL,

    storage_key TEXT NOT NULL UNIQUE,

    mime_type VARCHAR(150),

    size_bytes BIGINT NOT NULL
        CHECK (size_bytes >= 0),

    checksum VARCHAR(128),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_owner_id
    ON files(owner_id);

CREATE INDEX IF NOT EXISTS idx_files_created_at
    ON files(created_at DESC);

    -- Store idempotency records for POST requests
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    idempotency_key VARCHAR(255) NOT NULL,

    request_hash VARCHAR(64) NOT NULL,

    response_status INTEGER,
    response_body JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_idempotency_owner_key
        UNIQUE (owner_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at
    ON idempotency_keys(created_at);