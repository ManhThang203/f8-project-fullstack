/** Badge số thông báo chưa đọc — đặt trong phần tử `relative`. */
export function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="bg-primary text-primary-foreground absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none">
      {count > 99 ? '99+' : count}
    </span>
  );
}
