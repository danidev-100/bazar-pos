# Permissions Specification

## Purpose

Provide page-level access control. Each user has a flat set of permission keys that determine which pages they can view and navigate to.

## Requirements

### Requirement: PERM-DEFINE: Permission Keys

The system MUST define exactly four permission keys: `ventas`, `clientes`, `estadisticas`, `configuracion`. The system SHOULD allow future keys to be added.

#### Scenario: Available permissions

- GIVEN the permission model is initialized
- WHEN the system lists available permissions
- THEN the set MUST contain ventas, clientes, estadisticas, configuracion

### Requirement: PERM-CHECK: Check User Permission

The system MUST provide a function that returns true only when a user is authenticated AND has the requested permission key. Unauthenticated requests MUST return false.

#### Scenario: Permission granted

- GIVEN a user has "ventas" and is authenticated
- WHEN the system checks "ventas"
- THEN the result is true

#### Scenario: Permission denied

- GIVEN a user lacks "clientes"
- WHEN the system checks "clientes"
- THEN the result is false

#### Scenario: No active session

- GIVEN no user is authenticated
- WHEN the system checks any permission
- THEN the result is false

### Requirement: PERM-GUARD: Route Protection

The system MUST redirect users to /dashboard when they attempt to access a page whose permission they lack. Pages without the required permission MUST be hidden from the navigation bar.

#### Scenario: Page hidden from nav

- GIVEN a user lacks "estadisticas"
- WHEN the navigation bar renders
- THEN the Estadísticas link is not shown

#### Scenario: Redirect on restricted page

- GIVEN a user lacks "estadisticas"
- WHEN the user navigates to /stats
- THEN the system redirects to /dashboard

### Requirement: PERM-ADMIN-GUARD: Admin Permission Required

At least one user MUST have `configuracion` permission at all times. The system SHALL prevent removing `configuracion` from the last user who has it.

#### Scenario: Remove last admin permission

- GIVEN only one user has "configuracion"
- WHEN the admin tries to remove "configuracion" from that user
- THEN the system SHALL reject with an error

#### Scenario: Remove non-last admin permission

- GIVEN two users have "configuracion"
- WHEN the admin removes "configuracion" from one
- THEN the change is accepted

### Requirement: PERM-MAP: Permission to Page Mapping

The permission-to-page mapping MUST follow: ventas → "pos", clientes → "customers", estadisticas → "stats", configuracion → "admin".

#### Scenario: Map resolution

- GIVEN permission key "ventas"
- WHEN the system resolves the target page
- THEN the result is "pos"
