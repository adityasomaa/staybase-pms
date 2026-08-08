"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { restoreWorkspace } from "@/app/actions";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

/**
 * The lock screen shown when billing has suspended the workspace.
 *
 * It replaces the whole app shell rather than overlaying it, so there is no
 * half-usable UI behind a modal that someone can dismiss with Escape.
 */
export function SuspendedWorkspace({
  amountDue,
  invoiceNumber,
  planName,
}: {
  amountDue: number;
  invoiceNumber: string;
  planName: string;
}) {
  const router = useRouter();
  const [paying, setPaying] = React.useState(false);

  const pay = async () => {
    setPaying(true);
    // A live build charges the saved payment method here and only restores
    // access once the processor confirms.
    await new Promise((resolve) => setTimeout(resolve, 900));
    await restoreWorkspace();
    toast.success("Payment received", { description: `${invoiceNumber} settled.` });
    setPaying(false);
    router.refresh();
  };

  return (
    <main className="flex min-h-svh flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="bg-destructive/10 text-destructive mb-2 flex size-10 items-center justify-center rounded-lg">
            <Lock className="size-5" />
          </div>
          <CardTitle className="text-xl">This workspace is suspended</CardTitle>
          <CardDescription className="text-pretty">
            Invoice {invoiceNumber} passed its due date and the grace period has expired, so
            the {planName} plan is locked until it is settled.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-muted/50 flex items-baseline justify-between rounded-lg border p-3">
            <span className="text-sm font-medium">Amount due</span>
            <span className="tabular text-lg font-semibold">{formatMoney(amountDue)}</span>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-medium">What is still running</p>
            <ul className="text-muted-foreground space-y-1.5">
              <Item ok>Inbound bookings from Channex are still accepted and stored</Item>
              <Item ok>Existing reservations and guest data are untouched</Item>
              <Item>Rate and availability pushes to channels are paused</Item>
              <Item>The dashboard, calendar and reports are locked</Item>
            </ul>
            <p className="text-muted-foreground text-xs text-pretty">
              Inbound stays on because dropping a guest&rsquo;s booking over an unpaid invoice
              would punish the wrong person. Nothing needs re-syncing after you pay.
            </p>
          </div>

          <Separator />

          <p className="text-muted-foreground text-xs">
            Need more time? Reply to the invoice email and we will extend the grace period
            rather than lock an operating hotel out of its own front desk.
          </p>
        </CardContent>

        <CardFooter className="flex-col gap-2">
          <Button className="w-full" onClick={pay} disabled={paying}>
            {paying ? <Loader2 className="size-4 animate-spin" /> : null}
            Pay {formatMoney(amountDue)} and unlock
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => router.refresh()}>
            I have already paid — refresh
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}

function Item({ children, ok }: { children: React.ReactNode; ok?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? (
        <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
      ) : (
        <Lock className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
      )}
      <span className="text-pretty">{children}</span>
    </li>
  );
}
