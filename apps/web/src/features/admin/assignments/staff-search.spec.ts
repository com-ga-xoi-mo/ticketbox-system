import { describe, expect, it } from 'vitest';

import { filterStaffAccountsBySearch } from './staff-search';

const staff = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    displayName: 'Gate Alpha',
    email: 'alpha@ticketbox.test',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    displayName: 'Door Beta',
    email: 'beta@ticketbox.test',
  },
];

describe('filterStaffAccountsBySearch', () => {
  it('filters staff by display name', () => {
    expect(filterStaffAccountsBySearch(staff, 'alpha')).toEqual([staff[0]]);
  });

  it('filters staff by id', () => {
    expect(filterStaffAccountsBySearch(staff, '2222-4222')).toEqual([staff[1]]);
  });

  it('keeps all staff when search is blank', () => {
    expect(filterStaffAccountsBySearch(staff, '   ')).toEqual(staff);
  });
});
