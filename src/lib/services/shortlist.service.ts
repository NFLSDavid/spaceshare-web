import { shortlistRepository } from "@/lib/repositories";
import { listingRepository } from "@/lib/repositories";

export const shortlistService = {
  async getShortlist(userId: string) {
    const shortlist = await shortlistRepository.findByUser(userId);

    if (!shortlist || shortlist.listingIds.length === 0) {
      return [];
    }

    return listingRepository.findActiveByIds(shortlist.listingIds);
  },

  async updateShortlist(
    userId: string,
    listingId: string,
    action: "add" | "remove" | "toggle",
  ) {
    let shortlist = await shortlistRepository.findByUser(userId);

    const currentIds = shortlist?.listingIds ?? [];
    let newListingIds = [...currentIds];
    const isInList = newListingIds.includes(listingId);

    if (action === "add" && !isInList) {
      newListingIds.push(listingId);
    } else if (action === "remove" && isInList) {
      newListingIds = newListingIds.filter((id) => id !== listingId);
    } else if (action === "toggle") {
      if (isInList) {
        newListingIds = newListingIds.filter((id) => id !== listingId);
      } else {
        newListingIds.push(listingId);
      }
    }

    return shortlistRepository.upsert(userId, newListingIds);
  },
};
