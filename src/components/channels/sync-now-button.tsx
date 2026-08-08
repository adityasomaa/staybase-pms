"use client";

import * as React from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/** Triggers a full 30-day ARI push and reports what Channex accepted. */
export function SyncNowButton() {
  const [pending, setPending] = React.useState(false);

  const run = async () => {
    setPending(true);
    try {
      const response = await fetch("/api/channex/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ days: 30, scope: "ari" }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        mode: string;
        reason?: string;
        error?: string;
        plan?: {
          availabilityValues: number;
          restrictionValues: number;
          unmappedRoomTypes: string[];
          unmappedRatePlans: string[];
        };
      };

      if (!result.ok) {
        toast.error("Sync failed", { description: result.error });
        return;
      }

      const skipped = [
        ...(result.plan?.unmappedRoomTypes ?? []),
        ...(result.plan?.unmappedRatePlans ?? []),
      ];
      const summary = `${result.plan?.availabilityValues ?? 0} availability + ${result.plan?.restrictionValues ?? 0} rate values${
        skipped.length ? ` · skipped ${skipped.join(", ")}` : ""
      }`;

      if (result.mode === "dry-run") {
        toast.warning("Dry run — nothing was sent", {
          description: `${result.reason}. Prepared ${summary}.`,
        });
      } else {
        toast.success("Channex accepted the push", { description: summary });
      }
    } catch (error) {
      toast.error("Sync failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <Button size="sm" onClick={run} disabled={pending} className="gap-1.5">
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
      Sync 30 days
    </Button>
  );
}
