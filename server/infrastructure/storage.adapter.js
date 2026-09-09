// server/infrastructure/storage.adapter.js

import crypto from "crypto";

const clone = (value) => {
    if (value === undefined || value === null) return value;
    return JSON.parse(JSON.stringify(value));
};

export class StorageConcurrencyError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = "StorageConcurrencyError";
        this.code = "STORAGE_CONCURRENCY_CONFLICT";
        this.details = details;
    }
}

export class StorageAdapter {
    async connect() {
        return true;
    }

    async close() {
        return true;
    }

    async get(_collection, _key) {
        throw new Error("StorageAdapter.get() not implemented");
    }

    async set(_collection, _key, _value, _options = {}) {
        throw new Error("StorageAdapter.set() not implemented");
    }

    async delete(_collection, _key, _options = {}) {
        throw new Error("StorageAdapter.delete() not implemented");
    }

    async list(_collection, _filter = {}) {
        throw new Error("StorageAdapter.list() not implemented");
    }

    async transaction(_callback) {
        throw new Error("StorageAdapter.transaction() not implemented");
    }

    async health() {
        return {
            status: "UNKNOWN",
            adapter: this.constructor.name
        };
    }
}

export class MemoryStorageAdapter extends StorageAdapter {
    constructor() {
        super();
        this.store = new Map();
        this.versions = new Map();
    }

    _id(collection, key) {
        return `${collection}:${key}`;
    }

    async get(collection, key) {
        const id = this._id(collection, key);

        if (!this.store.has(id)) {
            return null;
        }

        return {
            value: clone(this.store.get(id)),
            version: this.versions.get(id) || 1
        };
    }

    async set(collection, key, value, options = {}) {
        const id = this._id(collection, key);
        const currentVersion = this.versions.get(id) || 0;

        if (
            options.expectedVersion !== undefined &&
            options.expectedVersion !== currentVersion
        ) {
            throw new StorageConcurrencyError(
                `Version conflict for ${collection}/${key}`,
                {
                    collection,
                    key,
                    expectedVersion: options.expectedVersion,
                    actualVersion: currentVersion
                }
            );
        }

        const nextVersion = currentVersion + 1;

        this.store.set(id, clone(value));
        this.versions.set(id, nextVersion);

        return {
            key,
            version: nextVersion
        };
    }

    async delete(collection, key, options = {}) {
        const id = this._id(collection, key);
        const currentVersion = this.versions.get(id) || 0;

        if (
            options.expectedVersion !== undefined &&
            options.expectedVersion !== currentVersion
        ) {
            throw new StorageConcurrencyError(
                `Version conflict for ${collection}/${key}`,
                {
                    collection,
                    key,
                    expectedVersion: options.expectedVersion,
                    actualVersion: currentVersion
                }
            );
        }

        const existed = this.store.delete(id);
        this.versions.delete(id);

        return {
            deleted: existed
        };
    }

    async list(collection, filter = {}) {
        const prefix = `${collection}:`;
        const results = [];

        for (const [id, value] of this.store.entries()) {
            if (!id.startsWith(prefix)) continue;

            const key = id.slice(prefix.length);

            const record = {
                key,
                value: clone(value),
                version: this.versions.get(id) || 1
            };

            if (typeof filter.predicate === "function") {
                if (!filter.predicate(record)) continue;
            }

            results.push(record);
        }

        return results;
    }

