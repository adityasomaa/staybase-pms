"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDownUp, Download, Search, SlidersHorizontal } from "lucide-react";

import { formatDate } from "@/lib/date";
import { channelLabels, formatMoney, initials, statusLabels } from "@/lib/format";
import type { ChannelCode, ReservationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChannelPill, EmptyState, StatusPill } from "@/components/tokens";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface ReservationRow {
  id: string;
  reference: string;
  channelReference: string | null;
  guestName: string;
  guestCountry: string;
  channel: ChannelCode;
  status: ReservationStatus;
  paymentStatus: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  roomTypeTitle: string;
  roomNumber: string | null;
  total: number;
  balance: number;
  createdAt: string;
}

type SortKey = "checkIn" | "createdAt" | "total" | "guestName";

const statuses: (ReservationStatus | "all")[] = [
  "all",
  "confirmed",
  "tentative",
  "in_house",
  "checked_out",
  "cancelled",
  "no_show",
];

export function ReservationsTable({ rows }: { rows: ReservationRow[] }) {
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<ReservationStatus | "all">("all");
  const [channel, setChannel] = React.useState<ChannelCode | "all">("all");
  const [sort, setSort] = React.useState<SortKey>("checkIn");
  const [direction, setDirection] = React.useState<"asc" | "desc">("asc");
  const [limit, setLimit] = React.useState(25);

  const channels = React.useMemo(
    () => [...new Set(rows.map((row) => row.channel))],
    [rows],
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = rows.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (channel !== "all" && row.channel !== channel) return false;
      if (!q) return true;
      return (
        row.reference.toLowerCase().includes(q) ||
        row.guestName.toLowerCase().includes(q) ||
        (row.channelReference?.toLowerCase().includes(q) ?? false) ||
        row.roomTypeTitle.toLowerCase().includes(q)
      );
    });

    return result.sort((a, b) => {
      const factor = direction === "asc" ? 1 : -1;
      if (sort === "total") return (a.total - b.total) * factor;
      if (sort === "guestName") return a.guestName.localeCompare(b.guestName) * factor;
      return (a[sort] < b[sort] ? -1 : 1) * factor;
    });
  }, [rows, query, status, channel, sort, direction]);

  const visible = filtered.slice(0, limit);

  const toggleSort = (key: SortKey) => {
    if (sort === key) setDirection((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setDirection(key === "total" || key === "createdAt" ? "desc" : "asc");
    }
  };

  const exportCsv = () => {
    const header = [
      "reference", "channel_reference", "guest", "channel", "status",
      "check_in", "check_out", "nights", "room_type", "total", "balance",
    ];
    const lines = filtered.map((row) =>
      [
        row.reference,
        row.channelReference ?? "",
        row.guestName,
        channelLabels[row.channel],
        statusLabels[row.status],
        row.checkIn,
        row.checkOut,
        row.nights,
        row.roomTypeTitle,
        row.total,
        row.balance,
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `staybase-reservations-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search reference, guest or OTA code…"
            className="h-9 pl-8"
            aria-label="Search reservations"
          />
        </div>

        <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
          <SelectTrigger size="sm" className="w-36">
            <SlidersHorizontal className="size-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((value) => (
              <SelectItem key={value} value={value}>
                {value === "all" ? "All statuses" : statusLabels[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={channel} onValueChange={(value) => setChannel(value as typeof channel)}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            {channels.map((value) => (
              <SelectItem key={value} value={value}>
                {channelLabels[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
          <Download className="size-3.5" />
          <span className="hidden sm:inline">Export CSV</span>
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <EmptyState
              title="No reservations match those filters"
              description="Try clearing the search box or widening the status and channel filters."
              icon={<Search className="size-6" />}
            />
          ) : (
            <div className="scrollbar-thin overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <SortableHead
                      label="Guest"
                      active={sort === "guestName"}
                      direction={direction}
                      onClick={() => toggleSort("guestName")}
                      className="pl-4"
                    />
                    <TableHead>Channel</TableHead>
                    <SortableHead
                      label="Arrival"
                      active={sort === "checkIn"}
                      direction={direction}
                      onClick={() => toggleSort("checkIn")}
                    />
                    <TableHead className="hidden lg:table-cell">Room</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Payment</TableHead>
                    <SortableHead
                      label="Total"
                      active={sort === "total"}
                      direction={direction}
                      onClick={() => toggleSort("total")}
                      className="pr-4 text-right"
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((row) => (
                    <TableRow key={row.id} className="group">
                      <TableCell className="pl-4">
                        <Link
                          href={`/reservations/${row.id}`}
                          className="flex items-center gap-2.5"
                        >
                          <Avatar className="size-7">
                            <AvatarFallback className="text-[10px]">
                              {initials(row.guestName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="grid min-w-0">
                            <span className="truncate text-sm font-medium group-hover:underline">
                              {row.guestName}
                            </span>
                            <span className="text-muted-foreground tabular truncate text-xs">
                              {row.reference}
                              {row.channelReference ? ` · ${row.channelReference}` : ""}
                            </span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <ChannelPill channel={row.channel} />
                      </TableCell>
                      <TableCell className="tabular text-sm whitespace-nowrap">
                        <span className="block">{formatDate(row.checkIn)}</span>
                        <span className="text-muted-foreground text-xs">
                          {row.nights} night{row.nights === 1 ? "" : "s"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden text-sm lg:table-cell">
                        <span className="block truncate">{row.roomTypeTitle}</span>
                        <span className="text-muted-foreground tabular text-xs">
                          {row.roomNumber ? `Room ${row.roomNumber}` : "Unassigned"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusPill status={row.status} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <StatusPill status={row.paymentStatus} />
                      </TableCell>
                      <TableCell className="tabular pr-4 text-right text-sm">
                        <span className="block font-medium">{formatMoney(row.total)}</span>
                        {row.balance > 0 ? (
                          <span className="text-muted-foreground text-xs">
                            {formatMoney(row.balance)} due
                          </span>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground tabular text-sm">
          Showing {visible.length} of {filtered.length} reservations
        </p>
        {limit < filtered.length ? (
          <Button variant="outline" size="sm" onClick={() => setLimit((value) => value + 25)}>
            Load more
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function SortableHead({
  label,
  active,
  direction,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
  className?: string;
}) {
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "hover:text-foreground inline-flex items-center gap-1 transition-colors",
          active && "text-foreground font-medium",
        )}
        aria-label={`Sort by ${label}`}
      >
        {label}
        <ArrowDownUp
          className={cn("size-3", active ? "opacity-100" : "opacity-40")}
          style={active && direction === "desc" ? { transform: "scaleY(-1)" } : undefined}
        />
      </button>
    </TableHead>
  );
}
