# Cash Closing Specification

## Purpose

Manage employee shifts, reconcile drawer cash, and produce closure reports per shift per store.

## Requirements

### R1: Shift Management

A cashier shift MUST track open time, close time, employee, and store.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Open shift | Employee starts work at 08:00 | User taps "open shift" | A shift record is created with open_time=08:00, status="open" |
| Close shift | Shift has open sales totaling $1,200 | User taps "close shift" | Shift is closed; status becomes "closed" with close_time |
| Double open | Employee already has an open shift | User tries to open another | System MUST reject: "Close current shift first" |

### R2: Drawer Reconciliation

The system MUST compare expected cash (based on sales) vs declared cash.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path | Sales total $1,200; cash declared $1,200 | User reconciles | Variance = $0; reconciliation status = "matched" |
| Discrepancy | Sales total $1,200; cash declared $1,150 | User reconciles | Variance = -$50; status = "mismatch"; discrepancy flagged |
| Card sales | Sales include $800 cash + $400 card | User declares $800 cash | Variance = $0 (card not expected in drawer) |

### R3: Closure Reports

A closure report MUST summarize shift sales, payments, variances, and product counts.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path | Shift closed with 15 transactions | User views closure report | Report shows: total sales, payment breakdown, item count, variance |
| Empty shift | Shift has 0 transactions | User closes shift | Report shows $0 totals; variance = declared - $0 |
