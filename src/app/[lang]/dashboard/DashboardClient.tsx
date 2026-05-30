"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Project } from "@/types";
import type { Dictionary } from "../dictionaries";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { DashboardHero } from "@/components/dashboard/Hero";
import { DashboardTabs } from "@/components/dashboard/Tabs";

export default function DashboardClient({
  lang,
  dict,
}: {
  lang: string;
  dict: Dictionary;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false });
    setProjects(data || []);
    setLoading(false);
  }

  async function createProjectFromPrompt(prompt: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: prompt.slice(0, 50),
        description: prompt,
      })
      .select()
      .single();

    if (!error && data) {
      router.push(
        `/${lang}/project/${data.id}?prompt=${encodeURIComponent(prompt)}`,
      );
    }
  }

  async function deleteProject(id: string) {
    await supabase.from("projects").delete().eq("id", id);
    setProjects(projects.filter((p) => p.id !== id));
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push(`/${lang}`);
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground flex">
      <DashboardSidebar
        lang={lang}
        dict={dict}
        projects={projects}
        onSignOut={handleSignOut}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-12">
          <DashboardHero dict={dict} onSubmit={createProjectFromPrompt} />
          <DashboardTabs
            lang={lang}
            dict={dict}
            projects={projects}
            loading={loading}
            onDelete={deleteProject}
          />
        </div>
      </main>
    </div>
  );
}
