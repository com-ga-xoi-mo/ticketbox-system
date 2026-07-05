export function dateInputToIsoUtc(dateString?: string | null): string | null {
  if (!dateString) return null;
  // Assumes dateString is YYYY-MM-DD
  return new Date(`${dateString}T00:00:00Z`).toISOString();
}

export function isoUtcToDateInput(isoString?: string | null): string {
  if (!isoString) return '';
  // Convert 2000-01-15T00:00:00.000Z to 2000-01-15
  return isoString.split('T')[0] ?? '';
}
