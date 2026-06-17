# Delta for admin-auth

## ADDED Requirements

### Requirement: AA-LOGIN: User Login

The system MUST authenticate a user by verifying their password (SHA-256 hash match). The authenticated user session SHALL persist to localStorage and survive page refresh.

#### Scenario: Successful login

- GIVEN a user "Ana" exists with password "1234"
- WHEN Ana enters name "Ana" and password "1234"
- THEN the system authenticates Ana and sets the active session

#### Scenario: Wrong password

- GIVEN a user "Ana" exists
- WHEN Ana enters an incorrect password
- THEN the system SHALL reject with an error message

#### Scenario: Deactivated user cannot log in

- GIVEN user "Ana" is deactivated
- WHEN Ana attempts to log in
- THEN the system SHALL reject with "account deactivated"

### Requirement: AA-LOGOUT: User Logout

The system MUST clear the active session when the user logs out.

#### Scenario: Successful logout

- GIVEN a user is authenticated
- WHEN the user clicks "Logout"
- THEN the session is cleared and the login screen is shown

## MODIFIED Requirements

### Requirement: A3: Route Guard

The system MUST prevent rendering pages when the authenticated user lacks the required permission. Unauthenticated users SHALL be redirected to login. (Previously: Binary PIN gate — admin mode on/off controlled all admin routes)

#### Scenario: Page with permission

- GIVEN a user has "estadisticas" permission and is authenticated
- WHEN the user navigates to /stats
- THEN the page renders normally

#### Scenario: Page without permission

- GIVEN a user lacks "estadisticas" permission
- WHEN the user navigates to /stats
- THEN the system redirects to /dashboard

#### Scenario: Direct URL access without permission

- GIVEN a user lacks "configuracion" permission
- WHEN the user navigates to /admin
- THEN the system redirects to /dashboard

#### Scenario: Unauthenticated user

- GIVEN no user is authenticated
- WHEN the user navigates to any page
- THEN the system redirects to /login

## REMOVED Requirements

### Requirement: A1: Set Admin PIN
(Reason: PIN replaced by multi-user account creation via user-management spec. First-run creates admin user instead of PIN.)
(Migration: First-run flow auto-creates default admin account with all permissions.)

### Requirement: A2: Toggle Admin Mode
(Reason: Binary lock/unlock replaced by persistent user session with page-level permissions.)
(Migration: Login/logout replaces lock/unlock. User context persists across refresh.)

### Requirement: A4: Change PIN
(Reason: PIN changes replaced by user password edit via user-management CRUD.)
(Migration: Admin users edit any user's password through the user management UI.)
