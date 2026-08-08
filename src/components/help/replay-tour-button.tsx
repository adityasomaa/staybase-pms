"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlayCircle } from "lucide-react";

import { resetTour } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function ReplayTourButton() {
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
        await resetTour();
        router.push("/dashboard");
      }}
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <PlayCircle className="size-3.5" />
      )}
      Replay the tour
    </Button>
  );
}
