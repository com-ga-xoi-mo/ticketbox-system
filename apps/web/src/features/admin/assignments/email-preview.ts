const MAX_QUANTITY = 100;

export function generatePreviewEmails(baseEmail: string, quantity: number): string[] {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return [];
  }

  const normalized = baseEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return [];
  }

  const [local, domain] = normalized.split('@');
  if (!local || !domain) {
    return [];
  }

  return Array.from({ length: quantity }, (_, index) =>
    index === 0 ? `${local}@${domain}` : `${local}${index}@${domain}`,
  );
}
