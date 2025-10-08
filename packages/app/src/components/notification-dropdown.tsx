import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useNotificationStore } from "@/store/notification-store";
import dayjs from "dayjs";
import { Bell, BellDot, CheckCheck, Info, Trash2, X } from "lucide-react";
import { useState } from "react";

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, markAllAsRead, removeNotification, clearAll, getUnreadCount } = useNotificationStore();
  const unreadCount = getUnreadCount();

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative flex h-6 w-6 items-center justify-center rounded-full outline-none hover:bg-neutral-200 focus:outline-none focus-visible:ring-0 dark:hover:bg-neutral-700">
          {unreadCount > 0 ? (
            <>
              <BellDot size={18} />
              <span className="-right-1 -top-1 absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 font-bold text-[10px] text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            </>
          ) : (
            <Bell size={18} />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" sideOffset={4} alignOffset={-3} className="w-80 rounded-2xl p-0!">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="font-semibold">
            通知 {unreadCount > 0 && <span className="text-muted-foreground">({unreadCount})</span>}
          </span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span onClick={markAllAsRead}>
                    <CheckCheck size={14} />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left">标记已读</TooltipContent>
              </Tooltip>
            )}
            {notifications.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span onClick={clearAll}>
                    <Trash2 size={14} />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left">清空通知</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Bell size={32} />
              <p className="mt-2">暂无通知</p>
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "group relative rounded-lg border p-2 transition-all hover:shadow-sm",
                    !notification.read && "border-blue-200 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-900/20",
                  )}
                >
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className="absolute top-2 right-2 rounded-full p-1 opacity-0 transition-opacity hover:bg-neutral-200 group-hover:opacity-100 dark:hover:bg-neutral-700"
                  >
                    <X size={14} className="text-neutral-500 dark:text-neutral-400" />
                  </button>
                  <div className="flex items-start gap-2 pr-6">
                    <Info size={16} className="mt-0.5 shrink-0 text-neutral-500 dark:text-neutral-400" />
                    <div className="flex-1">
                      <p className="break-all text-sm">{notification.content}</p>
                      <p className="mt-1 text-muted-foreground text-xs">
                        {dayjs(notification.timestamp).format("YYYY-MM-DD HH:mm:ss")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
