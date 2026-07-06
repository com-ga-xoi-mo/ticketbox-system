/**
 * Authorisation contract tests for AdminConcertController.
 *
 * Verifies:
 *  - POST /admin/concerts does NOT exist (admin create is removed per spec)
 *  - PATCH /admin/concerts/:id exists (admin update is retained)
 *  - Organizer create (via OrganizerConcertController) is not affected
 */
import { describe, it, expect } from 'vitest';
import { AdminConcertController } from './admin-concert.controller';
import { OrganizerConcertController } from './organizer-concert.controller';

describe('AdminConcertController route contract', () => {
  it('does NOT expose a create() method (POST /admin/concerts is removed)', () => {
    // The controller instance should not have a method named "create".
    // This catches accidental re-introduction of the admin concert create route.
    const instance = new AdminConcertController(
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      {} as any, {} as any, {} as any,
    );
    expect(typeof (instance as any).create).toBe('undefined');
  });

  it('exposes an update() method (PATCH /admin/concerts/:id is retained)', () => {
    const instance = new AdminConcertController(
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      {} as any, {} as any, {} as any,
    );
    expect(typeof instance.update).toBe('function');
  });
});

describe('OrganizerConcertController route contract', () => {
  it('still exposes a create() method (organizer create is unaffected)', () => {
    // OrganizerConcertController constructor args — just check the method exists.
    // Passing {} as any for all DI deps since we're only asserting method presence.
    const proto = OrganizerConcertController.prototype;
    expect(typeof proto.create).toBe('function');
  });

  it('exposes an update() method (organizer update is unaffected)', () => {
    const proto = OrganizerConcertController.prototype;
    expect(typeof proto.update).toBe('function');
  });
});
