"use client";

import { useState } from "react";
import { ArrowUp, Paperclip, Globe, Zap } from "lucide-react";
import type { Dictionary } from "@/app/[lang]/dictionaries";

interface HeroProps {
  dict: Dictionary;
  onSubmit: (prompt: string) => void;
}

export function DashboardHero({ dict, onSubmit }: HeroProps) {
  const [prompt, setPrompt] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    onSubmit(prompt.trim());
  }

  return (
    <div className="mb-12">
      {/* Credits Display */}
      <div className="flex justify-end mb-6 gap-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-yellow-500" />
          <span>
            {dict.dashboard.credits}:{" "}
            <strong className="text-foreground">1,000</strong>
          </span>
        </div>
      </div>

      {/* Avatar Group */}
      <div className="flex justify-center mb-6">
        <div className="flex -space-x-2">
          {["🧠", "💻", "🔍"].map((emoji, i) => (
            <div
              key={i}
              className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-sm"
            >
              {emoji}
            </div>
          ))}
        </div>
      </div>

      {/* Hero Title */}
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-2">
        {dict.dashboard.heroTitle}
      </h1>
      <p className="text-center text-muted-foreground text-sm mb-8">
        {dict.dashboard.heroSubtitle}
      </p>

      {/* AI Input Box */}
      <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
        <div className="rounded-2xl border border-border/50 bg-card/50 shadow-lg overflow-hidden focus-within:border-primary/50 transition-colors">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={dict.dashboard.inputPlaceholder}
            rows={3}
            className="w-full bg-transparent px-5 pt-4 pb-2 text-sm resize-none outline-none placeholder:text-muted-foreground/60"
          />
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              >
                <Globe className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground/50 ml-1">
                AI Agent
              </span>
            </div>
            <button
              type="submit"
              disabled={!prompt.trim()}
              className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 transition-opacity hover:opacity-90"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>

      {/* Integration Logos */}
      <div className="flex items-center justify-center gap-6 mt-8">
        {[
          { name: "Supabase", color: "text-emerald-400" },
          { name: "Stripe", color: "text-violet-400" },
          { name: "GitHub", color: "text-foreground" },
          { name: "Vercel", color: "text-foreground" },
          { name: "Tailwind", color: "text-cyan-400" },
        ].map((integration) => (
          <span
            key={integration.name}
            className={`text-xs font-medium ${integration.color} opacity-50 hover:opacity-100 transition-opacity cursor-default`}
          >
            {integration.name}
          </span>
        ))}
      </div>
    </div>
  );
}
