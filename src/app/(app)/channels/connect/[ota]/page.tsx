import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Globe,
  KeyRound,
  Percent,
  TriangleAlert,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ConnectChannelForm } from "@/components/channels/connect-channel-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getOta, otaCatalog, otaCategoryLabels } from "@/lib/ota/catalog";
import { channelConnections, ratePlans, roomTypes } from "@/lib/data/queries";

type Props = { params: Promise<{ ota: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { ota } = await props.params;
  const definition = getOta(ota);
  return { title: definition ? `Connect ${definition.name}` : "Connect a channel" };
}

export function generateStaticParams() {
  return otaCatalog.map((ota) => ({ ota: ota.slug }));
}

export default async function ConnectOtaPage(props: Props) {
  const { ota } = await props.params;
  const definition = getOta(ota);
  if (!definition) notFound();

  const existing = channelConnections.find(
    (channel) => channel.name.toLowerCase() === definition.name.toLowerCase(),
  );
  const mappableRoomTypes = roomTypes.length;
  const mappableRatePlans = ratePlans.length;

  return (
    <>
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-2 gap-1.5" asChild>
          <Link href="/channels">
            <ArrowLeft className="size-3.5" />
            All channels
          </Link>
        </Button>
        <PageHeader
          title={`Connect ${definition.name}`}
          description={definition.summary}
          actions={
            <Button variant="outline" size="sm" asChild>
              <a href={definition.docsUrl} target="_blank" rel="noreferrer">
                Channex docs
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          }
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{otaCategoryLabels[definition.category]}</Badge>
        <Badge variant="outline" className="gap-1">
          <Globe className="size-3" />
          {definition.regions.join(", ")}
        </Badge>
        <Badge variant="outline" className="tabular gap-1">
          <Percent className="size-3" />
          {definition.commissionRange[0]}–{definition.commissionRange[1]}% typical commission
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Clock className="size-3" />
          about {definition.averageSetupDays} day
          {definition.averageSetupDays === 1 ? "" : "s"} to go live
        </Badge>
        <Badge variant="outline">
          {definition.rateModel === "per_person"
            ? "Per-person pricing"
            : definition.rateModel === "both"
              ? "Per-room or per-person"
              : "Per-room pricing"}
        </Badge>
        {existing ? (
          <Badge
            variant="outline"
            className="border-emerald-500/25 bg-emerald-500/10 text-emerald-600 capitalize dark:text-emerald-400"
          >
            Already {existing.state}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="gap-4 lg:col-span-3">
          <CardHeader>
            <CardTitle>Step by step</CardTitle>
            <CardDescription className="text-pretty">
              Exact menu labels move around in every extranet. If a step does not match what
              you see, the Channex documentation is the source of truth.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {definition.steps.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="bg-primary/10 text-primary tabular flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-muted-foreground text-sm text-pretty">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>

            <Separator className="my-4" />

            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <TriangleAlert className="size-3.5 text-amber-500" />
                Where this one usually goes wrong
              </p>
              <ul className="space-y-1.5">
                {definition.pitfalls.map((pitfall) => (
                  <li key={pitfall} className="text-muted-foreground flex gap-2 text-sm">
                    <span className="bg-muted-foreground/40 mt-2 size-1 shrink-0 rounded-full" />
                    <span className="text-pretty">{pitfall}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="size-4" />
                What you will need
              </CardTitle>
              <CardDescription>Collect these before starting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {definition.credentials.map((credential) => (
                <div key={credential.label} className="rounded-md border p-2.5">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    {credential.label}
                    {credential.secret ? (
                      <Badge variant="secondary" className="text-[10px]">
                        Secret
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground text-xs text-pretty">{credential.hint}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <ConnectChannelForm
            otaName={definition.name}
            channexChannel={definition.channexChannel}
            credentials={definition.credentials}
            roomTypeCount={mappableRoomTypes}
            ratePlanCount={mappableRatePlans}
          />
        </div>
      </div>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base">Other channels</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 px-4">
          {otaCatalog
            .filter((other) => other.slug !== definition.slug)
            .map((other) => (
              <Button key={other.slug} variant="outline" size="sm" asChild>
                <Link href={`/channels/connect/${other.slug}`}>{other.name}</Link>
              </Button>
            ))}
        </CardContent>
      </Card>
    </>
  );
}
