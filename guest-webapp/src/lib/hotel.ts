// Small, dependency-free helpers shared by the booking pages: night counts and
// money formatting. Kept out of the pages themselves so Checkout and
// RoomDetail compute the same total the same way.

export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T00:00:00Z`).getTime();
  const end = new Date(`${checkOut}T00:00:00Z`).getTime();
  const nights = Math.round((end - start) / (24 * 60 * 60 * 1000));
  return Number.isFinite(nights) && nights > 0 ? nights : 0;
}

export function formatMoney(amount: number, currency: string | undefined): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency ?? ""}`.trim();
  }
}

/** Today's date and one week from today, as `YYYY-MM-DD` — Home's defaults. */
export function defaultStayDates(): { checkIn: string; checkOut: string } {
  const toDateString = (d: Date) => d.toISOString().slice(0, 10);
  const today = new Date();
  const checkIn = new Date(today);
  checkIn.setDate(today.getDate() + 7);
  const checkOut = new Date(today);
  checkOut.setDate(today.getDate() + 9);
  return { checkIn: toDateString(checkIn), checkOut: toDateString(checkOut) };
}
