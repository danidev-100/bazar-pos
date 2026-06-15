# Sales Statistics Specification

## Purpose

Provide product-level analytics, time-based sales reports, and top seller rankings per store.

## Requirements

### R1: Product Analytics

The system MUST show per-product sales: quantity sold, revenue, and average price, filterable by date range.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path | Product "Coca-Cola" sold 50 units at $100 each | User views product analytics | Shows: 50 units sold, $5,000 revenue, $100 avg price |
| Zero sales | Product "Fanta" created but never sold | User views its analytics | Shows: 0 units, $0 revenue |
| Date filter | 30 sales in June, 20 in July | User filters June 1–30 | Only June data is shown: 30 units |

### R2: Time-based Reports

The system MUST report sales totals by day, week, and month per store.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Daily report | Today had $1,200 in sales | User views daily report | Shows: $1,200 total, payment breakdown, transaction count |
| Weekly report | Monday–Sunday: $5,400 | User views weekly report | Aggregates all 7 days, shows total per day |
| Empty period | No sales on Sunday | User views Sunday | Shows: $0, "No transactions" |

### R3: Top Sellers

The system MUST rank products by quantity sold within a date range.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path | Coca-Cola (50), Fanta (30), Sprite (20) | User requests top sellers | Ordered list: Coca-Cola, Fanta, Sprite |
| Empty ranking | No sales in selected period | User requests top sellers | Empty list with message "No sales in this period" |
