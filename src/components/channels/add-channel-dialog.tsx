"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleCheck, Clock, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface OtaOption {
  slug: string;
  name: string;
  category: string;
  categoryLabel: string;
  summary: string;
  regions: string[];
  commissionRange: [number, number];
  averageSetupDays: number;
  connected: boolean;
}

/**
 * Channel picker.
 *
 * Choosing an OTA does not create anything — it opens that channel's own
 * setup guide, because every connection starts in the OTA's extranet rather
 * than here, and pretending otherwise is how people get stuck.
 */
export function AddChannelDialog({
  options,
  openOnMount = false,
}: {
  options: OtaOption[];
  openOnMount?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(openOnMount);
  const [query, setQuery] = React.useState("");

  const filtered = options.filter((option) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      option.name.toLowerCase().includes(q) ||
      option.regions.join(" ").toLowerCase().includes(q) ||
      option.categoryLabel.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        Add channel
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] gap-4 overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add a channel</DialogTitle>
            <DialogDescription className="text-pretty">
              Every connection starts in the OTA&rsquo;s own extranet, where you nominate
              Channex as your provider. Pick a channel to see exactly what it needs.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, region or type…"
              className="pl-8"
              aria-label="Search channels"
            />
          </div>

          <div className="scrollbar-thin -mx-1 max-h-[52vh] space-y-2 overflow-y-auto px-1">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No channel matches &ldquo;{query}&rdquo;.
              </p>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.slug}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(`/channels/connect/${option.slug}`);
                  }}
                  className={cn(
                    "hover:bg-muted/60 focus-visible:ring-ring group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
                    option.connected && "border-emerald-500/30 bg-emerald-500/5",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium">{option.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {option.categoryLabel}
                      </Badge>
                      {option.connected ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-emerald-500/25 bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-400"
                        >
                          <CircleCheck className="size-3" />
                          Connected
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs text-pretty">
                      {option.summary}
                    </p>
                    <p className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                      <span>{option.regions.join(", ")}</span>
                      <span className="tabular">
                        {option.commissionRange[0]}–{option.commissionRange[1]}% typical
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        ~{option.averageSetupDays}d setup
                      </span>
                    </p>
                  </div>
                  <ArrowRight className="text-muted-foreground mt-1 size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
