export function calculateAvailableQuantity(
  totalQuantity: number,
  reservedQuantity: number,
  soldQuantity: number,
): number {
  return Math.max(totalQuantity - reservedQuantity - soldQuantity, 0);
}