    async transaction(callback) {
        const workingStore = new Map(this.store);
        const workingVersions = new Map(this.versions);

        const tx = {
            get: async (collection, key) => {
                const id = this._id(collection, key);

                if (!workingStore.has(id)) {
                    return null;
                }

                return {
                    value: clone(workingStore.get(id)),
                    version: workingVersions.get(id) || 1
                };
            },

            set: async (collection, key, value, options = {}) => {
                const id = this._id(collection, key);
                const currentVersion = workingVersions.get(id) || 0;

                if (
                    options.expectedVersion !== undefined &&
                    options.expectedVersion !== currentVersion
                ) {
                    throw new StorageConcurrencyError(
                        `Version conflict for ${collection}/${key}`,
                        {
                            collection,
                            key,
                            expectedVersion: options.expectedVersion,
                            actualVersion: currentVersion
                        }
                    );
                }

                const nextVersion = currentVersion + 1;

                workingStore.set(id, clone(value));
                workingVersions.set(id, nextVersion);

                return {
                    key,
                    version: nextVersion
                };
            },

            delete: async (collection, key, options = {}) => {
                const id = this._id(collection, key);
                const currentVersion = workingVersions.get(id) || 0;

                if (
                    options.expectedVersion !== undefined &&
                    options.expectedVersion !== currentVersion
                ) {
                    throw new StorageConcurrencyError(
                        `Version conflict for ${collection}/${key}`,
                        {
                            collection,
                            key,
                            expectedVersion: options.expectedVersion,
                            actualVersion: currentVersion
                        }
                    );
                }

                const deleted = workingStore.delete(id);
                workingVersions.delete(id);

                return { deleted };
            },

            list: async (collection, filter = {}) => {
                const prefix = `${collection}:`;
                const results = [];

                for (const [id, value] of workingStore.entries()) {
                    if (!id.startsWith(prefix)) continue;

                    const key = id.slice(prefix.length);

                    const record = {
                        key,
                        value: clone(value),
                        version: workingVersions.get(id) || 1
                    };

                    if (
                        typeof filter.predicate === "function" &&
                        !filter.predicate(record)
                    ) {
                        continue;
                    }

                    results.push(record);
                }

                return results;
            }
        };

        const result = await callback(tx);

        this.store = workingStore;
        this.versions = workingVersions;

        return result;
    }

    async health() {
        return {
            status: "UP",
            adapter: "memory",
            records: this.store.size
        };
    }
}

export class FileStorageAdapter extends StorageAdapter {
    constructor({ filePath }) {
        super();

        if (!filePath) {
            throw new Error("filePath is required for FileStorageAdapter");
        }

        this.filePath = filePath;
        this.loaded = false;
        this.store = new Map();
        this.versions = new Map();
        this.writeQueue = Promise.resolve();
    }

    async connect() {
        if (this.loaded) return true;

        const fs = await import("fs/promises");
        const path = await import("path");

        await fs.mkdir(path.dirname(this.filePath), {
            recursive: true
        });

        try {
            const raw = await fs.readFile(this.filePath, "utf8");
            const parsed = JSON.parse(raw);

            for (const record of parsed.records || []) {
                this.store.set(record.id, record.value);
                this.versions.set(record.id, record.version || 1);
            }
        } catch (error) {
            if (error.code !== "ENOENT") {
                throw error;
            }

            await this._persist();
        }

        this.loaded = true;
        return true;
    }

    _id(collection, key) {
        return `${collection}:${key}`;
    }

    async _persist() {
        const fs = await import("fs/promises");
        const path = await import("path");

        const payload = {
            schemaVersion: 1,
            updatedAt: new Date().toISOString(),
            records: [...this.store.entries()].map(([id, value]) => ({
                id,
                value,
                version: this.versions.get(id) || 1
            }))
        };

        const directory = path.dirname(this.filePath);
        await fs.mkdir(directory, { recursive: true });

        const temporaryPath =
            `${this.filePath}.${crypto.randomUUID()}.tmp`;

        await fs.writeFile(
            temporaryPath,
            JSON.stringify(payload, null, 2),
            "utf8"
        );

        await fs.rename(temporaryPath, this.filePath);
    }

    async _queuedPersist() {
        this.writeQueue = this.writeQueue.then(() => this._persist());
        return this.writeQueue;
    }

    async get(collection, key) {
        await this.connect();

        const id = this._id(collection, key);

        if (!this.store.has(id)) {
            return null;
        }

        return {
            value: clone(this.store.get(id)),
            version: this.versions.get(id) || 1
        };
    }

