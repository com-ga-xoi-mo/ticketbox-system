export const PASSWORD_HASHER = Symbol('PasswordHasherPort');

export interface PasswordHasherPort {
  hash(plainTextPassword: string): Promise<string>;
  compare(plainTextPassword: string, passwordHash: string): Promise<boolean>;
}
