import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read_at).length,
    [items],
  );

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }

    let isCancelled = false;

    const load = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(25);

      if (isCancelled) return;

      if (error) {
        console.error("Failed to load notifications:", error);
        setIsLoading(false);
        return;
      }

      setItems((data ?? []) as NotificationRow[]);
      setIsLoading(false);
    };

    load();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as NotificationRow;

          setItems((prev) => {
            const exists = prev.some((n) => n.id === notification.id);
            if (exists) return prev;
            return [notification, ...prev].slice(0, 25);
          });

          toast(notification.title, {
            description: notification.body ?? undefined,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;

    const unreadIds = items.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) return;

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .in("id", unreadIds);

    if (error) {
      console.error("Failed to mark notifications read:", error);
      return;
    }

    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
  };

  const markAsRead = async (notificationId: string) => {
    const notification = items.find((n) => n.id === notificationId);
    if (!notification || notification.read_at) return;

    const now = new Date().toISOString();

    // Only update if it has a user_id (not broadcast)
    if (notification.user_id) {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: now })
        .eq("id", notificationId);

      if (error) {
        console.error("Failed to mark notification read:", error);
        return;
      }
    }

    setItems((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read_at: now } : n))
    );
  };

  return {
    items,
    unreadCount,
    isLoading,
    markAllRead,
    markAsRead,
  };
}
