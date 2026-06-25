# PDF Templates Specification

## Purpose

HTML template system for comprobante printing. Users customize print layouts per tipo via Admin. Pure-function render engine replaces `{{variable}}` with comprobante data. Sync-enabled persistence scoped by store_id.

## Requirements

### R1: Template Storage

The system MUST store HTML templates per `(store_id, tipo)` via Drizzle schema. Running in hybrid mode (openspec schema not available yet), the system MUST create a `plantillas` table via `db.ts` `ensureTables()` following the existing pattern: columns `id INTEGER PRIMARY KEY AUTOINCREMENT`, `store_id TEXT NOT NULL`, `tipo TEXT NOT NULL`, `template_html TEXT NOT NULL`, `updated_at TEXT`, `sync_status TEXT DEFAULT 'pending'`, plus a UNIQUE constraint on `(store_id, tipo)` and index on `(store_id, tipo)`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path | Store X has no template for "factura" | User saves a template | Row inserted with (store_id=X, tipo="factura", template_html="...") |
| Upsert | Store X already has a template for "factura" | User saves a different template | Row UPDATED (not duplicated); sync_status resets to "pending" |
| Fetch per tipo | Store X has templates for some tipos | System queries by (store_id, tipo) | Returns correct template per tipo; NULL if not yet saved |

### R2: Zustand Store

The `usePlantillasStore` MUST expose: `getPlantilla(tipo)` returning template or null, `upsertPlantilla(tipo, html)` persisting to SQLite and enqueuing sync, `getAllPlantillas()` returning all 5 tipos (null rows replaced with defaults), `getPlantillaOrDefault(tipo)` returning saved template or hardcoded default.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Save & retrieve | User types HTML and saves | `upsertPlantilla("factura", html)` then `getPlantilla("factura")` | Returns the saved HTML string |
| Default fallback | No template saved for "ticket" | `getPlantillaOrDefault("ticket")` | Returns the hardcoded default template |
| All tipos | Templates saved for 2 of 5 tipos | `getAllPlantillas()` | Returns 5 entries: 2 custom + 3 defaults |

### R3: Admin Section

The AdminPage MUST show a "Plantillas" card in the section grid. On click, it MUST display 5 tipo cards showing current status ("Personalizada" or "Por defecto"). Clicking a tipo card MUST open the editor for that tipo.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Section visible | AdminPage is rendered | User views section grid | Card "Plantillas" is present with icon and description |
| Tipo list | User clicks Plantillas card | User sees 5 tipo cards | Each shows tipo label and status badge (Custom/Default) |

### R4: Editor & Preview

The editor MUST provide a monospace textarea with the template HTML, a sidebar listing available variables, a "Guardar" button, and a "Vista Previa" button. The system MUST NOT save empty HTML. Preview MUST open a modal/iframe rendering the template with sample comprobante data.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Valid save | Editor has non-empty HTML | User clicks Guardar | Template is persisted; notification shown |
| Empty reject | Editor has only whitespace | User clicks Guardar | Error shown; template NOT saved |
| Preview | Editor has valid template HTML | User clicks Vista Previa | Modal displays rendered HTML with sample data |

### R5: Render Engine

`renderTemplate(templateHtml: string, data: ComprobanteRenderData): string` MUST be a pure function (no side effects, no external dependencies). It MUST replace `{{variable}}` with corresponding data fields and support `{{#items}}...{{/items}}` iteration blocks.

Supported variables: `{{cliente_nombre}}`, `{{cliente_cuit}}`, `{{cliente_direccion}}`, `{{numero}}`, `{{fecha}}`, `{{subtotal}}`, `{{iva}}`, `{{total}}`, `{{tipo_label}}`, `{{notes}}`. Items block supports `{{product_name}}`, `{{quantity}}`, `{{unit_price}}`, `{{subtotal}}`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Simple replace | Template has `{{cliente_nombre}}` | `renderTemplate(tpl, {cliente_nombre:"Juan"})` | Returns string with "Juan" replacing `{{cliente_nombre}}` |
| Items loop | Template has `{{#items}}{{product_name}}{{/items}}` | Data has 2 items | Returns string with both product names concatenated |
| Empty items | Template has `{{#items}}...{{/items}}` | Data has 0 items | Returns empty string for the block area |
| Unknown var | Template has `{{unknown_var}}` | Variable not in data | Variable left as-is or replaced with `""` |
| Null field | `{{cliente_cuit}}` but data has null | renderTemplate called | Replaced with `""` |

### R6: Print Refactor

All 4 print paths (POSPage, BillingPage, ComprobantesPage, pdf-export.ts) MUST use `renderTemplate()` with the saved template for the corresponding tipo, falling back to the hardcoded default template if none is saved. The fallback MUST preserve current visual output exactly.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Template exists | Store has a saved template for "factura" | User prints a factura comprobante | Printed HTML uses the saved template |
| No template | No template saved for "ticket" | User prints a ticket | Printed HTML uses default template (identical to current output) |
| Render error | Saved template has invalid syntax | renderTemplate throws | Catch → falls back to default template; no blank print |

### R7: Sync

The plantillas table MUST participate in the existing sync system: `sync_status` column set to `'pending'` on write, `enqueueSync("plantilla", id, operation, storeId)` called after each mutation.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Sync enqueue | Template upserted for store X | Upsert completes | sync_queue has a row with entity="plantilla", store_id=X, status="pending" |
