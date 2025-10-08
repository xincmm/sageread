import type { Thread } from "@/types/thread";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThreadState {
  currentThread: Thread | null;
  setCurrentThread: (thread: Thread | null) => void;
  clearCurrentThread: () => void;
}

export const useThreadStore = create<ThreadState>()(
  persist(
    (set) => ({
      currentThread: null,
      setCurrentThread: (thread) => set({ currentThread: thread }),
      clearCurrentThread: () => set({ currentThread: null }),
    }),
    {
      name: "thread-store",
      partialize: () => ({}),
    },
  ),
);
