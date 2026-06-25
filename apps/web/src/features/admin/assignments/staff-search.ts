export interface SearchableStaffAccount {
  id: string;
  email: string;
  displayName?: string;
}

export function filterStaffAccountsBySearch<T extends SearchableStaffAccount>(
  staffAccounts: readonly T[],
  search: string,
): T[] {
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) {
    return [...staffAccounts];
  }

  return staffAccounts.filter((staff) => {
    const searchable = [staff.displayName, staff.email, staff.id]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return searchable.includes(normalizedSearch);
  });
}
