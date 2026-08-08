"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { suspendWorkspace } from "@/app/actions";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

/**
 * Pay the outstanding balance.
 *
 * Card details are never handled here — a live build hands off to the payment
 * processor's hosted element and only ever sees the resulting token.
 */
export function PayInvoiceButton({
  amountDue,
  invoiceNumber,
  cardLast4,
}: {
  amountDue: number;
  invoiceNumber: string;
  cardLast4: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [paying, setPaying] = React.useState(false);

  const pay = async () => {
    setPaying(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setPaying(false);
    setOpen(false);
    toast.success("Payment received", {
      description: `${invoiceNumber} settled — ${formatMoney(amountDue)}.`,
    });
    router.refresh();
  };

  if (amountDue <= 0) {
    return (
      <Button size="sm" variant="outline" disabled className="gap-1.5">
        <ShieldCheck className="size-3.5" />
        Nothing outstanding
      </Button>
    );
  }

  return (
    <>
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <CreditCard className="size-3.5" />
        Pay {formatMoney(amountDue)}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay outstanding balance</DialogTitle>
            <DialogDescription>
              {invoiceNumber} · {formatMoney(amountDue)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {cardLast4 ? (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <CreditCard className="text-muted-foreground size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Card ending {cardLast4}</p>
                  <p className="text-muted-foreground text-xs">Saved payment method</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="card">Card number</Label>
                <Input id="card" inputMode="numeric" placeholder="Handled by the processor" disabled />
                <p className="text-muted-foreground text-xs text-pretty">
                  Card entry is handled by the payment processor&rsquo;s hosted form, so card
                  numbers never reach STAYBASE.
                </p>
              </div>
            )}

            <Separator />
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Total charged today</span>
              <span className="tabular font-semibold">{formatMoney(amountDue)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={pay} disabled={paying}>
              {paying ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirm payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Demo control for the enforcement path.
 *
 * Suspension is normally reached by an unpaid invoice ageing past its grace
 * period. There is no way to wait that out in a demo, so this triggers the
 * same state directly.
 */
export function SimulateSuspensionButton() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await suspendWorkspace();
        router.refresh();
      }}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Lock className="size-3.5" />}
      Preview suspension
    </Button>
  );
}
