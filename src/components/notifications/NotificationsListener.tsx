import { ReactNode } from "react";
import { useNotifications } from "@/hooks/useNotifications";

export default function NotificationsListener({ children }: { children: ReactNode }) {
  // Side-effect hook (realtime subscription + toast)
  useNotifications();
  return <>{children}</>;
}
