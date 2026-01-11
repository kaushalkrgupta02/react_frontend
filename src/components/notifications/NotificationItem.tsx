import { CalendarCheck, Ticket, Crown, Gift, Bell, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  body: string | null;
  type: string;
  deep_link: string | null;
  read_at: string | null;
  created_at: string;
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'booking':
      return CalendarCheck;
    case 'line_skip':
      return Ticket;
    case 'membership':
      return Crown;
    case 'promo':
      return Gift;
    default:
      return Bell;
  }
};

const getIconColor = (type: string) => {
  switch (type) {
    case 'booking':
      return 'text-primary bg-primary/10';
    case 'line_skip':
      return 'text-accent bg-accent/10';
    case 'membership':
      return 'text-amber-500 bg-amber-500/10';
    case 'promo':
      return 'text-emerald-500 bg-emerald-500/10';
    default:
      return 'text-muted-foreground bg-secondary';
  }
};

export default function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const Icon = getIcon(notification.type);
  const iconColor = getIconColor(notification.type);
  const isUnread = !notification.read_at;
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-secondary/50",
        isUnread && "bg-primary/5"
      )}
    >
      {/* Icon */}
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", iconColor)}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className={cn(
            "text-sm line-clamp-1",
            isUnread ? "font-semibold text-foreground" : "font-medium text-foreground/80"
          )}>
            {notification.title}
          </h4>
          {isUnread && (
            <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
          )}
        </div>
        {notification.body && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.body}
          </p>
        )}
        <p className="text-xs text-muted-foreground/60 mt-1">
          {timeAgo}
        </p>
      </div>

      {/* Arrow */}
      {notification.deep_link && (
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2" />
      )}
    </button>
  );
}