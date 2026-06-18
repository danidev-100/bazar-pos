# Proposal: Neon Sync Integration

## Intent

Complete the integration glue between the built Rust sync engine (1494 lines, tested) and the Tauri frontend. The system cannot sync today because migrations are missing, Rust can't read the connection string, `brands` is not registered, the frontend hook is unwired, there is no sync UI, and the cloud schema was never pushed to Neon.

## Scope

### In Scope
- Generate Drizzle migrations for local and cloud from `db/schema.ts`
- Add `("brand", "brands", "id")` to `SYNCABLE_ENTITIES` in `sync.rs`
- Load `.env.local` via dotenvy so Rust reads `SYNC_DATABASE_URL`
- Wire `useSync` in `App.tsx` with hourly background timer
- Add sync status indicator in `NavigationBar.tsx` (icon + last-synced timestamp)
- Push cloud schema to Neon via `drizzle-kit push`

### Out of Scope
- Real-time sync (WebSockets) — hourly batch cycle is sufficient for MVP
- Manual conflict resolution UI — LW-W is accepted
- Persisting Zustand brands to SQLite — table exists in schema, data wiring is a separate change

## Capabilities

### New Capabilities
None

### Modified Capabilities
- `sync-engine`: Integration completion — wiring frontend, migrations, brand entity, cloud push

## Approach

Three parallelizable work streams: (1) **Backend** — add `brands` to `SYNCABLE_ENTITIES`, add `dotenvy` to `Cargo.toml`, load `.env.local` in `run_sync()`. (2) **Infrastructure** — run `drizzle-kit generate` for local and cloud, then `drizzle-kit push` for cloud. (3) **Frontend** — import `useSync` in `App.tsx` with `autoStart: true`, add a sync status bar item in `NavigationBar`.

## Affected Areas

| Area | Impact | What changes |
|------|--------|-------------|
| `src-tauri/src/sync.rs` | Modified | Add `brands` tuple to `SYNCABLE_ENTITIES` |
| `src-tauri/Cargo.toml` | Modified | Add `dotenvy` dependency |
| `src-tauri/src/lib.rs` | Modified | (maybe) .env path setup on startup |
| `src/App.tsx` | Modified | Wire `useSync()` hook with hourly timer |
| `src/components/NavigationBar.tsx` | Modified | Sync status indicator component |
| `drizzle/local/`, `drizzle/cloud/` | New | Generated migration files |
| Neon DB (remote) | External | Schema pushed via drizzle-kit |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Neon rejects connection (IP block, SSL) | Medium | Verify URL with `drizzle-kit push` — stop early if it fails |
| dotenvy path broken in packaged Tauri app | Medium | Use `std::env::current_exe()` parent dir as fallback |
| Migration conflicts with existing local DB | Low | Generate fresh; SQLite migrations are additive |

## Rollback Plan

1. Revert file changes to `sync.rs`, `Cargo.toml`, `App.tsx`, `NavigationBar.tsx`
2. Delete `drizzle/local/` and `drizzle/cloud/` directories
3. Drop cloud tables from Neon: `DROP TABLE IF EXISTS ... CASCADE`
4. Revert commit or `git checkout HEAD -- <affected-files>`

## Success Criteria

- [ ] `drizzle/local/` and `drizzle/cloud/` have valid migration SQL files
- [ ] `(brand, brands, id)` present in `SYNCABLE_ENTITIES` in `sync.rs`
- [ ] `cargo build` succeeds with dotenvy
- [ ] `useSync()` called in `App.tsx` with `autoStart: true`
- [ ] NavigationBar shows sync status (icon + last-synced time)
- [ ] Cloud tables created on Neon (`drizzle-kit push` succeeds)
- [ ] Full push → pull cycle completes against Neon (manual verification)
