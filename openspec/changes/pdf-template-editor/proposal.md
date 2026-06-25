# Proposal: PDF Template Editor

## Intent

PDFs y prints de comprobantes están hardcodeados en 4 lugares distintos (`src/lib/pdf-export.ts`, `ComprobantesPage.tsx`, `BillingPage.tsx`, `POSPage.tsx`). El usuario no puede personalizar el formato, logo ni datos mostrados. Necesita un editor de plantillas HTML por tipo de comprobante desde Admin.

## Scope

### In Scope
- tabla `plantillas` en DB (store_id, tipo, template_html, syncColumns)
- Zustand store `src/store/plantillas.ts` con persistencia local + sync
- Sección "Plantillas" en Admin (card + detail + editor)
- Editor HTML con resaltado de variables disponibles
- Vista previa con datos de ejemplo (comprobante hardcodeado o último real)
- Función `renderTemplate(template, data)` que reemplaza `{{variables}}` y hace join de `{{items}}`
- Refactor de `pdf-export.ts` para usar plantillas (con fallback al HTML hardcodeado si no hay template)
- Refactor de `ComprobanteDetail.handlePrint()` para usar `renderTemplate`
- Template por defecto para cada tipo al crear la tabla (migración)

### Out of Scope
- Editor visual WYSIWYG o drag & drop
- Subida de imágenes / logos
- PDF nativo server-side (sigue usando `window.print()`)
- Múltiples plantillas por tipo (1:1 por ahora)
- Export a PDF con librería server-side (Tauri backend existente se mantiene)

## Capabilities

### New Capabilities
- `pdf-templates`: CRUD de plantillas HTML por tipo de comprobante. Editor con sintaxis `{{variable}}`. Vista previa con datos reales. Renderizado unificado para print/PDF.

### Modified Capabilities
- `pos-sales`: R3 (Receipt) cambia — ya no genera HTML hardcodeado, usa `renderTemplate` con la plantilla del tipo correspondiente. El comportamiento observable sigue siendo el mismo (se imprime un comprobante).

## Approach

1. **Schema**: tabla `plantillas` en `db/schema.ts` con syncColumns + seed de templates default
2. **Store**: `src/store/plantillas.ts` — Zustand + localStorage. Acciones: `getTemplate(tipo)`, `updateTemplate(tipo, html)`, `resetDefaults`
3. **Admin section**: agregar `"plantillas"` a `SectionId`, `SECTIONS`, render condicional `PlantillasSection`
4. **Editor**: textarea full-width con la template HTML, lista de variables disponibles al costado, botón "Vista Previa" que renderiza con datos de ejemplo
5. **Render**: `src/lib/template-render.ts` — función pura que toma template string + data object, reemplaza `{{var}}` e itera `{{#items}}...{{/items}}` para el array de items
6. **Refactor**: `pdf-export.ts` y `ComprobanteDetail` consumen `renderTemplate(store.getTemplate(tipo), comprobante)` con fallback al HTML legacy

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `db/schema.ts` | Modified | Add `plantillas` table + seed migration |
| `src/store/plantillas.ts` | **New** | Zustand store with CRUD + defaults |
| `src/store/index.ts` | Modified | Export `usePlantillasStore` |
| `src/pages/AdminPage.tsx` | Modified | Add `"plantillas"` to SectionId, SECTIONS, ACCENTS, render |
| `src/lib/template-render.ts` | **New** | `renderTemplate(template, data)` pure function |
| `src/lib/pdf-export.ts` | Modified | Use plantilla via renderTemplate, fallback legacy |
| `src/pages/ComprobantesPage.tsx` | Modified | `handlePrint` usa renderTemplate |
| `src/pages/BillingPage.tsx` | Modified | `handlePrint` usa renderTemplate |
| `src/pages/POSPage.tsx` | Modified | `handlePrint` usa renderTemplate |
| `openspec/specs/pos-sales/spec.md` | Modified | R3 receipt updated to reference template-based print |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|-------------|
| Migrar 4 prints simultáneamente puede romper producción | High | Rollback por template: si no hay plantilla guardada, cae al HTML legacy |
| Variables disponibles no cubren todos los casos de uso actuales | Medium | Auditoría de variables usadas en los 4 prints actuales antes del refactor |
| Template malformed rompe el print | Medium | try/catch en renderTemplate → fallback legacy; validación en el editor |

## Rollback Plan

Ordered revert: (1) restaurar `pdf-export.ts`, `ComprobantesPage.tsx`, `BillingPage.tsx`, `POSPage.tsx` a versión anterior, (2) eliminar `src/store/plantillas.ts`, (3) eliminar `src/lib/template-render.ts`, (4) revertir schema, (5) revertir AdminPage. Como los prints legacy se mantienen como fallback, no hay rotura inmediata.

## Dependencies

- Drizzle ORM + SQLite (existing)
- `window.print()` browser API (existing)

## Success Criteria

- [ ] Admin muestra sección "Plantillas" con card, icono y acceso
- [ ] Editor HTML guarda y persiste la plantilla por tipo de comprobante
- [ ] Vista previa renderiza template con datos de ejemplo
- [ ] Print de comprobante en POS, Billing y ComprobantesPage usa la plantilla guardada
- [ ] Sin plantilla guardada, el print cae al HTML legacy sin errores
- [ ] Todas las variables documentadas funcionan en el render
- [ ] Tests existentes pasan (pos-sales, admin)
