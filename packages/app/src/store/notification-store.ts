import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Notification {
  id: string;
  content: string;
  timestamp: number;
  read: boolean;
}

interface NotificationStore {
  notifications: Notification[];

  addNotification: (content: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  getUnreadCount: () => number;
}

const MAX_NOTIFICATIONS = 100;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],

      addNotification: (content: string) => {
        const newNotification: Notification = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content,
          timestamp: Date.now(),
          read: false,
        };

        set((state) => {
          const now = Date.now();
          let notifications = [newNotification, ...state.notifications];

          notifications = notifications.filter((n) => now - n.timestamp < MAX_AGE_MS);

          if (notifications.length > MAX_NOTIFICATIONS) {
            notifications = notifications.slice(0, MAX_NOTIFICATIONS);
          }

          return { notifications };
        });
      },

      markAsRead: (id: string) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
      },

      removeNotification: (id: string) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      clearAll: () => {
        set({ notifications: [] });
      },

      getUnreadCount: () => {
        return get().notifications.filter((n) => !n.read).length;
      },
    }),
    {
      name: "notification-store",
    },
  ),
);
