"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Compass,
  FolderOpen,
  LayoutGrid,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Project } from "@/types";

interface TabsProps {
  lang: string;
  dict: Dictionary;
  projects: Project[];
  loading: boolean;
  onDelete: (id: string) => void;
}

const tabs = ["discover", "myProjects", "templates"] as const;

const tabIcons = {
  discover: Compass,
  myProjects: FolderOpen,
  templates: LayoutGrid,
};

export function DashboardTabs({
  lang,
  dict,
  projects,
  loading,
  onDelete,
}: TabsProps) {
  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]>("myProjects");
  const router = useRouter();

  const tabLabels: Record<(typeof tabs)[number], string> = {
    discover: dict.dashboard.discover,
    myProjects: dict.dashboard.myProjects,
    templates: dict.dashboard.templates,
  };

  return (
    <div>
      {/* Tab Headers */}
      <div className="flex items-center gap-1 border-b border-border/50 mb-6">
        {tabs.map((tab) => {
          const Icon = tabIcons[tab];
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tabLabels[tab]}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "myProjects" && (
        <ProjectsGrid
          lang={lang}
          dict={dict}
          projects={projects}
          loading={loading}
          onDelete={onDelete}
        />
      )}
      {activeTab === "discover" && <DiscoverContent dict={dict} />}
      {activeTab === "templates" && (
        <TemplatesContent lang={lang} dict={dict} />
      )}
    </div>
  );
}

function ProjectsGrid({
  lang,
  dict,
  projects,
  loading,
  onDelete,
}: {
  lang: string;
  dict: Dictionary;
  projects: Project[];
  loading: boolean;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        {dict.common.loading}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-16">
        <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">{dict.dashboard.noProjects}</p>
        <p className="text-sm text-muted-foreground/60 mt-1">
          {dict.dashboard.noProjectsDesc}
        </p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <div
          key={project.id}
          className="group border border-border/50 rounded-xl p-5 bg-card/30 hover:border-primary/30 hover:bg-card/50 transition-all cursor-pointer"
          onClick={() => router.push(`/${lang}/project/${project.id}`)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate text-sm">{project.name}</h3>
              {project.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`/${lang}/project/${project.id}`, "_blank");
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(project.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-3">
            {dict.dashboard.updated}{" "}
            {new Date(project.updated_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}

function DiscoverContent({ dict }: { dict: Dictionary }) {
  const showcases = [
    {
      title: "SaaS Landing Page",
      desc: "Modern SaaS landing page with pricing, features, and CTA sections",
      tags: ["React", "Tailwind"],
    },
    {
      title: "E-commerce Store",
      desc: "Full-featured online store with cart, checkout, and product catalog",
      tags: ["React", "Stripe"],
    },
    {
      title: "Admin Dashboard",
      desc: "Analytics dashboard with charts, tables, and real-time data",
      tags: ["React", "Charts"],
    },
    {
      title: "Blog Platform",
      desc: "Content management system with markdown editor and publishing",
      tags: ["MDX", "Tailwind"],
    },
    {
      title: "Chat Application",
      desc: "Real-time messaging app with rooms and direct messages",
      tags: ["WebSocket", "Supabase"],
    },
    {
      title: "Portfolio Site",
      desc: "Personal portfolio with project showcase and contact form",
      tags: ["React", "Animation"],
    },
  ];

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {showcases.map((item) => (
        <div
          key={item.title}
          className="border border-border/50 rounded-xl p-5 bg-card/30 hover:border-primary/30 transition-colors cursor-pointer"
        >
          <div className="h-24 rounded-lg bg-muted/30 mb-3 flex items-center justify-center text-muted-foreground/30">
            <LayoutGrid className="h-8 w-8" />
          </div>
          <h3 className="font-semibold text-sm">{item.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
          <div className="flex gap-2 mt-3">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TemplatesContent({ lang, dict }: { lang: string; dict: Dictionary }) {
  const templates = [
    {
      key: "landingPage",
      prompt:
        "Build a modern landing page with a hero section, features grid, testimonials carousel, and a call-to-action footer. Use a clean, professional design.",
    },
    {
      key: "todoApp",
      prompt:
        "Create a todo application with the ability to add, complete, and delete tasks. Include filters for all/active/completed and a task count display.",
    },
    {
      key: "dashboard",
      prompt:
        "Build an analytics dashboard with stat cards, a line chart, a recent orders table, and a sidebar navigation. Use realistic sample data.",
    },
    {
      key: "productPage",
      prompt:
        "Create an e-commerce product page with an image gallery, price display, size/color selectors, add to cart button, and customer reviews section.",
    },
  ] as const;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {templates.map((t) => {
        const title = dict.templates[t.key as keyof typeof dict.templates];
        const descKey = `${t.key}Desc` as keyof typeof dict.templates;
        const desc = dict.templates[descKey];
        return (
          <div
            key={t.key}
            className="border border-border/50 rounded-xl p-5 bg-card/30 hover:border-primary/30 transition-colors cursor-pointer group"
          >
            <div className="h-20 rounded-lg bg-gradient-to-br from-violet-500/5 to-blue-500/5 mb-3 flex items-center justify-center">
              <LayoutGrid className="h-6 w-6 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
            </div>
            <h3 className="font-semibold text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{desc}</p>
          </div>
        );
      })}
    </div>
  );
}
