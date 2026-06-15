# Admin Authentication Specification

## Purpose

Provide a simple PIN-protected admin mode toggle. No user accounts or roles — single PIN per device. Admin pages are hidden when the mode is off, preventing accidental access in shared POS environments.

## Requirements

### A1: Set Admin PIN

The system MUST allow setting a numeric admin PIN on first use. The PIN SHALL be hashed via Web Crypto API (SHA-256) and stored in localStorage. The raw PIN MUST NOT be persisted.

#### Scenario: First-time PIN setup

- GIVEN no PIN has been set on this device
- WHEN a user enters PIN "1234" and confirms
- THEN the SHA-256 hash of "1234" is stored in localStorage

#### Scenario: PIN confirmation mismatch

- GIVEN no PIN has been set
- WHEN a user enters PIN "1234" then confirms with "5678"
- THEN the system SHALL reject and prompt to retry

### A2: Toggle Admin Mode

The system MUST allow entering admin mode by providing the correct PIN. Admin mode SHALL persist per session (in-memory) and clear when the page is closed.

#### Scenario: Successful unlock

- GIVEN a PIN has been set
- WHEN a user enters the correct PIN
- THEN admin mode activates; admin links become visible

#### Scenario: Wrong PIN

- GIVEN a PIN has been set
- WHEN a user enters an incorrect PIN
- THEN the system SHALL reject and increment a failed attempt counter

#### Scenario: Re-lock

- GIVEN admin mode is active
- WHEN a user clicks "Lock Admin"
- THEN admin mode deactivates; admin links hide

### A3: Route Guard

The system MUST prevent rendering admin-only routes when admin mode is off. Navigating to an admin URL while locked SHALL redirect to the main POS view.

#### Scenario: Direct URL access while locked

- GIVEN admin mode is off
- WHEN a user navigates to /admin/brands
- THEN the system redirects to /pos without rendering admin content

#### Scenario: Admin route while unlocked

- GIVEN admin mode is active
- WHEN a user navigates to /admin/brands
- THEN the admin page renders normally

### A4: Change PIN

The system MUST allow changing the PIN while in admin mode. The old PIN MUST be verified before the new one is accepted.

#### Scenario: PIN change

- GIVEN admin mode is active with PIN "1234"
- WHEN a user enters old PIN "1234", new PIN "5678", confirms "5678"
- THEN the stored hash is replaced with the SHA-256 hash of "5678"
