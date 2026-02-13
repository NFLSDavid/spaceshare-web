"use client";
import { useModeStore } from "@/stores/mode-store";

export function useMode() {
  const { isHostMode, setHostMode, toggleMode } = useModeStore();
  return { isHostMode, setHostMode, toggleMode };
}
