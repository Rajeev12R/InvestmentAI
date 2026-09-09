-- server/infrastructure/migrations/001_init.sql

CREATE TABLE IF NOT EXISTS kv_records (
    collection TEXT NOT NULL,
    record_key TEXT NOT NULL,
    value JSONB NOT NULL,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (collection, record_key),

    CONSTRAINT kv_records_version_positive
        CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_kv_records_collection
    ON kv_records (collection);

CREATE INDEX IF NOT EXISTS idx_kv_records_updated_at
    ON kv_records (updated_at);

CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY,
    organization_id TEXT,
    workspace_id TEXT,
    actor_id TEXT,
    actor_type TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    result TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_hash TEXT NOT NULL,
    previous_event_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_events_workspace_time
    ON audit_events (
        workspace_id,
        occurred_at
    );

CREATE INDEX IF NOT EXISTS idx_audit_events_resource
    ON audit_events (
        resource_type,
        resource_id
    );

CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_events_hash
    ON audit_events (event_hash);

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT jobs_attempts_valid
        CHECK (attempts >= 0),

    CONSTRAINT jobs_max_attempts_valid
        CHECK (max_attempts >= 1)
);

CREATE INDEX IF NOT EXISTS idx_jobs_claimable
    ON jobs (
        status,
        available_at
    );

CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);