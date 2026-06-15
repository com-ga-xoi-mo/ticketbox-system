export class EmailAlreadyRegisteredError extends Error {
  constructor(email: string) {
    super(`Email is already registered: ${email}`);
    this.name = 'EmailAlreadyRegisteredError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid credentials');
    this.name = 'InvalidCredentialsError';
  }
}

export class ForbiddenAdminActionError extends Error {
  constructor() {
    super('Admin role is required for this action');
    this.name = 'ForbiddenAdminActionError';
  }
}

export class ConcertNotFoundError extends Error {
  constructor(concertId: string) {
    super(`Concert not found: ${concertId}`);
    this.name = 'ConcertNotFoundError';
  }
}

export class ForbiddenConcertOwnershipError extends Error {
  constructor(concertId: string) {
    super(`User is not authorized to manage concert: ${concertId}`);
    this.name = 'ForbiddenConcertOwnershipError';
  }
}

export class MissingCheckinStaffRoleError extends Error {
  constructor() {
    super('Check-in staff role is required for this action');
    this.name = 'MissingCheckinStaffRoleError';
  }
}

export class MissingActiveCheckinAssignmentError extends Error {
  constructor(concertId: string) {
    super(`Active check-in assignment is required for concert: ${concertId}`);
    this.name = 'MissingActiveCheckinAssignmentError';
  }
}

export class CheckinGateMismatchError extends Error {
  constructor(gateName: string) {
    super(`Check-in staff is not assigned to gate: ${gateName}`);
    this.name = 'CheckinGateMismatchError';
  }
}

export class CheckinStaffUserNotFoundError extends Error {
  constructor(staffUserId: string) {
    super(`Check-in staff user not found: ${staffUserId}`);
    this.name = 'CheckinStaffUserNotFoundError';
  }
}

export class UserIsNotCheckinStaffError extends Error {
  constructor(staffUserId: string) {
    super(`User is not check-in staff: ${staffUserId}`);
    this.name = 'UserIsNotCheckinStaffError';
  }
}

export class DuplicateCheckinAssignmentError extends Error {
  constructor(staffUserId: string, concertId: string, gateName?: string) {
    const gate = gateName ? ` at gate ${gateName}` : '';
    super(`Active check-in assignment already exists for ${staffUserId} on ${concertId}${gate}`);
    this.name = 'DuplicateCheckinAssignmentError';
  }
}

export class CheckinAssignmentNotFoundError extends Error {
  constructor(assignmentId: string) {
    super(`Check-in assignment not found: ${assignmentId}`);
    this.name = 'CheckinAssignmentNotFoundError';
  }
}
