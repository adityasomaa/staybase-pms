import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getArticle, helpArticles, helpCategoryLabels } from "@/lib/help/articles";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const article = getArticle(slug);
  return {
    title: article?.title ?? "Help",
    description: article?.summary,
  };
}

export function generateStaticParams() {
  return helpArticles.map((article) => ({ slug: article.slug }));
}

export default async function HelpArticlePage(props: Props) {
  const { slug } = await props.params;
  const article = getArticle(slug);
  if (!article) notFound();

  const related = helpArticles
    .filter((other) => other.slug !== article.slug && other.category === article.category)
    .slice(0, 3);

  return (
    <>
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-2 gap-1.5" asChild>
          <Link href="/help">
            <ArrowLeft className="size-3.5" />
            All tutorials
          </Link>
        </Button>
        <PageHeader title={article.title} description={article.summary} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline">{helpCategoryLabels[article.category]}</Badge>
          <Badge variant="outline" className="gap-1">
            <Clock className="size-3" />
            {article.minutes} min read
          </Badge>
        </div>
      </div>

      <Card className="max-w-3xl gap-0">
        <CardContent className="space-y-6 py-2">
          {article.body.map((section, index) => (
            <section key={section.heading} className="space-y-3">
              {index > 0 ? <Separator className="mb-6" /> : null}
              <h3 className="text-base font-semibold tracking-tight text-balance">
                {section.heading}
              </h3>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-muted-foreground text-sm text-pretty">
                  {paragraph}
                </p>
              ))}
              {section.steps ? (
                <ol className="space-y-2">
                  {section.steps.map((step, stepIndex) => (
                    <li key={step} className="flex gap-3 text-sm">
                      <span className="bg-primary/10 text-primary tabular flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
                        {stepIndex + 1}
                      </span>
                      <span className="pt-0.5 text-pretty">{step}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </section>
          ))}
        </CardContent>
      </Card>

      {related.length > 0 ? (
        <div className="max-w-3xl space-y-2">
          <h3 className="text-sm font-semibold tracking-tight">Related</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {related.map((other) => (
              <Button
                key={other.slug}
                variant="outline"
                className="h-auto justify-between gap-2 py-2.5 text-left whitespace-normal"
                asChild
              >
                <Link href={`/help/${other.slug}`}>
                  <span className="text-sm">{other.title}</span>
                  <ArrowRight className="size-3.5 shrink-0" />
                </Link>
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
