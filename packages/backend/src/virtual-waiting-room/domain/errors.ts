export class WaitingRoomConcertNotFoundError extends Error {
  constructor(public readonly concertId: string) {
    super(`Concert not found for waiting room: ${concertId}`);
    this.name = 'WaitingRoomConcertNotFoundError';
  }
}

export class WaitingRoomInactiveError extends Error {
  constructor(public readonly concertId: string) {
    super(`Waiting room is inactive for concert: ${concertId}`);
    this.name = 'WaitingRoomInactiveError';
  }
}

export class WaitingRoomInvalidConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WaitingRoomInvalidConfigError';
  }
}

export class WaitingRoomAdmissionRequiredError extends Error {
  constructor(public readonly concertId: string) {
    super(`Waiting room admission is required for concert: ${concertId}`);
    this.name = 'WaitingRoomAdmissionRequiredError';
  }
}

export class WaitingRoomAdmissionInvalidError extends Error {
  constructor(public readonly token: string) {
    super(`Waiting room admission token is invalid: ${token}`);
    this.name = 'WaitingRoomAdmissionInvalidError';
  }
}

export class WaitingRoomAdmissionExpiredError extends Error {
  constructor(public readonly token: string) {
    super(`Waiting room admission token is expired: ${token}`);
    this.name = 'WaitingRoomAdmissionExpiredError';
  }
}
