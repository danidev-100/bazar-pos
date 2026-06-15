# Sync Engine Specification

## Purpose

Keep local SQLite and cloud PostgreSQL in sync. Offline-first: all writes go to SQLite; sync runs hourly in background via Tauri command.

## Requirements

### R1: Sync Cadence

The system MUST attempt sync every 60 minutes when online, and SHALL trigger on demand.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path | Device online; 1 hour since last sync | Background timer fires | Sync cycle begins |
| On-demand | Device online | User taps "sync now" | Sync cycle begins immediately |
| Offline | Device has no connectivity | Timer fires | The system MUST skip silently and retry in 60 min |

### R2: Push (Local → Cloud)

Local changes since last sync MUST be pushed to PostgreSQL.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path | 5 sales created offline | Push runs | All 5 sales are upserted to PostgreSQL |
| No changes | No local mutations since last sync | Push runs | No-op; push completes in < 1 second |
| Conflict | Cloud has newer `updated_at` on same row | Push tries to overwrite | Cloud row wins (last-writer-wins); conflict is logged |

### R3: Pull (Cloud → Local)

Remote changes since last sync MUST be pulled into SQLite.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path | Cloud has 3 new products from another store | Pull runs | All 3 products are inserted into local SQLite |
| Partial pull | Network drops mid-pull | Pull interrupted | Next pull resumes from last successful checkpoint |
| Large dataset | 10,000 rows changed | Pull runs | The sync SHALL batch in pages of 500 rows |

### R4: Conflict Logging

All sync conflicts MUST be logged for audit.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path | A conflict is resolved via LW-W | After sync | A conflict record is created with entity, timestamp, and verdict |
| No conflicts | All rows merge cleanly | After sync | No conflict records created |