    async set(collection, key, value, options = {}) {
        await this.connect();

        const id = this._id(collection, key);
        const currentVersion = this.versions.get(id) || 0;

        if (
            options.expectedVersion !== undefined &&
            options.expectedVersion !== currentVersion
        ) {
            throw new StorageConcurrencyError(
                `Version conflict for ${collection}/${key}`,
                {
                    collection,
                    key,
                    expectedVersion: options.expectedVersion,
                    actualVersion: currentVersion
                }
            );
        }

        const nextVersion = currentVersion + 1;

        this.store.set(id, clone(value));
        this.versions.set(id, nextVersion);

        await this._queuedPersist();

        return {
            key,
            version: nextVersion
        };
    }

    async delete(collection, key, options = {}) {
        await this.connect();

        const id = this._id(collection, key);
        const currentVersion = this.versions.get(id) || 0;

        if (
            options.expectedVersion !== undefined &&
            options.expectedVersion !== currentVersion
        ) {
            throw new StorageConcurrencyError(
                `Version conflict for ${collection}/${key}`,
                {
                    collection,
                    key,
                    expectedVersion: options.expectedVersion,
                    actualVersion: currentVersion
                }
            );
        }

        const deleted = this.store.delete(id);
        this.versions.delete(id);

        await this._queuedPersist();

        return {
            deleted
        };
    }

    async list(collection, filter = {}) {
        await this.connect();

        const prefix = `${collection}:`;
        const results = [];

        for (const [id, value] of this.store.entries()) {
            if (!id.startsWith(prefix)) continue;

            const key = id.slice(prefix.length);

            const record = {
                key,
                value: clone(value),
                version: this.versions.get(id) || 1
            };

            if (
                typeof filter.predicate === "function" &&
                !filter.predicate(record)
            ) {
                continue;
            }

            results.push(record);
        }

        return results;
    }

    async transaction(callback) {
        await this.connect();

        const originalStore = this.store;
        const originalVersions = this.versions;

        this.store = new Map(originalStore);
        this.versions = new Map(originalVersions);

        try {
            const tx = {
                get: this.get.bind(this),
                set: this.set.bind(this),
                delete: this.delete.bind(this),
                list: this.list.bind(this)
            };

            const result = await callback(tx);

            await this._queuedPersist();

            return result;
        } catch (error) {
            this.store = originalStore;
            this.versions = originalVersions;
            throw error;
        }
    }

    async close() {
        await this.writeQueue;
        return true;
    }

    async health() {
        await this.connect();

        return {
            status: "UP",
            adapter: "file",
            filePath: this.filePath,
            records: this.store.size
        };
    }
}

export class PostgresStorageAdapter extends StorageAdapter {
    constructor({
        connectionString,
        ssl = false,
        poolConfig = {}
    } = {}) {
        super();

        if (!connectionString) {
            throw new Error(
                "DATABASE_URL is required for PostgresStorageAdapter"
            );
        }

        this.connectionString = connectionString;
        this.ssl = ssl;
        this.poolConfig = poolConfig;
        this.pool = null;
    }

    async connect() {
        if (this.pool) return true;

        let pg;

        try {
            pg = await import("pg");
        } catch {
            throw new Error(
                "PostgresStorageAdapter requires the 'pg' package"
            );
        }

        const Pool = pg.default?.Pool || pg.Pool;

        this.pool = new Pool({
            connectionString: this.connectionString,
            ssl: this.ssl ? { rejectUnauthorized: false } : undefined,
            ...this.poolConfig
        });

        await this.pool.query("SELECT 1");

        return true;
    }

    async close() {
        if (!this.pool) return true;

        await this.pool.end();
        this.pool = null;

        return true;
    }

    async get(collection, key) {
        await this.connect();

        const result = await this.pool.query(
            `
            SELECT value, version
            FROM kv_records
            WHERE collection = $1
              AND record_key = $2
            `,
            [collection, key]
        );

        if (result.rowCount === 0) {
            return null;
        }

        return {
            value: result.rows[0].value,
            version: Number(result.rows[0].version)
        };
    }

