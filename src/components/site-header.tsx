"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Moon, Plus, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { allNavItems } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SiteHeader({ propertyName }: { propertyName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const current = allNavItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

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
    <header className="bg-background/80 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b backdrop-blur-md">
      <div className="flex w-full items-center gap-2 px-3 lg:px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-1 !h-4" />
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">{current?.title ?? "STAYBASE"}</h1>
          <p className="text-muted-foreground hidden truncate text-xs sm:block">
            {propertyName}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            className="text-muted-foreground hidden h-8 w-56 justify-start gap-2 px-2.5 font-normal md:flex"
          >
            <Search className="size-3.5" />
            Search reservations, guests…
            <kbd className="bg-muted text-muted-foreground pointer-events-none ml-auto inline-flex h-5 items-center gap-1 rounded border px-1.5 text-[10px] font-medium">
              ⌘K
            </kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 md:hidden"
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

      <CommandDialog open={open} onOpenChange={setOpen} title="Command menu">
        <CommandInput placeholder="Jump to a module, reservation or guest…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {allNavItems.map((item) => (
              <CommandItem
                key={item.href}
                value={`${item.title} ${item.description}`}
                onSelect={() => {
                  setOpen(false);
                  router.push(item.href);
                }}
              >
                <item.icon className="size-4" />
                <div className="grid">
                  <span>{item.title}</span>
                  <span className="text-muted-foreground text-xs">{item.description}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Actions">
            <CommandItem
              value="new booking create reservation"
              onSelect={() => {
                setOpen(false);
                router.push("/reservations/new");
              }}
            >
              <Plus className="size-4" />
              Create a reservation
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();

  // Both icons render; CSS picks one. That avoids a mounted flag (and the
  // hydration mismatch it papers over) entirely.
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
