import { useLayoutStore } from "@/store/layout-store";
import { useLocation } from "react-router";

export function useIsChatPage(): boolean {
  const isHomeActive = useLayoutStore((state) => state.isHomeActive);
  const location = useLocation();
  return isHomeActive && location.pathname === "/chat";
}
