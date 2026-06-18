## Exploration: Neon Sync Integration (neon-sync)

### Current State

The sync engine is ALREADY FULLY IMPLEMENTED in Rust (1494 lines, 10 tests). The Tauri command `sync_now` is registered. The frontend `useSync` hook exists with auto-sync, manual trigger, and offline detection. The sync-engine spec is written. **But the integration is incomplete** — no migrations exist, env vars aren't loaded at runtime, `brands` is missing from `SYNCABLE_ENTITIES`, and the cloud DB schema hasn't been created/verified.

### What Exists (✅)

| Layer | Status | Details |
|-------|--------|---------|
| Rust sync engine | ✅ Complete | `SyncEngine<L,C>` with push/pull, LW-W, conflict logging, 10 tests |
| Tauri command | ✅ Registered | `sync_now` in `lib.rs` with proper async handler |
| Local store impl | ✅ Complete | `TauriLocalStore` via `sqlx::SqlitePool` — full dynamic SQL |
| Cloud store impl | ✅ Complete | `PgCloudStore` via `sqlx::PgPool` — full dynamic SQL with LW-W |
| Schema — sync columns | ✅ Complete | All 10 entities use `...syncColumns` (store_id, updated_at, sync_status) |
| Schema — sync_queue | ✅ Complete | Tracks row-level ops per entity |
| Schema — sync_logs | ✅ Complete | Conflict audit trail |
| Drizzle configs | ✅ Both | `drizzle.config.local.ts` (SQLite) + `drizzle.config.cloud.ts` (PostgreSQL) |
| Frontend hook | ✅ Complete | `useSync.ts` — auto 60min timer, manual trigger, offline detection, reactive state |
| Integration tests | ✅ Complete | `sync-integration.test.ts` — 827 lines, 12 tests, `InMemorySyncSimulator` |
| Spec | ✅ Written | `openspec/specs/sync-engine/spec.md` — R1-R4 covered |
| .env.local | ✅ Exists | Real Neon connection string at `SYNC_DATABASE_URL` |

### What's Missing (❌)

| Priority | Item | File/Area | Impact |
|----------|------|-----------|--------|
| 🔴 P0 | Drizzle migrations never generated | `drizzle/local/` and `drizzle/cloud/` don't exist | Local DB tables don't exist; sync crashes on first run |
| 🔴 P0 | `migrations()` returns empty vec | `lib.rs:70-72` | Tauri SQL plugin doesn't create tables |
| 🔴 P0 | No dotenv loading in Rust | `sync.rs:569` uses `std::env::var` but nothing loads `.env` | `SYNC_DATABASE_URL` is empty at runtime → sync fails |
| 🔴 P0 | Cloud schema never created | No `db:push:cloud` run | Neon DB has no tables — pull returns nothing, push fails |
| 🟡 P1 | `brands` NOT in SYNCABLE_ENTITIES | `sync.rs:191-201` | Brands won't sync across stores |
| 🟡 P1 | Cloud schema has SQLite colon syntax | `drizzle.config.cloud.ts` → `db/schema.ts` with `sqliteTable` | Drizzle must translate SQLite → PostgreSQL; may fail on some constructs |
| 🟡 P1 | Env var name mismatch | `drizzle.config.cloud.ts` uses `CLOUD_DATABASE_URL`, others use `SYNC_DATABASE_URL` | Cloud DB push command won't find the connection string |
| 🟡 P1 | `useSync` not instantiated | `App.tsx` — never calls `useSync()` | Background sync timer never starts |
| 🟡 P1 | No Sync UI component | Nowhere in `src/components/` or `src/pages/` | User can't trigger sync or see status |
| 🟢 P2 | Migrations format: Drizzle → Tauri SQL plugin | Generated Drizzle SQL must be converted to `tauri_plugin_sql::Migration[]` | Tauri SQL plugin uses its own migration format, not raw SQL files |
| 🟢 P2 | `collect_store_ids()` is hardcoded | `sync.rs:530` returns `vec!["store_1"]` | Multi-store sync won't work properly |

### Approaches

1. **Minimal integration (recommended for first PR)**
   - Generate Drizzle migrations → convert to Tauri format
   - Add `dotenvy` crate + load in `setup()`
   - Fix env var name mismatch
   - Add `brands` to SYNCABLE_ENTITIES
   - Wire `useSync` in App.tsx
   - Push migrations to Neon
   - Pros: Gets sync WORKING end-to-end in ~half a day
   - Cons: Primitive store_id resolution remains hardcoded
   - Effort: Medium (~4-6 hours)

2. **Full integration + Sync UI**
   - Everything in Approach 1
   - Build a SyncIndicator component (status badge + manual sync button)
   - Build a SyncSettings page or section
   - Pros: Production-ready experience
   - Cons: More frontend work
   - Effort: Medium-High (~8-12 hours)

3. **Full integration + Sync UI + proper store resolution**
   - Everything in Approach 2
   - Implement `collect_store_ids()` from actual stores table
   - Add proper per-store sync cursors
   - Pros: Correct multi-store sync
   - Cons: Scope increase significantly
   - Effort: High (~16+ hours)

### Recommendation

**Approach 1 for the first iteration** — get sync actually working end-to-end. The Rust engine and frontend hook are already written. What's missing is the glue: migrations, env loading, one missing entity, and wiring the hook. That's the difference between "sync code exists" and "sync actually runs."

### Risks

- **Drizzle cross-dialect compilation**: The schema uses `sqliteTable` with SQLite-specific default `(datetime('now'))`. Drizzle will need to translate these to PostgreSQL `NOW()`. May need manual review.
- **Tauri SQL plugin migration format**: The plugin expects `Migration { version, description, sql }` where `sql` is a `&str` or `Cow<str>`. Generated Drizzle SQL files need to be embedded. Could use `include_str!()` for the SQL files.
- **`sqlx::SqlitePool` vs `tauri-plugin-sql`**: The sync engine opens its OWN sqlx pool via `sqlx::SqlitePool::connect("sqlite:pos.db")`, while the Tauri SQL plugin also manages the same SQLite DB. Two concurrent sqlx connections to the same DB file from different crates could cause locking issues. This needs testing.
- **Env vars in production builds**: `std::env::var` works in development but for production Tauri builds, env vars won't be available. Need to pass the connection string via Tauri configuration or an encrypted config file.

### Ready for Proposal
**Yes.** The exploration is complete. The remaining work is well-understood, ordered by priority, and has clear acceptance criteria.
