"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BedDouble,
  BookOpen,
  CircleHelp,
  Loader2,
  Plug,
  Search,
  SquareStack,
  Tags,
  User,
  Zap,
} from "lucide-react";

import type { SearchKind, SearchResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const kindIcon: Record<SearchKind, React.ComponentType<{ className?: string }>> = {
  reservation: SquareStack,
  guest: User,
  room: BedDouble,
  rate_plan: Tags,
  channel: Plug,
  page: BookOpen,
  article: CircleHelp,
  action: Zap,
};

const kindGroup: Record<SearchKind, string> = {
  action: "Actions",
  page: "Go to",
  reservation: "Reservations",
  guest: "Guests",
  room: "Rooms",
  rate_plan: "Rate plans",
  channel: "Channels",
  article: "Tutorials & guides",
};

const groupOrder = [
  "Actions",
  "Reservations",
  "Guests",
  "Go to",
  "Tutorials & guides",
  "Rooms",
  "Rate plans",
  "Channels",
];

const suggestions = [
  "How do I block a room?",
  "Connect Booking.com",
  "SB-24021",
  "Dynamic pricing",
  "Pay invoice",
];

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);

  const hasQuery = query.trim().length > 0;

  React.useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) return;

    const controller = new AbortController();
    // Debounced so a fast typist issues one request, not one per keystroke.
    // Everything runs inside the timer rather than in the effect body, which
    // keeps the previous results on screen instead of flashing an empty list.
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as { results: SearchResult[] };
        setResults(payload.results);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 160);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const go = React.useCallback(
    (href: string) => {
      onOpenChange(false);
      setQuery("");
      router.push(href);
    },
    [onOpenChange, router],
  );

  // cmdk only fires onSelect for the highlighted item. With server-side
  // ranking and shouldFilter off it will not always adopt the new first row,
  // so the highlight is driven explicitly — otherwise Enter does nothing.
  const [highlighted, setHighlighted] = React.useState("");
  const topId = results[0]?.id ?? "";
  const activeValue = results.some((result) => result.id === highlighted)
    ? highlighted
    : topId;

  const grouped = React.useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    for (const result of results) {
      const group = kindGroup[result.kind];
      const list = map.get(group) ?? [];
      list.push(result);
      map.set(group, list);
    }
    return groupOrder
      .filter((group) => map.has(group))
      .map((group) => ({ group, items: map.get(group)! }));
  }, [results]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search STAYBASE"
      description="Reservations, guests, rooms, settings and tutorials"
    >
      {/* This registry's CommandDialog does not provide the cmdk root, so the
          Command element has to be supplied here or none of the list
          primitives register. shouldFilter is off because results arrive
          already ranked by the server. */}
      <Command
        shouldFilter={false}
        loop
        value={activeValue}
        onValueChange={setHighlighted}
      >
        <CommandInput
          placeholder="Search reservations, guests, rooms — or ask a question…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[420px]">
        {!hasQuery ? (
          <CommandGroup heading="Try">
            {suggestions.map((suggestion) => (
              <CommandItem
                key={suggestion}
                value={suggestion}
                onSelect={() => setQuery(suggestion)}
              >
                <Search className="size-4 opacity-60" />
                {suggestion}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : loading && results.length === 0 ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Searching…
          </div>
        ) : results.length === 0 ? (
          <CommandEmpty>
            Nothing matched &ldquo;{query}&rdquo;. Try a reservation reference, a guest name, a
            room number, or a question like &ldquo;how do I connect Agoda&rdquo;.
          </CommandEmpty>
        ) : (
          grouped.map(({ group, items }) => (
            <CommandGroup key={group} heading={group}>
              {items.map((result) => {
                const Icon = kindIcon[result.kind];
                return (
                  <CommandItem
                    key={result.id}
                    value={result.id}
                    onSelect={() => go(result.href)}
                    className="gap-2.5"
                  >
                    <Icon className="size-4 shrink-0 opacity-70" />
                    <div className="grid min-w-0 flex-1">
                      <span className="truncate">{result.title}</span>
                      <span className="text-muted-foreground truncate text-xs">
                        {result.subtitle}
                      </span>
                    </div>
                    {result.badge ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 text-[10px] capitalize",
                          result.kind === "action" &&
                            "border-primary/25 bg-primary/10 text-primary",
                        )}
                      >
                        {result.badge}
                      </Badge>
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))
        )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
