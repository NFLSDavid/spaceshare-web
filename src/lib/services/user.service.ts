import { ApiError } from "@/lib/api-utils";
import { userRepository } from "@/lib/repositories";

export const userService = {
  async getUser(userId: string) {
    const user = await userRepository.findByIdProfile(userId);
    return user;
  },

  async getAllUsers(requestingUserId: string, isAdmin: boolean) {
    if (!isAdmin) {
      throw new ApiError(403, "Forbidden");
    }
    return userRepository.findAll();
  },

  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      photoUrl?: string;
      governmentId?: string;
    },
  ) {
    return userRepository.update(userId, {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      photoUrl: data.photoUrl,
      governmentId: data.governmentId,
      // Reset verification when government ID is updated
      isVerified: data.governmentId ? 0 : undefined,
    });
  },

  async updateVerification(
    adminUserId: string,
    isAdmin: boolean,
    targetUserId: string,
    isVerified: number,
  ) {
    if (!isAdmin) {
      throw new ApiError(403, "Forbidden");
    }
    return userRepository.update(targetUserId, { isVerified });
  },
};
