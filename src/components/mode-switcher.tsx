"use client";
import { useModeStore } from "@/stores/mode-store";
import { ArrowLeftRight } from "lucide-react";

export function ModeSwitcher() {
  const { isHostMode, toggleMode } = useModeStore();

  return (
    <button
      onClick={toggleMode}
      className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
    >
      <ArrowLeftRight className="h-4 w-4" />
      {isHostMode ? "Switch to Client" : "Switch to Host"}
    </button>
  );
}
