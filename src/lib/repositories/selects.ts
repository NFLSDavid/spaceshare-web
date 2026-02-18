/**
 * Shared Prisma select constants reused across multiple repositories.
 * Single source of truth for common field selections.
 */

export const USER_PUBLIC_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  photoUrl: true,
} as const;
