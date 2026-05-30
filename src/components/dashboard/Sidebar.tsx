"use client";

import {
  Sparkles,
  Plus,
  FolderOpen,
  Clock,
  Gift,
  Settings,
  LogOut,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Project } from "@/types";

interface SidebarProps {
  lang: string;
  dict: Dictionary;
  projects: Project[];
  onSignOut: () => void;
}

export function DashboardSidebar({
  lang,
  dict,
  projects,
  onSignOut,
}: SidebarProps) {
  const recentProjects = projects.slice(0, 5);

  return (
    <aside className="w-64 border-r border-border/50 bg-sidebar flex flex-col h-screen sticky top-0">
      {/* Brand + Workspace */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-sm">{dict.common.brand}</span>
        </div>
        <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent text-sm transition-colors">
          <span className="text-sidebar-foreground">
            {dict.dashboard.workspace}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <Link href={`/${lang}/dashboard`}>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sm h-9 text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <Plus className="h-4 w-4" />
            {dict.dashboard.newProject}
          </Button>
        </Link>
        <Link href={`/${lang}/docs`}>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sm h-9 text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <BookOpen className="h-4 w-4" />
            {dict.dashboard.resources}
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-sm h-9 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <FolderOpen className="h-4 w-4" />
          {dict.dashboard.myProjects}
        </Button>

        {/* Recent History */}
        {recentProjects.length > 0 && (
          <div className="pt-4">
            <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              <Clock className="h-3 w-3 inline mr-1" />
              {dict.dashboard.recentHistory}
            </p>
            {recentProjects.map((p) => (
              <Link key={p.id} href={`/${lang}/project/${p.id}`}>
                <button className="w-full text-left px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors truncate">
                  {p.name}
                </button>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Rewards Banner */}
      <div className="p-3">
        <div className="rounded-lg bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-500/20 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="h-4 w-4 text-violet-400" />
            <span className="text-xs font-medium text-violet-300">
              {dict.dashboard.rewards}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {dict.dashboard.rewardsDesc}
          </p>
        </div>
      </div>

      {/* User Actions */}
      <div className="p-3 border-t border-border/50 flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={onSignOut}
        >
          <LogOut className="h-4 w-4" />
        </Button>
        {/* Language Toggle */}
        <Link href={lang === "zh" ? "/en/dashboard" : "/zh/dashboard"}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
          >
            {lang === "zh" ? "EN" : "中"}
          </Button>
        </Link>
      </div>
    </aside>
  );
}
