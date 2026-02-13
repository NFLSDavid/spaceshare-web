import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ModeStore {
  isHostMode: boolean;
  setHostMode: (isHost: boolean) => void;
  toggleMode: () => void;
}

export const useModeStore = create<ModeStore>()(
  persist(
    (set) => ({
      isHostMode: false,
      setHostMode: (isHost) => set({ isHostMode: isHost }),
      toggleMode: () => set((state) => ({ isHostMode: !state.isHostMode })),
    }),
    { name: "spaceshare-mode" }
  )
);
