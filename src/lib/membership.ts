/**
 * Pick the salon a user acts on. Concierge v1 = one membership per user, so we
 * deterministically take the first. A future salon-switcher can pass a preferred id.
 */
export function pickActiveSalonId(
  memberships: { salonId: number }[],
): number | null {
  return memberships[0]?.salonId ?? null;
}
