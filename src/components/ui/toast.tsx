"use client";
import { create } from "zustand";
import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { X, CheckCircle, AlertCircle } from "lucide-react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type: "success" | "error") => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type) => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export function toast(message: string, type: "success" | "error" = "success") {
  useToastStore.getState().addToast(message, type);
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-white shadow-lg transition-all",
            t.type === "success" ? "bg-green-600" : "bg-red-600"
          )}
        >
          {t.type === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span>{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="ml-2">
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
