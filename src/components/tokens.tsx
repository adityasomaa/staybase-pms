import { channelLabels, channelTone, statusLabels, statusTone } from "@/lib/format";
import type { ChannelCode } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Small pill used everywhere a reservation/payment/room status appears. */
export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
        statusTone[status] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}

export function ChannelPill({
  channel,
  className,
}: {
  channel: ChannelCode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
        channelTone[channel],
        className,
      )}
    >
      {channelLabels[channel]}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center">
      {icon ? <div className="text-muted-foreground/60">{icon}</div> : null}
      <p className="text-sm font-medium">{title}</p>
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">{description}</p>
    </div>
  );
}
