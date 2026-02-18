import { preferencesRepository } from "@/lib/repositories";

export const preferencesService = {
  async getPreferences(userId: string) {
    const prefs = await preferencesRepository.findByUser(userId);
    return prefs || { userId, isActive: false, radius: 5 };
  },

  async updatePreferences(
    userId: string,
    userEmail: string,
    data: {
      isActive?: boolean;
      latitude?: number | null;
      longitude?: number | null;
      radius?: number;
      email?: string | null;
    },
  ) {
    return preferencesRepository.upsert(userId, data, { email: userEmail });
  },
};
