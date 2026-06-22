import type { MobileSession, StaffAssignment, StaffProfile } from '../api/checkin-mobile-api.types';

export const staffProfile: StaffProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'staff@ticketbox.test',
  displayName: 'Staff User',
  roles: ['CHECKIN_STAFF'],
};

export const audienceProfile: StaffProfile = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'audience@ticketbox.test',
  displayName: 'Audience User',
  roles: ['AUDIENCE'],
};

export const staffSession: MobileSession = {
  accessToken: 'staff-token',
  profile: staffProfile,
};

export const activeAssignment: StaffAssignment = {
  assignmentId: '33333333-3333-4333-8333-333333333333',
  concertId: '44444444-4444-4444-8444-444444444444',
  concertTitle: 'Anh Trai Say Hi',
  gate: 'Gate A',
  startsAt: '2026-07-01T12:00:00.000Z',
  status: 'ACTIVE',
};

export const secondAssignment: StaffAssignment = {
  assignmentId: '55555555-5555-4555-8555-555555555555',
  concertId: '66666666-6666-4666-8666-666666666666',
  concertTitle: 'Em Xinh Say Hi',
  gate: 'Gate B',
  startsAt: '2026-07-02T12:00:00.000Z',
  status: 'ACTIVE',
};
