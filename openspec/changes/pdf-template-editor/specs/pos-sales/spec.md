# Delta for pos-sales

## MODIFIED Requirements

### Requirement: R3: Receipt

A receipt MUST be generated for every completed sale. The receipt content MUST be rendered via `renderTemplate()` using the user's saved template for the comprobante tipo (or a hardcoded default if none saved). The render path MUST fall back gracefully on error.
(Previously: Receipt generated with hardcoded HTML. No template customization.)

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path | Sale #42 completed with tipo "ticket" | System generates receipt | Receipt rendered via renderTemplate with saved template for tipo "ticket" (or default) |
| Template customized | Admin saved a custom template for "ticket" | Sale #43 completed (tipo "ticket") | Receipt uses the custom template, not the default |
| Reprint | Receipt already printed | User taps "reprint" | The system SHALL allow reprinting from sale history |
| Fallback on error | Saved template has malformed syntax | renderTemplate throws | System falls back to default template; receipt still prints |
| No template saved | No custom template for "boleta" | Sale completed with tipo "boleta" | Receipt uses the hardcoded default template (identical to current output) |
