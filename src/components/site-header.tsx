"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Moon, Plus, Search, Sun, TriangleAlert } from "lucide-react";
import { useTheme } from "next-themes";

import { GlobalSearch } from "@/components/global-search";
import { allNavItems } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function SiteHeader({
  propertyName,
  pastDue,
  daysUntilSuspension,
}: {
  propertyName: string;
  pastDue: boolean;
  daysUntilSuspension: number | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  // Longest matching href wins so /reservations/new does not resolve to
  // /reservations and mislabel the page.
  const current = [...allNavItems]
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {pastDue ? (
        <Link
          href="/billing"
          className="bg-amber-500/12 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300 flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium transition-colors"
        >
          <TriangleAlert className="size-3.5 shrink-0" />
          <span className="text-pretty">
            Invoice past due
            {typeof daysUntilSuspension === "number"
              ? daysUntilSuspension > 0
                ? ` — this workspace locks in ${daysUntilSuspension} day${daysUntilSuspension === 1 ? "" : "s"}`
                : " — the grace period has expired"
              : ""}
            . Settle it to keep pushing rates.
          </span>
        </Link>
      ) : null}

      <header className="bg-background/80 sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b backdrop-blur-md">
        <div className="flex w-full items-center gap-2 px-3 lg:px-4">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Separator orientation="vertical" className="mr-1 !h-4" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold">{current?.title ?? "STAYBASE"}</h1>
            <p className="text-muted-foreground hidden truncate text-xs sm:block">
              {propertyName}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(true)}
              className="text-muted-foreground hidden h-8 w-48 justify-start gap-2 px-2.5 font-normal lg:flex xl:w-60"
            >
              <Search className="size-3.5 shrink-0" />
              <span className="truncate">Search anything…</span>
              <kbd className="bg-muted text-muted-foreground pointer-events-none ml-auto inline-flex h-5 shrink-0 items-center rounded border px-1.5 text-[10px] font-medium">
                ⌘K
              </kbd>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Search"
            >
              <Search className="size-4" />
            </Button>

            <ThemeToggle />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="relative size-8" asChild>
                  <Link href="/channels" aria-label="Connectivity alerts">
                    <Bell className="size-4" />
                    <span className="bg-destructive absolute top-1.5 right-1.5 size-1.5 rounded-full" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Connectivity alerts</TooltipContent>
            </Tooltip>

            <Button size="sm" className="h-8 gap-1.5" asChild>
              <Link href="/reservations/new">
                <Plus className="size-3.5" />
                <span className="hidden sm:inline">New booking</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <GlobalSearch open={open} onOpenChange={setOpen} />
    </>
  );
}

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();

  // Both icons render; CSS picks one. That avoids a mounted flag and the
  // hydration mismatch it papers over.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Moon className="size-4 dark:hidden" />
          <Sun className="hidden size-4 dark:block" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Toggle theme</TooltipContent>
    </Tooltip>
  );
}