    async set(collection, key, value, options = {}) {
        await this.connect();

        const serialized = JSON.stringify(value);

        if (options.expectedVersion !== undefined) {
            const result = await this.pool.query(
                `
                UPDATE kv_records
                SET value = $3::jsonb,
                    version = version + 1,
                    updated_at = NOW()
                WHERE collection = $1
                  AND record_key = $2
                  AND version = $4
                RETURNING version
                `,
                [
                    collection,
                    key,
                    serialized,
                    options.expectedVersion
                ]
            );

            if (result.rowCount === 0) {
                const existing = await this.get(collection, key);

                throw new StorageConcurrencyError(
                    `Version conflict for ${collection}/${key}`,
                    {
                        collection,
                        key,
                        expectedVersion: options.expectedVersion,
                        actualVersion: existing?.version || 0
                    }
                );
            }

            return {
                key,
                version: Number(result.rows[0].version)
            };
        }

        const result = await this.pool.query(
            `
            INSERT INTO kv_records (
                collection,
                record_key,
                value,
                version
            )
            VALUES ($1, $2, $3::jsonb, 1)
            ON CONFLICT (collection, record_key)
            DO UPDATE SET
                value = EXCLUDED.value,
                version = kv_records.version + 1,
                updated_at = NOW()
            RETURNING version
            `,
            [
                collection,
                key,
                serialized
            ]
        );

        return {
            key,
            version: Number(result.rows[0].version)
        };
    }

    async delete(collection, key, options = {}) {
        await this.connect();

        if (options.expectedVersion !== undefined) {
            const result = await this.pool.query(
                `
                DELETE FROM kv_records
                WHERE collection = $1
                  AND record_key = $2
                  AND version = $3
                RETURNING record_key
                `,
                [
                    collection,
                    key,
                    options.expectedVersion
                ]
            );

            if (result.rowCount === 0) {
                const existing = await this.get(collection, key);

                throw new StorageConcurrencyError(
                    `Version conflict for ${collection}/${key}`,
                    {
                        collection,
                        key,
                        expectedVersion: options.expectedVersion,
                        actualVersion: existing?.version || 0
                    }
                );
            }

            return {
                deleted: true
            };
        }

        const result = await this.pool.query(
            `
            DELETE FROM kv_records
            WHERE collection = $1
              AND record_key = $2
            RETURNING record_key
            `,
            [collection, key]
        );

        return {
            deleted: result.rowCount > 0
        };
    }

    async list(collection, filter = {}) {
        await this.connect();

        const result = await this.pool.query(
            `
            SELECT
                record_key,
                value,
                version
            FROM kv_records
            WHERE collection = $1
            ORDER BY record_key
            `,
            [collection]
        );

        let records = result.rows.map((row) => ({
            key: row.record_key,
            value: row.value,
            version: Number(row.version)
        }));

        if (typeof filter.predicate === "function") {
            records = records.filter(filter.predicate);
        }

        return records;
    }

