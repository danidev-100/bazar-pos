# User Management Specification

## Purpose

Manage user accounts for the POS system. Each user has a unique name, a SHA-256 hashed password, an active/inactive status, and a set of page permissions.

## Requirements

### Requirement: UM-CREATE: Create User

The system MUST allow creating a user with a unique name and a password. The password SHALL be hashed via Web Crypto API (SHA-256). New users SHALL have no permissions by default.

#### Scenario: Create user successfully

- GIVEN the admin is authenticated
- WHEN the admin creates a user with name "Ana" and password "1234"
- THEN the user is stored with a SHA-256 hash of "1234"

#### Scenario: Duplicate username

- GIVEN a user "Ana" already exists
- WHEN the admin tries to create another user named "Ana"
- THEN the system SHALL reject with a duplicate name error

### Requirement: UM-EDIT: Edit User

The system MUST allow editing a user's name, password, active status, and permissions. An empty password field SHALL leave the existing hash unchanged.

#### Scenario: Edit user name

- GIVEN user "Ana" exists
- WHEN the admin changes the name to "Ana Maria"
- THEN the username is updated

#### Scenario: Edit password

- GIVEN user "Ana" exists
- WHEN the admin sets a new password "5678"
- THEN the stored hash is replaced with SHA-256 of "5678"

#### Scenario: Keep existing password

- GIVEN user "Ana" exists with password hash
- WHEN the admin saves the user with an empty password field
- THEN the existing hash is preserved

### Requirement: UM-DELETE: Delete User

The system MUST allow deleting non-admin users. The default bootstrap admin MUST NOT be deletable.

#### Scenario: Delete non-admin user

- GIVEN a non-admin user exists
- WHEN the admin deletes that user
- THEN the user is removed from storage

#### Scenario: Cannot delete admin

- GIVEN the default admin user exists
- WHEN the admin tries to delete the admin user
- THEN the system SHALL reject with an error

### Requirement: UM-BOOTSTRAP: First-Run Bootstrap

The system MUST create a default admin user on first initialization when no users exist in storage. The default admin SHALL have all four permissions (ventas, clientes, estadisticas, configuracion).

#### Scenario: Default admin on first run

- GIVEN no users exist in storage
- WHEN the system initializes
- THEN a default admin user with all permissions is created automatically

#### Scenario: Skip bootstrap if users exist

- GIVEN a user already exists in storage
- WHEN the system initializes
- THEN no new user is created

### Requirement: UM-LIST: List Users

The system MUST display all users showing name, active status, and assigned permissions.

#### Scenario: View user list

- GIVEN multiple users exist
- WHEN the admin views the user list
- THEN all users are displayed with name, active status, and permissions

### Requirement: UM-TOGGLE: Toggle Active Status

The system MUST allow activating or deactivating a user. Deactivated users MUST NOT be able to log in. The default admin MUST NOT be deactivatable.

#### Scenario: Deactivate user

- GIVEN user "Ana" is active
- WHEN the admin deactivates "Ana"
- THEN "Ana" cannot log in

#### Scenario: Reactivate user

- GIVEN user "Ana" is inactive
- WHEN the admin reactivates "Ana"
- THEN "Ana" can log in again

#### Scenario: Cannot deactivate admin

- GIVEN the default admin is active
- WHEN the admin tries to deactivate the admin user
- THEN the system SHALL reject with an error
