"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  Search,
  Menu,
  X,
  ChevronRight,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { DocSection } from "@/lib/docs";

interface DocsLayoutClientProps {
  lang: string;
  dict: Dictionary;
  sections: DocSection[];
  children: React.ReactNode;
}

export default function DocsLayoutClient({
  lang,
  dict,
  sections,
  children,
}: DocsLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const pathname = usePathname();

  // Cmd+K handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className={`${darkMode ? "dark" : ""} min-h-screen bg-background text-foreground`}
    >
      {/* Top Nav */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <Link href={`/${lang}`} className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm">{dict.common.brand}</span>
          </Link>
          <span className="text-muted-foreground text-sm">/</span>
          <span className="text-sm font-medium">{dict.docs.title}</span>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50 text-sm text-muted-foreground hover:border-border transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {dict.docs.searchPlaceholder}
              </span>
              <kbd className="hidden sm:inline text-xs bg-muted px-1.5 py-0.5 rounded">
                ⌘K
              </kbd>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Link href={lang === "zh" ? `/en/docs` : `/zh/docs`}>
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                {lang === "zh" ? "EN" : "中"}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-background border-r border-border/50 pt-14 pb-4 overflow-y-auto transform transition-transform lg:relative lg:translate-x-0 lg:pt-8 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="lg:hidden flex justify-end p-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <nav className="px-4 space-y-6">
            {sections.map((section) => (
              <div key={section.title}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.pages.map((page) => {
                    const href = `/${lang}/docs/${page.slug}`;
                    const isActive = pathname === href;
                    return (
                      <li key={page.slug}>
                        <Link
                          href={href}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <ChevronRight
                            className={`h-3 w-3 ${isActive ? "text-primary" : "text-muted-foreground/50"}`}
                          />
                          {page.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Search Modal (Command Palette) */}
      {searchOpen && (
        <CommandPalette
          lang={lang}
          dict={dict}
          sections={sections}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
}

function CommandPalette({
  lang,
  dict,
  sections,
  onClose,
}: {
  lang: string;
  dict: Dictionary;
  sections: DocSection[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const allPages = sections.flatMap((s) =>
    s.pages.map((p) => ({ ...p, section: s.title })),
  );

  const filtered = query
    ? allPages.filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.section.toLowerCase().includes(query.toLowerCase()),
      )
    : allPages;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-popover border border-border rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={dict.docs.searchPlaceholder}
            className="flex-1 py-3 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>
        <ul className="max-h-64 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              No results found
            </li>
          ) : (
            filtered.map((page) => (
              <li key={page.slug}>
                <Link
                  href={`/${lang}/docs/${page.slug}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors"
                >
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <div>
                    <p className="text-sm">{page.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {page.section}
                    </p>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
