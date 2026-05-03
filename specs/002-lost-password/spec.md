# Feature Specification: Lost Password & Login Page Cleanup

**Feature Branch**: `002-lost-password`  
**Created**: 2026-04-29  
**Status**: Draft  
**Input**: User description: "the login logic for create account must be replaced with lost password using nodemailer. the current logic for create account on login is false, only admin can create accounts inside the panel"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Request Password Reset (Priority: P1)

A user who has forgotten their password visits the login page, clicks "Forgot password?", enters their email address, and receives a password reset email. They follow the link in the email to set a new password and regain access to their account.

**Why this priority**: This is the core feature being requested. Without it, locked-out users have no self-service recovery path.

**Independent Test**: Can be fully tested by submitting a reset request with a valid registered email, verifying a reset email is received, following the link, and successfully logging in with the new password.

**Acceptance Scenarios**:

1. **Given** a user is on the login page, **When** they click "Forgot password?", **Then** they are shown a form to enter their email address
2. **Given** the user enters a valid registered email and submits, **When** the system processes the request, **Then** a password reset email is sent to that address within 2 minutes
3. **Given** the user clicks the reset link in the email, **When** they arrive on the reset page, **Then** they can enter and confirm a new password
4. **Given** the user submits a valid new password, **When** the system processes it, **Then** their password is updated and they are redirected to login
5. **Given** the user enters the old password after reset, **When** they attempt to login, **Then** login fails and they are prompted to use the new password

---

### User Story 2 - Handle Invalid or Expired Reset Links (Priority: P2)

A user clicks on a password reset link that has already been used or has expired. The system informs them clearly and offers the option to request a new reset link.

**Why this priority**: Without proper link expiry handling, the system is insecure and users get confusing errors.

**Independent Test**: Can be tested by using an expired or already-used reset link and verifying that an appropriate error message is displayed with an option to request a new link.

**Acceptance Scenarios**:

1. **Given** a user clicks an expired reset link, **When** the system checks the link validity, **Then** an error message is shown explaining the link has expired
2. **Given** a user clicks a previously used reset link, **When** the system checks the link status, **Then** an error message is shown and a new request option is presented
3. **Given** a user enters an unregistered email on the forgot-password form, **When** they submit, **Then** the system shows a neutral confirmation message (to avoid disclosing registered emails) without sending any email

---

### User Story 3 - Remove "Create Account" from Login Page (Priority: P1)

The "Create Account" option is removed from the login page UI. Admin users can still create accounts through the admin panel, but regular users cannot self-register.

**Why this priority**: This is a security and business-logic correction. Allowing self-registration is explicitly incorrect per business rules.

**Independent Test**: Can be tested by verifying the login page has no registration link/button, and that the admin panel retains the ability to create new accounts.

**Acceptance Scenarios**:

1. **Given** a visitor opens the login page, **When** the page loads, **Then** there is no "Create account" button, link, or form visible
2. **Given** an admin is logged into the admin panel, **When** they navigate to user management, **Then** they can create new user accounts
3. **Given** a user attempts to access any registration route directly via URL, **When** the server receives the request, **Then** the route returns a 404 or redirects to the login page

---

### Edge Cases

- What happens when the email server (nodemailer) is unavailable? The system should surface a user-friendly error and not silently fail.
- What happens when a user submits the forgot-password form multiple times in rapid succession? The system should rate-limit requests to prevent email flooding.
- What happens when a user's account is disabled/inactive and they request a reset? The system should not reveal the account status (send neutral message).
- How long are reset links valid? Links must expire after a reasonable time window (assumed 1 hour).
- What happens if a user requests a new reset while a prior link is still valid? The prior link should be invalidated when a new one is issued.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The login page MUST NOT display any "Create Account" button, link, or registration form
- **FR-002**: The login page MUST display a "Forgot password?" link that navigates to the password reset request flow
- **FR-003**: The system MUST send a password reset email to a verified registered address when requested
- **FR-004**: Password reset links MUST expire after 1 hour of generation
- **FR-005**: Each reset link MUST be single-use — it is invalidated once the password has been successfully changed
- **FR-006**: When a new reset link is requested, any previously issued valid link for the same account MUST be invalidated
- **FR-007**: The forgot-password form MUST display a neutral confirmation message regardless of whether the email is registered, to prevent account enumeration
- **FR-008**: The system MUST rate-limit password reset requests per email address to prevent abuse
- **FR-009**: The admin panel MUST retain full ability to create, edit, and manage user accounts
- **FR-010**: Any direct navigation to registration routes MUST result in a redirect to the login page or a 404 response

### Key Entities

- **PasswordResetToken**: Represents a single-use time-limited token linked to a user account; attributes include token value, associated user, creation timestamp, expiry timestamp, and used status
- **User**: Existing entity; relevant attributes are email address, password hash, and account status

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A registered user can complete the full forgot-password flow (request → email → reset → login) in under 3 minutes
- **SC-002**: Password reset emails are delivered within 2 minutes of the request under normal conditions
- **SC-003**: The login page contains zero registration-related UI elements after the change
- **SC-004**: 100% of reset links expire and become unusable after 1 hour
- **SC-005**: 100% of used reset links are rejected on re-use attempts
- **SC-006**: Support requests related to account lockout are reduced by eliminating the need to contact admin for self-service password recovery

## Assumptions

- Users already have accounts created by an admin; self-registration is not permitted and is being removed
- The application has an existing email configuration that can be used by nodemailer (SMTP credentials available via environment variables)
- The reset email will contain the application's base URL to construct the reset link, which is configurable
- Mobile support follows the same responsive behavior already in place for the login page
- The password reset page does not require the user to be logged in (it is a public route accessed via the emailed link)
- Rate limiting applies per email address per hour to prevent abuse
- Admin account creation flow within the admin panel is already functional and remains unchanged
