import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import { USER_PUBLIC_SELECT } from "./selects";

const PROFILE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  photoUrl: true,
  isVerified: true,
  governmentId: true,
  showEmail: true,
  showPhone: true,
  createdAt: true,
} as const;

const ADMIN_LIST_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  isVerified: true,
  governmentId: true,
} as const;

export const userRepository = {
  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  findByIdPublic(id: string) {
    return prisma.user.findUnique({ where: { id }, select: USER_PUBLIC_SELECT });
  },

  findByIdProfile(id: string) {
    return prisma.user.findUnique({ where: { id }, select: PROFILE_SELECT });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findAll() {
    return prisma.user.findMany({ select: ADMIN_LIST_SELECT });
  },

  create(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    return prisma.user.create({ data });
  },

  update(id: string, data: Prisma.UserUncheckedUpdateInput) {
    return prisma.user.update({ where: { id }, data });
  },

  findByIdSelect(id: string, select: Prisma.UserSelect) {
    return prisma.user.findUnique({ where: { id }, select });
  },

  async getBlockedUserIds(userId: string): Promise<string[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { blockedUserIds: true },
    });
    return user?.blockedUserIds ?? [];
  },

  async addBlockedUser(userId: string, targetUserId: string) {
    const current = await this.getBlockedUserIds(userId);
    if (current.includes(targetUserId)) return;
    return prisma.user.update({
      where: { id: userId },
      data: { blockedUserIds: [...current, targetUserId] },
    });
  },
};
