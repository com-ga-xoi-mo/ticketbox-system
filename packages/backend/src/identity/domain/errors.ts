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
