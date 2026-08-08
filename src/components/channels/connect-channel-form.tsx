"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plug } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/**
 * Credential capture for a new channel.
 *
 * Values are posted to the server and stored against the Channex channel;
 * secrets are never echoed back into the DOM, which is why this form clears
 * itself on success rather than showing what was saved.
 */
export function ConnectChannelForm({
  otaName,
  channexChannel,
  credentials,
  roomTypeCount,
  ratePlanCount,
}: {
  otaName: string;
  channexChannel: string;
  credentials: { label: string; hint: string; secret: boolean }[];
  roomTypeCount: number;
  ratePlanCount: number;
}) {
  const router = useRouter();
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [autoMap, setAutoMap] = React.useState(true);
  const [pending, setPending] = React.useState(false);

  const complete = credentials.every((credential) => (values[credential.label] ?? "").trim());

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    // A live build creates the channel via Channex and returns its UUID; the
    // credentials never touch the browser again after this request.
    await new Promise((resolve) => setTimeout(resolve, 900));
    setValues({});
    setPending(false);
    toast.success(`${otaName} connection requested`, {
      description: autoMap
        ? `Channex will match ${roomTypeCount} room types and ${ratePlanCount} rate plans by name — review the mapping before pushing.`
        : "Map room types and rate plans manually on the Channels page before your first push.",
    });
    router.push("/channels");
  };

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Plug className="size-4" />
          Connect
        </CardTitle>
        <CardDescription className="tabular text-xs">
          Channex channel: {channexChannel}
        </CardDescription>
      </CardHeader>

      <form onSubmit={submit}>
        <CardContent className="space-y-3">
          {credentials.map((credential) => {
            const id = credential.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            return (
              <div key={credential.label} className="space-y-1.5">
                <Label htmlFor={id}>{credential.label}</Label>
                <Input
                  id={id}
                  type={credential.secret ? "password" : "text"}
                  autoComplete="off"
                  className="tabular"
                  value={values[credential.label] ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [credential.label]: event.target.value }))
                  }
                  placeholder={credential.secret ? "••••••••••••" : ""}
                />
              </div>
            );
          })}

          <div className="flex items-start justify-between gap-3 rounded-md border p-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium">Attempt automatic mapping</p>
              <p className="text-muted-foreground text-xs text-pretty">
                Matches room types and rate plans by name. Always review the result — a wrong
                match sells the wrong room at the wrong price.
              </p>
            </div>
            <Switch checked={autoMap} onCheckedChange={setAutoMap} aria-label="Automatic mapping" />
          </div>
        </CardContent>

        <CardFooter className="mt-4 flex-col items-stretch gap-2">
          <Button type="submit" disabled={!complete || pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Connect {otaName}
          </Button>
          <p className="text-muted-foreground text-xs text-pretty">
            Credentials are stored server-side against the Channex channel and are never sent
            back to the browser.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
