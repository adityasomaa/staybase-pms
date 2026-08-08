import type { Metadata } from "next";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleAlert,
  CircleCheck,
  Link2,
  Plug,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { SyncNowButton } from "@/components/channels/sync-now-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isChannexConfigured } from "@/lib/channex/client";
import { formatDateTime, relativeTime } from "@/lib/date";
import { channelLabels, formatMoneyCompact, formatPercent } from "@/lib/format";
import type { ChannelConnectionState, SyncOutcome } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  activeProperty,
  channelConnections,
  ratePlans,
  roomTypes,
  syncEvents,
} from "@/lib/data/queries";

export const metadata: Metadata = { title: "Channels" };

const stateTone: Record<ChannelConnectionState, string> = {
  connected: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  disabled: "bg-muted text-muted-foreground border-border",
};

const outcomeIcon: Record<SyncOutcome, React.ReactNode> = {
  success: <CircleCheck className="size-3.5 text-emerald-500" />,
  warning: <TriangleAlert className="size-3.5 text-amber-500" />,
  error: <CircleAlert className="text-destructive size-3.5" />,
};

export default function ChannelsPage() {
  const connected = channelConnections.filter((c) => c.state === "connected");
  const errors = channelConnections.filter((c) => c.state === "error");
  const revenue30d = channelConnections.reduce((sum, c) => sum + c.revenue30d, 0);
  const commissionCost = channelConnections.reduce(
    (sum, c) => sum + (c.revenue30d * c.commissionPct) / 100,
    0,
  );
  const mappedRoomTypes = roomTypes.filter((rt) => rt.channexId).length;
  const mappedRatePlans = ratePlans.filter((rp) => rp.channexId).length;
  const failedSyncs = syncEvents.filter((e) => e.outcome === "error").length;

  return (
    <>
      <PageHeader
        title="Channels"
        description={`Connectivity is provided by Channex. STAYBASE pushes availability, rates and restrictions in one batch, and receives bookings back over a signed webhook.`}
        actions={<SyncNowButton />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Live channels"
          value={`${connected.length}/${channelConnections.length}`}
          hint={errors.length ? `${errors.length} need attention` : "all healthy"}
          icon={Plug}
        />
        <StatCard
          label="Channel revenue (30d)"
          value={formatMoneyCompact(revenue30d)}
          hint={`${formatMoneyCompact(commissionCost)} paid in commission`}
          icon={ArrowDownToLine}
        />
        <StatCard
          label="Mapped entities"
          value={`${mappedRoomTypes + mappedRatePlans}`}
          hint={`${mappedRoomTypes}/${roomTypes.length} room types · ${mappedRatePlans}/${ratePlans.length} rate plans`}
          icon={Link2}
        />
        <StatCard
          label="Failed syncs (48h)"
          value={String(failedSyncs)}
          hint={failedSyncs ? "review the journal below" : "no failures"}
          icon={RefreshCw}
          invertDelta
        />
      </div>

      {!isChannexConfigured() ? (
        <Card className="border-amber-500/30 bg-amber-500/5 py-4">
          <CardContent className="flex items-start gap-3 px-4">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <div className="text-sm">
              <p className="font-medium">Running in dry-run mode</p>
              <p className="text-muted-foreground text-pretty">
                No <code className="tabular">CHANNEX_API_KEY</code> is present, so pushes are
                simulated and the figures below come from the bundled demo dataset. Add the key
                in Settings › Connectivity to connect the live account.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {channelConnections.map((channel) => {
          const mappingRatio = channel.mappedRoomTypes / Math.max(1, channel.totalRoomTypes);
          return (
            <Card key={channel.code} className="gap-3 py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-base">{channel.name}</CardTitle>
                <CardDescription className="tabular truncate text-xs">
                  {channel.channexId ?? "Not registered on Channex"}
                </CardDescription>
                <CardAction>
                  <Badge variant="outline" className={cn("capitalize", stateTone[channel.state])}>
                    {channel.state}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-3 px-4">
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-muted-foreground">Room type mapping</span>
                    <span className="tabular font-medium">
                      {channel.mappedRoomTypes}/{channel.totalRoomTypes}
                    </span>
                  </div>
                  <Progress value={mappingRatio * 100} />
                </div>

                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Bookings 30d</dt>
                    <dd className="tabular font-medium">{channel.bookings30d}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Revenue</dt>
                    <dd className="tabular font-medium">
                      {formatMoneyCompact(channel.revenue30d)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Commission</dt>
                    <dd className="tabular font-medium">{formatPercent(channel.commissionPct, 0)}</dd>
                  </div>
                </dl>

                {channel.errorMessage ? (
                  <p className="text-destructive bg-destructive/5 border-destructive/20 rounded-md border p-2 text-xs text-pretty">
                    {channel.errorMessage}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    {channel.lastSyncAt
                      ? `Last sync ${relativeTime(channel.lastSyncAt)}`
                      : "Waiting for the first handshake"}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Sync journal</CardTitle>
          <CardDescription>
            Every ARI push and booking pull for {activeProperty.title}, newest first.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="scrollbar-thin overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">When</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead className="hidden sm:table-cell">Channel</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead className="hidden md:table-cell">Payload</TableHead>
                  <TableHead className="pr-6 text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncEvents.slice(0, 20).map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="tabular pl-6 text-xs whitespace-nowrap">
                      {formatDateTime(event.at)}
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                        {event.direction === "push" ? (
                          <ArrowUpFromLine className="size-3" />
                        ) : (
                          <ArrowDownToLine className="size-3" />
                        )}
                        {event.direction}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-xs sm:table-cell">
                      {event.channel ? channelLabels[event.channel] : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-1.5">
                        {outcomeIcon[event.outcome]}
                        <div className="min-w-0">
                          <p className="text-xs font-medium capitalize">{event.kind}</p>
                          <p className="text-muted-foreground text-xs text-pretty">
                            {event.message}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular hidden text-xs md:table-cell">
                      {(event.payloadSize / 1024).toFixed(1)} KB
                    </TableCell>
                    <TableCell className="tabular pr-6 text-right text-xs">
                      {event.durationMs} ms
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <Separator />
        <CardContent className="text-muted-foreground text-xs">
          Bookings arrive at <code className="tabular">/api/channex/webhook</code> and are
          acknowledged back to Channex so they leave the feed. ARI is pushed from{" "}
          <code className="tabular">/api/channex/sync</code> in batches of 500 values.
        </CardContent>
      </Card>
    </>
  );
}
