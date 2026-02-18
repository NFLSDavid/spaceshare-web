import { prisma } from "@/lib/prisma";

export const preferencesRepository = {
  findByUser(userId: string) {
    return prisma.preferences.findUnique({ where: { userId } });
  },

  upsert(
    userId: string,
    data: {
      isActive?: boolean;
      latitude?: number | null;
      longitude?: number | null;
      radius?: number;
      email?: string | null;
    },
    defaults?: { email?: string },
  ) {
    return prisma.preferences.upsert({
      where: { userId },
      update: {
        isActive: data.isActive,
        latitude: data.latitude,
        longitude: data.longitude,
        radius: data.radius,
        email: data.email,
      },
      create: {
        userId,
        isActive: data.isActive ?? false,
        latitude: data.latitude,
        longitude: data.longitude,
        radius: data.radius ?? 5,
        email: data.email || defaults?.email,
      },
    });
  },

  findActiveWithLocation() {
    return prisma.preferences.findMany({
      where: {
        isActive: true,
        latitude: { not: null },
        longitude: { not: null },
      },
      include: { user: { select: { email: true, firstName: true } } },
    });
  },
};
