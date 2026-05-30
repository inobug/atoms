"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { PreviewPanel } from "@/components/workspace/PreviewPanel";
import { FilesPanel } from "@/components/workspace/FilesPanel";
import { Sparkles, ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Project, Message, GeneratedFile } from "@/types";
import Link from "next/link";

const GREETING_RE =
  /^(你好|您好|hi|hello|hey|哈喽|嗨|在吗|在不在|能说话吗|可以说话吗|test|测试|嘿|喂|哈啰|howdy|yo|sup|what'?s up)[\s!！?？.。,，~～]*$/i;

function isGreeting(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length > 40) return false;
  return GREETING_RE.test(trimmed);
}

const GREETING_REPLY =
  '你好！我是你的 AI 开发助手，很高兴见到你！\n\n请告诉我你想构建什么样的网页应用，例如：\n- "帮我做一个待办事项应用"\n- "写一个简约风格的个人主页"\n- "创建一个数据仪表盘"\n\n描述越具体，我生成的效果越好！';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const lang = (params.lang as string) || "zh";
  const supabase = createClient();

  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [currentCode, setCurrentCode] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelProvider, setModelProvider] = useState<"claude" | "openai">(
    "claude",
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadProject();
    loadMessages();
    loadFiles();
  }, [projectId]);

  async function loadProject() {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();
    if (data) {
      setProject(data);
      setModelProvider(data.model_provider || "claude");
      if (data.current_code) setCurrentCode(data.current_code);
    } else {
      router.push(`/${lang}/dashboard`);
    }
  }

  async function loadMessages() {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  }

  async function loadFiles() {
    const { data } = await supabase
      .from("generated_files")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setFiles(data || []);
  }

  async function handleSendMessage(content: string) {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      project_id: projectId,
      role: "user",
      content,
      metadata: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    await supabase.from("messages").insert({
      project_id: projectId,
      role: "user",
      content,
    });

    // Greeting detection — respond conversationally, skip code generation
    if (isGreeting(content)) {
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        project_id: projectId,
        role: "assistant",
        content: GREETING_REPLY,
        metadata: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      await supabase.from("messages").insert({
        project_id: projectId,
        role: "assistant",
        content: GREETING_REPLY,
      });
      return;
    }

    setIsGenerating(true);
    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          prompt: content,
          modelProvider,
          currentCode,
          history: messages.slice(-10),
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error("Generation failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let plannerContent = "";
      let coderContent = "";
      let reviewerContent = "";
      let currentAgent: string = "";
      let finalCode = "";

      const plannerMsg: Message = {
        id: crypto.randomUUID(),
        project_id: projectId,
        role: "planner",
        content: "",
        metadata: null,
        created_at: new Date().toISOString(),
      };
      const coderMsg: Message = {
        id: crypto.randomUUID(),
        project_id: projectId,
        role: "coder",
        content: "",
        metadata: null,
        created_at: new Date().toISOString(),
      };
      const reviewerMsg: Message = {
        id: crypto.randomUUID(),
        project_id: projectId,
        role: "reviewer",
        content: "",
        metadata: null,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, plannerMsg, coderMsg, reviewerMsg]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.agent) {
                currentAgent = data.agent;
              }

              if (data.content) {
                if (currentAgent === "planner") {
                  plannerContent += data.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === plannerMsg.id
                        ? { ...m, content: plannerContent }
                        : m,
                    ),
                  );
                } else if (currentAgent === "coder") {
                  coderContent += data.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === coderMsg.id
                        ? { ...m, content: coderContent }
                        : m,
                    ),
                  );
                } else if (currentAgent === "reviewer") {
                  reviewerContent += data.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === reviewerMsg.id
                        ? { ...m, content: reviewerContent }
                        : m,
                    ),
                  );
                }
              }

              if (data.code) {
                finalCode = data.code;
                setCurrentCode(finalCode);
              }

              if (data.files) {
                setFiles((prev) => [...data.files, ...prev]);
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      }

      await Promise.all([
        supabase.from("messages").insert([
          { project_id: projectId, role: "planner", content: plannerContent },
          { project_id: projectId, role: "coder", content: coderContent },
          { project_id: projectId, role: "reviewer", content: reviewerContent },
        ]),
        supabase
          .from("projects")
          .update({
            current_code: finalCode,
            updated_at: new Date().toISOString(),
          })
          .eq("id", projectId),
      ]);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            project_id: projectId,
            role: "system",
            content: "Generation failed. Please try again.",
            metadata: null,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } finally {
      setIsGenerating(false);
    }
  }

  async function updateModelProvider(provider: "claude" | "openai") {
    setModelProvider(provider);
    await supabase
      .from("projects")
      .update({ model_provider: provider })
      .eq("id", projectId);
  }

  return (
    <div className="dark h-screen flex flex-col bg-background text-foreground">
      <header className="h-12 border-b border-border/50 flex items-center px-4 gap-3 shrink-0">
        <Link href={`/${lang}/dashboard`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm truncate">
          {project?.name || "Loading..."}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Dialog>
            <DialogTrigger
              render={
                <Button variant="ghost" size="icon" className="h-8 w-8" />
              }
            >
              <Settings className="h-4 w-4" />
            </DialogTrigger>
            <DialogContent className="dark">
              <DialogHeader>
                <DialogTitle>Project Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium">AI Model</label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={
                        modelProvider === "claude" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => updateModelProvider("claude")}
                    >
                      Claude
                    </Button>
                    <Button
                      variant={
                        modelProvider === "openai" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => updateModelProvider("openai")}
                    >
                      GPT-4
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isGenerating={isGenerating}
        />
        <PreviewPanel code={currentCode} />
        <FilesPanel files={files} onSelectFile={setCurrentCode} />
      </div>
    </div>
  );
}
