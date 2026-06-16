import type { MobileSession, StaffAssignment, StaffProfile } from '../api/checkin-mobile-api.types';

export const staffProfile: StaffProfile = {
  id: 'staff-1',
  email: 'staff@ticketbox.test',
  fullName: 'Staff User',
  roles: ['CHECKIN_STAFF'],
};

export const audienceProfile: StaffProfile = {
  id: 'audience-1',
  email: 'audience@ticketbox.test',
  fullName: 'Audience User',
  roles: ['AUDIENCE'],
};

export const staffSession: MobileSession = {
  accessToken: 'staff-token',
  profile: staffProfile,
};

export const activeAssignment: StaffAssignment = {
  assignmentId: 'assignment-1',
  concertId: 'concert-1',
  concertTitle: 'Anh Trai Say Hi',
  gate: 'Gate A',
  startsAt: '2026-07-01T12:00:00.000Z',
  status: 'ACTIVE',
};

export const secondAssignment: StaffAssignment = {
  assignmentId: 'assignment-2',
  concertId: 'concert-2',
  concertTitle: 'Em Xinh Say Hi',
  gate: 'Gate B',
  startsAt: '2026-07-02T12:00:00.000Z',
  status: 'ACTIVE',
};