    async transaction(callback) {
        await this.connect();

        const client = await this.pool.connect();

        try {
            await client.query("BEGIN");
            await client.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");

            const tx = {
                get: async (collection, key) => {
                    const result = await client.query(
                        `
                        SELECT value, version
                        FROM kv_records
                        WHERE collection = $1
                          AND record_key = $2
                        FOR UPDATE
                        `,
                        [collection, key]
                    );

                    if (result.rowCount === 0) {
                        return null;
                    }

                    return {
                        value: result.rows[0].value,
                        version: Number(result.rows[0].version)
                    };
                },

                set: async (collection, key, value, options = {}) => {
                    const serialized = JSON.stringify(value);

                    if (options.expectedVersion !== undefined) {
                        const result = await client.query(
                            `
                            UPDATE kv_records
                            SET value = $3::jsonb,
                                version = version + 1,
                                updated_at = NOW()
                            WHERE collection = $1
                              AND record_key = $2
                              AND version = $4
                            RETURNING version
                            `,
                            [
                                collection,
                                key,
                                serialized,
                                options.expectedVersion
                            ]
                        );

                        if (result.rowCount === 0) {
                            const current = await tx.get(
                                collection,
                                key
                            );

                            throw new StorageConcurrencyError(
                                `Version conflict for ${collection}/${key}`,
                                {
                                    collection,
                                    key,
                                    expectedVersion:
                                        options.expectedVersion,
                                    actualVersion:
                                        current?.version || 0
                                }
                            );
                        }

                        return {
                            key,
                            version: Number(
                                result.rows[0].version
                            )
                        };
                    }

                    const result = await client.query(
                        `
                        INSERT INTO kv_records (
                            collection,
                            record_key,
                            value,
                            version
                        )
                        VALUES ($1, $2, $3::jsonb, 1)
                        ON CONFLICT (
                            collection,
                            record_key
                        )
                        DO UPDATE SET
                            value = EXCLUDED.value,
                            version =
                                kv_records.version + 1,
                            updated_at = NOW()
                        RETURNING version
                        `,
                        [
                            collection,
                            key,
                            serialized
                        ]
                    );

                    return {
                        key,
                        version: Number(
                            result.rows[0].version
                        )
                    };
                },

                delete: async (collection, key, options = {}) => {
                    if (options.expectedVersion !== undefined) {
                        const result = await client.query(
                            `
                            DELETE FROM kv_records
                            WHERE collection = $1
                              AND record_key = $2
                              AND version = $3
                            RETURNING record_key
                            `,
                            [
                                collection,
                                key,
                                options.expectedVersion
                            ]
                        );

                        if (result.rowCount === 0) {
                            const current = await tx.get(
                                collection,
                                key
                            );

                            throw new StorageConcurrencyError(
                                `Version conflict for ${collection}/${key}`,
                                {
                                    collection,
                                    key,
                                    expectedVersion:
                                        options.expectedVersion,
                                    actualVersion:
                                        current?.version || 0
                                }
                            );
                        }

                        return {
                            deleted: true
                        };
                    }

                    const result = await client.query(
                        `
                        DELETE FROM kv_records
                        WHERE collection = $1
                          AND record_key = $2
                        RETURNING record_key
                        `,
                        [collection, key]
                    );

                    return {
                        deleted: result.rowCount > 0
                    };
                },

                list: async (collection) => {
                    const result = await client.query(
                        `
                        SELECT
                            record_key,
                            value,
                            version
                        FROM kv_records
                        WHERE collection = $1
                        ORDER BY record_key
                        `,
                        [collection]
                    );

                    return result.rows.map((row) => ({
                        key: row.record_key,
                        value: row.value,
                        version: Number(row.version)
                    }));
                }
            };

            const result = await callback(tx);

            await client.query("COMMIT");

            return result;
        } catch (error) {
            try {
                await client.query("ROLLBACK");
            } catch {
                // Preserve original transaction error.
            }

            throw error;
        } finally {
            client.release();
        }
    }

    async health() {
        try {
            await this.connect();

            const result = await this.pool.query(
                "SELECT NOW() AS now"
            );

            return {
                status: "UP",
                adapter: "postgres",
                now: result.rows[0].now
            };
        } catch (error) {
            return {
                status: "DOWN",
                adapter: "postgres",
                error: error.message
            };
        }
    }
}

export function createStorageAdapter(config = {}) {
    const mode =
        config.persistenceMode ||
        process.env.PERSISTENCE_MODE ||
        "memory";

    if (mode === "postgres") {
        return new PostgresStorageAdapter({
            connectionString:
                config.databaseUrl ||
                process.env.DATABASE_URL,
            ssl:
                config.databaseSsl === true ||
                process.env.DATABASE_SSL === "true"
        });
    }

    if (mode === "file") {
        return new FileStorageAdapter({
            filePath:
                config.dataFile ||
                process.env.PERSISTENCE_FILE ||
                "./server/data/persistence.json"
        });
    }

    if (mode === "memory") {
        return new MemoryStorageAdapter();
    }

    throw new Error(
        `Unsupported persistence mode: ${mode}`
    );
}

export const defaultStorageAdapter =
    createStorageAdapter({
        persistenceMode:
            process.env.PERSISTENCE_MODE || "memory",
        databaseUrl:
            process.env.DATABASE_URL
    });