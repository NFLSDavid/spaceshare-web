export function checkAvailability(
  bookings: { startDate: Date; endDate: Date; reservedSpace: number }[],
  start: Date,
  end: Date,
  totalSpace: number,
): number {
  const overlapping = bookings.filter(
    (b) => new Date(b.startDate) < end && new Date(b.endDate) > start,
  );
  const bookedSpace = overlapping.reduce((sum, b) => sum + b.reservedSpace, 0);
  return totalSpace - bookedSpace;
}

export function calculateCost(
  pricePerUnit: number,
  space: number,
  startDate: Date,
  endDate: Date,
): number {
  const days = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.round(pricePerUnit * space * days * 100) / 100;
}
