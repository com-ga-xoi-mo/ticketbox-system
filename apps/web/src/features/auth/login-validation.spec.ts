import { describe, it, expect } from 'vitest';
import { validateLogin, hasErrors } from './login-validation';

describe('validateLogin', () => {
  it('blocks empty email', () => {
    const e = validateLogin('', 'secret');
    expect(e.email).toBeDefined();
    expect(hasErrors(e)).toBe(true);
  });

  it('blocks malformed email', () => {
    const e = validateLogin('notanemail', 'secret');
    expect(e.email).toBeDefined();
  });

  it('blocks empty password', () => {
    const e = validateLogin('a@b.com', '');
    expect(e.password).toBeDefined();
    expect(hasErrors(e)).toBe(true);
  });

  it('passes valid input', () => {
    const e = validateLogin('admin@ticketbox.com', 'hunter2');
    expect(hasErrors(e)).toBe(false);
  });
});
