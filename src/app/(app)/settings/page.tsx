import type { Metadata } from "next";
import { CircleCheck, CircleX, ExternalLink, KeyRound, Webhook } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isChannexConfigured } from "@/lib/channex/client";
import { isDatabaseConfigured } from "@/db";
import { activeProperty, properties, ratePlans, roomTypes } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Settings" };

const envVars = [
  {
    key: "CHANNEX_API_KEY",
    description: "User API key from the Channex dashboard. Required for any live push or pull.",
    required: true,
  },
  {
    key: "CHANNEX_BASE_URL",
    description:
      "https://staging.channex.io/api/v1 for the sandbox, https://app.channex.io/api/v1 in production.",
    required: false,
  },
  {
    key: "CHANNEX_WEBHOOK_SECRET",
    description:
      "Shared secret used to verify the HMAC signature on inbound webhooks. Strongly recommended.",
    required: false,
  },
  {
    key: "DATABASE_URL",
    description:
      "Postgres connection string. Without it STAYBASE runs entirely on the bundled demo dataset.",
    required: false,
  },
];

export default function SettingsPage() {
  const channexReady = isChannexConfigured();
  const dbReady = isDatabaseConfigured();
  const webhookSecretSet = Boolean(process.env.CHANNEX_WEBHOOK_SECRET);
  const baseUrl = process.env.CHANNEX_BASE_URL ?? "https://staging.channex.io/api/v1";

  return (
    <>
      <PageHeader
        title="Settings"
        description="Property profile and the connectivity credentials STAYBASE uses to talk to Channex."
      />

      <Tabs defaultValue="connectivity">
        <TabsList>
          <TabsTrigger value="connectivity">Connectivity</TabsTrigger>
          <TabsTrigger value="property">Property</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
        </TabsList>

        <TabsContent value="connectivity" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <KeyRound className="size-4" />
                  Channex account
                </CardTitle>
                <CardDescription>
                  Credentials live in environment variables and are never rendered to the browser.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <StatusRow label="API key" ok={channexReady} okLabel="Configured" offLabel="Missing" />
                <StatusRow
                  label="Webhook signature"
                  ok={webhookSecretSet}
                  okLabel="Verified"
                  offLabel="Unsigned"
                />
                <StatusRow label="Database" ok={dbReady} okLabel="Connected" offLabel="Demo data" />
                <Separator />
                {/* Read-only identifiers are rendered as wrapping code rather
                    than inputs — a UUID or a full URL is wider than the field
                    and was being clipped with no way to scroll it. */}
                <ReadOnlyValue label="API base URL" value={baseUrl} />
                <ReadOnlyValue
                  label="Channex property ID"
                  value={activeProperty.channexId ?? "not registered"}
                />
              </CardContent>
              <CardFooter className="gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="https://docs.channex.io" target="_blank" rel="noreferrer">
                    Channex docs
                    <ExternalLink className="size-3.5" />
                  </a>
                </Button>
              </CardFooter>
            </Card>

            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Webhook className="size-4" />
                  Webhook
                </CardTitle>
                <CardDescription>
                  Register this callback per property with an event mask covering bookings and
                  sync errors.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ReadOnlyValue
                  label="Callback URL"
                  value="https://staybase-pms.vercel.app/api/channex/webhook"
                />
                <div className="space-y-1.5">
                  <Label>Event mask</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {["booking", "booking_new", "booking_modification", "booking_cancellation", "sync_error", "ari"].map(
                      (event) => (
                        <Badge key={event} variant="secondary" className="tabular text-xs">
                          {event}
                        </Badge>
                      ),
                    )}
                  </div>
                </div>
                <p className="text-muted-foreground text-xs text-pretty">
                  Register with <code className="tabular">send_data: true</code> so the booking
                  payload arrives inline — it removes a round trip per reservation and keeps the
                  handler within the serverless timeout.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="text-base">Mapping summary</CardTitle>
              <CardDescription>
                Anything unmapped is silently skipped when ARI is pushed.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Metric
                label="Properties registered"
                value={`${properties.filter((p) => p.channexId).length}/${properties.length}`}
              />
              <Metric
                label="Room types mapped"
                value={`${roomTypes.filter((rt) => rt.channexId).length}/${roomTypes.length}`}
              />
              <Metric
                label="Rate plans mapped"
                value={`${ratePlans.filter((rp) => rp.channexId).length}/${ratePlans.length}`}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="property" className="mt-4 space-y-4">
          {properties.map((property) => (
            <Card key={property.id} className="gap-4">
              <CardHeader>
                <CardTitle className="text-base">{property.title}</CardTitle>
                <CardDescription>
                  {property.city}, {property.country} · {property.rooms} rooms ·{" "}
                  {property.currency}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Property code" value={property.code} />
                <Metric label="Timezone" value={property.timezone} />
                <Metric label="Currency" value={property.currency} />
                <Metric
                  label="Channex"
                  value={property.channexId ? "Registered" : "Not registered"}
                />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="environment" className="mt-4">
          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="text-base">Environment variables</CardTitle>
              <CardDescription>
                Set these in Vercel › Project Settings › Environment Variables, then redeploy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {envVars.map((variable) => {
                const present = Boolean(process.env[variable.key]);
                return (
                  <div
                    key={variable.key}
                    className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-start sm:gap-3"
                  >
                    <code className="tabular text-sm font-medium">{variable.key}</code>
                    <p className="text-muted-foreground flex-1 text-xs text-pretty">
                      {variable.description}
                    </p>
                    <Badge
                      variant="outline"
                      className={
                        present
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : variable.required
                            ? "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                      }
                    >
                      {present ? "Set" : variable.required ? "Required" : "Optional"}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function ReadOnlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <code className="bg-muted/60 tabular block rounded-md border px-2.5 py-1.5 text-xs break-all">
        {value}
      </code>
    </div>
  );
}

function StatusRow({
  label,
  ok,
  okLabel,
  offLabel,
}: {
  label: string;
  ok: boolean;
  okLabel: string;
  offLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`inline-flex items-center gap-1.5 font-medium ${
          ok ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
        }`}
      >
        {ok ? <CircleCheck className="size-3.5" /> : <CircleX className="size-3.5" />}
        {ok ? okLabel : offLabel}
      </span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
