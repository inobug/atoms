"use client";

import { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/app/[lang]/dictionaries";

interface DocPageClientProps {
  lang: string;
  dict: Dictionary;
  title: string;
  html: string;
  headings: { id: string; text: string; level: number }[];
}

export default function DocPageClient({
  lang,
  dict,
  title,
  html,
  headings,
}: DocPageClientProps) {
  const [activeId, setActiveId] = useState<string>("");

  // Scrollspy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 },
    );

    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  return (
    <div className="flex">
      {/* Center: Article Content */}
      <article className="flex-1 min-w-0 px-8 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">{title}</h1>
        <div
          className="doc-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Feedback */}
        <div className="mt-12 pt-8 border-t border-border/50">
          <p className="text-sm text-muted-foreground mb-3">
            {dict.docs.wasHelpful}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <ThumbsUp className="h-3.5 w-3.5" />
              {dict.docs.yes}
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <ThumbsDown className="h-3.5 w-3.5" />
              {dict.docs.no}
            </Button>
          </div>
        </div>
      </article>

      {/* Right: TOC with Scrollspy */}
      {headings.length > 0 && (
        <aside className="hidden xl:block w-56 shrink-0 py-8 pr-4">
          <div className="sticky top-20">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {dict.docs.onThisPage}
            </h4>
            <nav className="space-y-1">
              {headings.map((h) => (
                <a
                  key={h.id}
                  href={`#${h.id}`}
                  className={`block text-xs py-1 transition-colors ${
                    h.level === 3 ? "pl-4" : ""
                  } ${
                    activeId === h.id
                      ? "text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {h.text}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      )}
    </div>
  );
}
