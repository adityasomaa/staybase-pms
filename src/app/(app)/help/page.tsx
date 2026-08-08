import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock, Plug, Search } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ReplayTourButton } from "@/components/help/replay-tour-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { helpArticles, helpCategoryLabels } from "@/lib/help/articles";
import { otaCatalog } from "@/lib/ota/catalog";
import type { HelpCategory } from "@/lib/types";

export const metadata: Metadata = { title: "Help & Tutorials" };

const order: HelpCategory[] = [
  "getting_started",
  "rates",
  "reservations",
  "channels",
  "pricing",
  "users",
  "billing",
];

export default function HelpPage() {
  return (
    <>
      <PageHeader
        title="Help & Tutorials"
        description="Short guides for the parts of a PMS that are easy to get subtly wrong. Everything here is indexed by search, so ⌘K finds the answer rather than only the page."
        actions={<ReplayTourButton />}
      />

      <Card className="gap-3 py-4">
        <CardContent className="flex flex-wrap items-center gap-3 px-4">
          <Search className="text-muted-foreground size-4 shrink-0" />
          <p className="text-muted-foreground min-w-0 flex-1 text-sm text-pretty">
            Press{" "}
            <kbd className="bg-muted rounded border px-1.5 py-0.5 text-[11px] font-medium">
              ⌘K
            </kbd>{" "}
            anywhere and type a question — &ldquo;how do I block a room&rdquo;, &ldquo;connect
            Agoda&rdquo;, or a reservation reference.
          </p>
        </CardContent>
      </Card>

      {order.map((category) => {
        const articles = helpArticles.filter((article) => article.category === category);
        if (articles.length === 0) return null;
        return (
          <section key={category} className="space-y-3">
            <h3 className="text-sm font-semibold tracking-tight">
              {helpCategoryLabels[category]}
            </h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {articles.map((article) => (
                <Card key={article.slug} className="gap-2 py-4 transition-shadow hover:shadow-sm">
                  <CardHeader className="px-4">
                    <CardTitle className="text-base text-balance">
                      <Link href={`/help/${article.slug}`} className="hover:underline">
                        {article.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="text-pretty">{article.summary}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center gap-2 px-4">
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <Clock className="size-3" />
                      {article.minutes} min
                    </Badge>
                    <Button variant="ghost" size="sm" className="ml-auto gap-1" asChild>
                      <Link href={`/help/${article.slug}`}>
                        Read
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        );
      })}

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Plug className="size-4" />
          Per-channel setup guides
        </h3>
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardDescription className="text-pretty">
              Every OTA follows the same shape — request connectivity in its extranet, nominate
              Channex, then map — but each names things differently and fails in its own way.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 px-4">
            {otaCatalog.map((ota) => (
              <Button key={ota.slug} variant="outline" size="sm" asChild>
                <Link href={`/channels/connect/${ota.slug}`}>
                  <BookOpen className="size-3.5" />
                  {ota.name}
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
