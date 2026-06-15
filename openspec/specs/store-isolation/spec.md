# Store Isolation Specification

## Purpose

Enforce strict data separation between stores. Every entity carries a `store_id`; queries MUST filter by the active store.

## Requirements

### R1: Schema-Level Isolation

Every data entity MUST include a `store_id` column, and all queries MUST filter by it.

| Entity | store_id required |
|--------|-------------------|
| products | MUST |
| categories | MUST |
| stock_movements | MUST |
| sales | MUST |
| sale_items | MUST (via sale) |
| shifts | MUST |
| invoices | MUST |
| sync_logs | MUST |

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path | User on store_id=1 queries products | Products are fetched with WHERE store_id=1 | Only store 1 products are returned |
| Missing filter | A query omits store_id | Query executes | The system MUST reject — store_id filter is mandatory |
| Cross-store leak | Store 1 has 100 products; store 2 has 50 | Store 1 user queries all products | Result count = 100, not 150 |

### R2: API-Level Isolation

All data-access functions MUST accept a `store_id` parameter.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path | User selects store 2 from switcher | All subsequent API calls include store_id=2 | Data returned is scoped to store 2 |
| Invalid store | User with no access to store 3 queries it | API call made with store_id=3 | The system MUST reject with "unauthorized" |

### R3: Auth & Session Isolation

The active `store_id` MUST be set at app startup per session.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path | User configures store 1 at login | App loads | All data is scoped to store_id=1 |
| Switch store | User changes from store 1 to store 2 | User selects store 2 | Cart is cleared; data refreshes for store 2 |
