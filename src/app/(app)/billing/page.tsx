import type { Metadata } from "next";
import {
  Building2,
  CalendarClock,
  CircleCheck,
  CreditCard,
  Download,
  Receipt,
  TriangleAlert,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  PayInvoiceButton,
  SimulateSuspensionButton,
} from "@/components/billing/billing-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
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
import { formatDate } from "@/lib/date";
import { formatMoney, formatMoneyCompact } from "@/lib/format";
import type { InvoiceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getBillingOverview } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Billing" };

const invoiceTone: Record<InvoiceStatus, string> = {
  paid: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  open: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  past_due: "border-destructive/20 bg-destructive/10 text-destructive",
  void: "text-muted-foreground",
};

const invoiceLabels: Record<InvoiceStatus, string> = {
  paid: "Paid",
  open: "Open",
  past_due: "Past due",
  void: "Void",
};

export default function BillingPage() {
  const {
    subscription,
    plan,
    plans,
    invoices,
    outstanding,
    amountDue,
    daysUntilSuspension,
    nextInvoiceEstimate,
  } = getBillingOverview();

  const graceUsed =
    daysUntilSuspension === null
      ? 0
      : Math.min(
          100,
          Math.max(0, ((subscription.graceDays - daysUntilSuspension) / subscription.graceDays) * 100),
        );

  return (
    <>
      <PageHeader
        title="Billing"
        description="The subscription is billed monthly on sellable rooms across every property. An unpaid invoice warns first, then locks the workspace once the grace period runs out."
        actions={
          <>
            <SimulateSuspensionButton />
            <PayInvoiceButton
              amountDue={amountDue}
              invoiceNumber={outstanding[0]?.number ?? "—"}
              cardLast4={subscription.paymentMethod?.last4 ?? null}
            />
          </>
        }
      />

      {outstanding.length > 0 ? (
        <Card className="border-destructive/30 bg-destructive/5 gap-3 py-4">
          <CardContent className="space-y-3 px-4">
            <div className="flex items-start gap-3">
              <TriangleAlert className="text-destructive mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {formatMoney(amountDue)} outstanding on {outstanding[0].number}
                </p>
                <p className="text-muted-foreground text-sm text-pretty">
                  Due {formatDate(outstanding[0].dueAt)}.{" "}
                  {daysUntilSuspension !== null && daysUntilSuspension > 0
                    ? `The workspace locks in ${daysUntilSuspension} day${daysUntilSuspension === 1 ? "" : "s"} if it stays unpaid.`
                    : "The grace period has expired and the workspace can be locked at any time."}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground flex justify-between text-xs">
                <span>Grace period</span>
                <span className="tabular">
                  {Math.max(0, daysUntilSuspension ?? 0)} of {subscription.graceDays} days left
                </span>
              </div>
              <Progress value={graceUsed} />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current plan"
          value={plan.name}
          hint={`${formatMoneyCompact(plan.pricePerRoom)} per room / month`}
          icon={CreditCard}
        />
        <StatCard
          label="Billable rooms"
          value={String(subscription.billableRooms)}
          hint={`${subscription.properties} propert${subscription.properties === 1 ? "y" : "ies"}`}
          icon={Building2}
        />
        <StatCard
          label="Next invoice"
          value={formatMoneyCompact(nextInvoiceEstimate)}
          hint={`issued ${formatDate(subscription.currentPeriodEnd)}`}
          icon={CalendarClock}
        />
        <StatCard
          label="Outstanding"
          value={formatMoneyCompact(amountDue)}
          hint={outstanding.length ? `${outstanding.length} unpaid invoice` : "all settled"}
          icon={Receipt}
          invertDelta
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="gap-4 lg:col-span-2">
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>Six most recent billing periods.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="scrollbar-thin overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Invoice</TableHead>
                    <TableHead className="hidden sm:table-cell">Period</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="pr-6" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="tabular pl-6 text-sm font-medium">
                        {invoice.number}
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular hidden text-xs sm:table-cell">
                        {formatDate(invoice.periodStart)} → {formatDate(invoice.periodEnd)}
                      </TableCell>
                      <TableCell className="tabular text-sm">
                        {formatDate(invoice.dueAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(invoiceTone[invoice.status])}>
                          {invoiceLabels[invoice.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular text-right text-sm">
                        {formatMoney(invoice.total)}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <Button variant="ghost" size="icon" className="size-7" aria-label="Download invoice">
                          <Download className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="text-base">Payment method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {subscription.paymentMethod ? (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <CreditCard className="text-muted-foreground size-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {subscription.paymentMethod.brand} ending{" "}
                      {subscription.paymentMethod.last4}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Expires {subscription.paymentMethod.expiry}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No card on file.</p>
              )}
              <Button variant="outline" size="sm" className="w-full">
                Update card
              </Button>
              <p className="text-muted-foreground text-xs text-pretty">
                Card details are collected by the payment processor&rsquo;s hosted form.
                STAYBASE stores a token, never a card number.
              </p>
            </CardContent>
          </Card>

          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="text-base">What suspension does</CardTitle>
              <CardDescription>After the grace period expires.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Line ok>Inbound Channex bookings keep being accepted</Line>
              <Line ok>Reservation and guest data stay intact</Line>
              <Line>Rate and availability pushes pause</Line>
              <Line>The app locks to this page</Line>
              <Separator className="my-1" />
              <p className="text-muted-foreground text-xs text-pretty">
                Inbound stays on deliberately. Dropping a guest&rsquo;s booking over an unpaid
                invoice would punish the wrong person, and it means nothing needs re-syncing
                once you pay.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Plans</CardTitle>
          <CardDescription>
            Priced per sellable room with a monthly minimum. Changing plan takes effect on the
            next billing period.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {plans.map((option) => {
            const current = option.id === subscription.planId;
            return (
              <Card
                key={option.id}
                className={cn("gap-3 py-4", current && "border-primary ring-primary/20 ring-1")}
              >
                <CardHeader className="px-4">
                  <CardTitle className="text-base">{option.name}</CardTitle>
                  <CardDescription>
                    {formatMoney(option.pricePerRoom)} per room · min{" "}
                    {formatMoneyCompact(option.minimumMonthly)}
                  </CardDescription>
                  {current ? (
                    <CardAction>
                      <Badge variant="secondary">Current</Badge>
                    </CardAction>
                  ) : null}
                </CardHeader>
                <CardContent className="px-4">
                  <ul className="space-y-1.5 text-sm">
                    {option.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <CircleCheck className="text-primary mt-0.5 size-3.5 shrink-0" />
                        <span className="text-pretty">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="px-4">
                  <Button
                    variant={current ? "outline" : "default"}
                    size="sm"
                    className="w-full"
                    disabled={current}
                  >
                    {current ? "Current plan" : `Switch to ${option.name}`}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}

function Line({ children, ok }: { children: React.ReactNode; ok?: boolean }) {
  return (
    <p className="flex items-start gap-2">
      <span
        className={cn(
          "mt-1.5 size-1.5 shrink-0 rounded-full",
          ok ? "bg-emerald-500" : "bg-amber-500",
        )}
      />
      <span className="text-muted-foreground text-pretty">{children}</span>
    </p>
  );
}
