# Feature Specification: Admin User Profile Management

**Feature Branch**: `003-admin-user-profiles`  
**Created**: 2026-04-29  
**Status**: Draft  
**Input**: User description: "enhance the /admin page to add full profile for the creation and modal appear for create and edit and use swal confirmation ui and do the necessary for the db tables for more columns"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create User with Full Profile via Modal (Priority: P1)

An admin opens the admin panel and clicks "Add User". A modal dialog appears with a full profile form: first name, last name, email, password, phone number, and role. The admin fills in the details and submits. The new user appears in the table with their profile information. The modal closes and a success notification is shown.

**Why this priority**: This is the core enhancement — replacing the primitive inline form with a full-featured modal and richer profile data.

**Independent Test**: Click "Add User", fill the modal form with all fields, submit, verify the new user row appears in the table with first name, last name, and phone visible.

**Acceptance Scenarios**:

1. **Given** an admin is on the admin panel, **When** they click "Add User", **Then** a modal dialog opens with fields: first name, last name, email, password, phone, and role
2. **Given** the modal is open with all fields filled, **When** the admin submits the form, **Then** the user is created, the modal closes, and a success notification appears
3. **Given** the modal is open, **When** the admin submits with required fields missing, **Then** inline validation messages appear and the form is not submitted
4. **Given** the modal is open, **When** the admin clicks Cancel or clicks outside the modal, **Then** the modal closes without creating a user

---

### User Story 2 - Edit User Profile via Modal (Priority: P1)

An admin clicks "Edit" on any user row. A modal opens pre-populated with that user's current profile data (first name, last name, email, phone, role). The admin modifies fields and saves. The table updates to reflect the changes and a success notification appears.

**Why this priority**: The current edit flow uses browser prompts — one field at a time. The modal replaces this with a proper editing experience that shows all profile fields at once.

**Independent Test**: Click "Edit" on an existing user, verify the modal pre-fills with current data, change the first name and role, save, verify the table row reflects both changes.

**Acceptance Scenarios**:

1. **Given** an admin clicks "Edit" on a user row, **When** the modal opens, **Then** all profile fields are pre-filled with the user's current data
2. **Given** the edit modal is open, **When** the admin changes any field and saves, **Then** the user record is updated and the table reflects the new values
3. **Given** the edit modal is open, **When** the admin leaves a required field empty and saves, **Then** validation prevents submission and highlights the missing field
4. **Given** the edit modal is open, **When** the admin clicks Cancel, **Then** no changes are saved

---

### User Story 3 - Delete User with SweetAlert Confirmation (Priority: P2)

An admin clicks "Delete" on a user row. A SweetAlert confirmation dialog appears with the user's name and a warning. The admin confirms and the user is deleted with a success notification, or cancels and nothing happens. The browser's native `window.confirm()` is no longer used anywhere on the page.

**Why this priority**: Replaces unsafe native browser dialogs with a consistent, branded confirmation experience.

**Independent Test**: Click "Delete" on a user, verify a styled SweetAlert dialog appears (not a browser popup), confirm deletion, verify the row disappears and a success toast appears.

**Acceptance Scenarios**:

1. **Given** an admin clicks "Delete" on a user row, **When** the confirmation dialog appears, **Then** it is a SweetAlert dialog (not a browser native confirm) showing the user's name
2. **Given** the SweetAlert confirmation is shown, **When** the admin confirms, **Then** the user is deleted and a success notification is shown
3. **Given** the SweetAlert confirmation is shown, **When** the admin cancels, **Then** nothing is deleted and the table is unchanged
4. **Given** an admin tries to delete the last admin account, **When** the server rejects it, **Then** a SweetAlert error notification is shown

---

### User Story 4 - View Enhanced User Table with Profile Columns (Priority: P2)

The user table displays enriched columns: full name (first + last), email, phone, role, and creation date. The search filter works across all visible text fields. Each row shows a user avatar placeholder or initials badge.

**Why this priority**: The additional profile data stored in the database should be surfaced in the table for quick reference.

**Independent Test**: After creating a user with full profile, verify the table shows their first name, last name, phone, and creation date in the correct columns.

**Acceptance Scenarios**:

1. **Given** users exist in the system, **When** the admin views the table, **Then** columns show: full name, email, phone, role, and creation date
2. **Given** the table is populated, **When** the admin types in the search box, **Then** results filter across full name, email, and role simultaneously
3. **Given** a user was created without a phone number, **When** their row is displayed, **Then** the phone column shows a dash or "—" placeholder

---

### Edge Cases

- What happens when an admin tries to create a user with an email that already exists? A SweetAlert error notification is shown with the specific conflict message.
- What happens when a modal form is submitted while the network is slow? The submit button is disabled during the request to prevent duplicate submissions.
- What happens when the admin tries to edit their own account? The role field is disabled or a warning is shown to prevent self-demotion.
- What if first name or last name contain special characters (accents, hyphens)? They must be stored and displayed correctly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The "Add User" inline form on the admin page MUST be replaced with a modal dialog triggered by a button click
- **FR-002**: The user creation modal MUST include fields: first name (required), last name (required), email (required), password (required), phone number (optional), and role (required)
- **FR-003**: The "Edit" action on each user row MUST open a modal pre-populated with all current profile fields (excluding password)
- **FR-004**: The edit modal MUST allow updating: first name, last name, email, phone, and role
- **FR-005**: All delete confirmations MUST use SweetAlert dialogs — no native `window.confirm()` or `prompt()` calls remain
- **FR-006**: All success and error notifications MUST use SweetAlert toasts or alerts consistently
- **FR-007**: The users database table MUST be extended with: first_name, last_name, phone columns
- **FR-008**: The user table on the admin page MUST display: full name, email, phone, role, and creation date
- **FR-009**: The search filter MUST match across full name, email, and role fields simultaneously
- **FR-010**: Modal forms MUST validate required fields before submission and show inline error messages
- **FR-011**: The submit button in modals MUST be disabled during active API requests to prevent duplicate submissions
- **FR-012**: The admin API endpoint for updating users MUST accept and store the new profile fields

### Key Entities

- **User**: Extended with first_name (varchar), last_name (varchar), phone (varchar, optional), created_at (already exists or to be added); relationships to roles unchanged

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admin can create a user with full profile in under 60 seconds using the new modal
- **SC-002**: Zero native browser `confirm()` or `prompt()` calls remain on the admin page after the change
- **SC-003**: All CRUD operations on the admin page produce a SweetAlert notification (success or error) within 2 seconds of completion
- **SC-004**: The user table displays at least 5 meaningful columns (name, email, phone, role, date) up from the current 3
- **SC-005**: Search results update instantly (under 100ms) as the admin types, filtering across name, email, and role

## Assumptions

- SweetAlert2 (sweetalert2 npm package) will be added as a project dependency; it is the industry-standard choice for styled alerts in React
- The `users` table already has `id`, `email`, `password`, `role`, and `created_at`; the migration adds `first_name`, `last_name`, `phone` as nullable columns (existing users are unaffected)
- The edit modal does not expose a password-change field — password reset is handled by the separate forgot-password flow
- Phone number format is free-text (no strict validation pattern) to support international numbers
- The admin cannot delete their own account (already enforced by the backend); this restriction is surfaced with a SweetAlert error when attempted
- First name and last name are required for new users created after this feature ships; existing users with NULL values show "—" in the table
