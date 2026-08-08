import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-muted-foreground tabular text-sm font-medium">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">This page checked out</h1>
      <p className="text-muted-foreground max-w-md text-sm text-pretty">
        The reservation, room or report you were looking for no longer exists. Head back to the
        dashboard to pick up where you left off.
      </p>
      <Button asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
