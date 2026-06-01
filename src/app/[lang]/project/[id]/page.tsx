"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { PreviewPanel } from "@/components/workspace/PreviewPanel";
import { AgentPanel } from "@/components/workspace/AgentPanel";
import { SandpackProvider } from "@codesandbox/sandpack-react";
import { Sparkles, ArrowLeft, Settings, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Project, Message, SandpackFiles } from "@/types";
import { getCodeSandboxUrl } from "@/lib/codesandbox";
import Link from "next/link";

const DEFAULT_FILES: SandpackFiles = {
  "/src/App.jsx": {
    code: `export default function App() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui', color: '#666' }}>
      <p>Send a message to generate your application</p>
    </div>
  );
}`,
  },
};

interface GenerationSummary {
  fileCount?: number;
  files?: string[];
  retries?: number;
  verdict?: string;
  issues?: string[];
}

function buildCompletionSummary(
  hasFiles: boolean,
  summary: GenerationSummary | null,
): string {
  if (!hasFiles) {
    return "生成过程已完成，但未产出文件。请查看右侧 Agent 输出，可能需要重新描述需求。";
  }

  const lines: string[] = [];

  // File summary
  if (summary?.files && summary.files.length > 0) {
    lines.push(
      `**本次生成 ${summary.fileCount || summary.files.length} 个文件：**`,
    );
    for (const f of summary.files) {
      lines.push(`- \`${f}\``);
    }
  } else {
    lines.push("**项目已生成完毕。**");
  }

  // Retry info
  if (summary?.retries && summary.retries > 0) {
    lines.push(`\n> Coder 经过 ${summary.retries} 次重试修正后完成生成。`);
  }

  // Verdict & issues
  if (summary?.verdict === "pass") {
    lines.push("\nReviewer 审核通过，代码质量良好。");
  } else if (summary?.verdict === "retry") {
    lines.push("\nReviewer 发现部分问题（已尝试修复）：");
    if (summary.issues && summary.issues.length > 0) {
      for (const issue of summary.issues) {
        lines.push(`- ${issue}`);
      }
    }
  }

  lines.push("\n请查看中间的预览效果。如需修改，继续告诉我即可。");
  return lines.join("\n");
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const lang = (params.lang as string) || "zh";
  const supabase = createClient();
  const initialPromptHandled = useRef(false);

  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sandpackFiles, setSandpackFiles] =
    useState<SandpackFiles>(DEFAULT_FILES);
  const [sandpackKey, setSandpackKey] = useState(0);
  const [hasGeneratedFiles, setHasGeneratedFiles] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelProvider, setModelProvider] = useState<"claude" | "openai">(
    "claude",
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadProject();
    loadMessages();
  }, [projectId]);

  // Auto-send the prompt from dashboard
  useEffect(() => {
    const prompt = searchParams.get("prompt");
    if (prompt && !initialPromptHandled.current && project) {
      initialPromptHandled.current = true;
      window.history.replaceState(null, "", `/${lang}/project/${projectId}`);
      handleSendMessage(prompt);
    }
  }, [project]);

  async function loadProject() {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();
    if (data) {
      setProject(data);
      setModelProvider(data.model_provider || "claude");
      if (data.current_files && Object.keys(data.current_files).length > 0) {
        setSandpackFiles(data.current_files);
        setSandpackKey((k) => k + 1);
        setHasGeneratedFiles(true);
      }
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

  const handleSendMessage = useCallback(
    async (content: string) => {
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

      setIsGenerating(true);
      abortRef.current = new AbortController();

      try {
        // Step 1: Ask AI to classify intent
        const chatResponse = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: content,
            modelProvider,
            history: messages.slice(-10),
          }),
          signal: abortRef.current.signal,
        });

        if (!chatResponse.ok) throw new Error("Chat failed");

        const chatReader = chatResponse.body?.getReader();
        const decoder = new TextDecoder();
        let isGenerateIntent = false;
        let chatContent = "";

        const chatAssistantMsg: Message = {
          id: crypto.randomUUID(),
          project_id: projectId,
          role: "assistant",
          content: "",
          metadata: null,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, chatAssistantMsg]);

        let chatBuffer = "";
        while (chatReader) {
          const { done, value } = await chatReader.read();
          if (done) break;

          chatBuffer += decoder.decode(value, { stream: true });
          const lines = chatBuffer.split("\n");
          chatBuffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.intent === "generate") {
                  isGenerateIntent = true;
                  break;
                }

                if (data.content) {
                  chatContent += data.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === chatAssistantMsg.id
                        ? { ...m, content: chatContent }
                        : m,
                    ),
                  );
                }

                // Handle interactive options from AI
                if (data.options) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === chatAssistantMsg.id
                        ? {
                            ...m,
                            metadata: { ...m.metadata, options: data.options },
                          }
                        : m,
                    ),
                  );
                }
              } catch {
                // skip malformed JSON
              }
            }
          }
          if (isGenerateIntent) break;
        }

        if (!isGenerateIntent) {
          await supabase.from("messages").insert({
            project_id: projectId,
            role: "assistant",
            content: chatContent,
          });
          setIsGenerating(false);
          return;
        }

        // It's a generate intent — trigger Agent pipeline
        setMessages((prev) =>
          prev.map((m) =>
            m.id === chatAssistantMsg.id
              ? {
                  ...m,
                  content: "正在分析你的需求，Agent 团队已开始工作...",
                }
              : m,
          ),
        );

        await startGeneration(content, chatAssistantMsg.id);
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
    },
    [messages, modelProvider, projectId, sandpackFiles],
  );

  async function startGeneration(content: string, assistantMsgId: string) {
    const currentFiles = sandpackFiles !== DEFAULT_FILES ? sandpackFiles : null;

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        prompt: content,
        modelProvider,
        currentFiles,
        history: messages.slice(-10),
      }),
      signal: abortRef.current!.signal,
    });

    if (!response.ok) throw new Error("Generation failed");

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    let plannerContent = "";
    let coderContent = "";
    let reviewerContent = "";
    let currentAgent: string = "";

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

    let buffer = "";
    let hasFiles = false;
    let generationSummary: {
      fileCount?: number;
      files?: string[];
      retries?: number;
      verdict?: string;
      issues?: string[];
    } | null = null;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.agent) {
              currentAgent = data.agent;
              // On coder retry, reset coder content
              if (data.agent === "coder" && data.retry) {
                coderContent = "";
              }
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
                    m.id === coderMsg.id ? { ...m, content: coderContent } : m,
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

            // Multi-file update from server
            if (data.files && typeof data.files === "object") {
              setSandpackFiles(data.files);
              setSandpackKey((k) => k + 1);
              setHasGeneratedFiles(true);
              hasFiles = true;
            }

            // Capture summary from backend
            if (data.summary) {
              generationSummary = data.summary;
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    }

    // Build detailed completion summary
    const summary = buildCompletionSummary(hasFiles, generationSummary);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantMsgId ? { ...m, content: summary } : m,
      ),
    );

    await supabase.from("messages").insert([
      { project_id: projectId, role: "assistant", content: summary },
      { project_id: projectId, role: "planner", content: plannerContent },
      { project_id: projectId, role: "coder", content: coderContent },
      { project_id: projectId, role: "reviewer", content: reviewerContent },
    ]);
  }

  async function updateModelProvider(provider: "claude" | "openai") {
    setModelProvider(provider);
    await supabase
      .from("projects")
      .update({ model_provider: provider })
      .eq("id", projectId);
  }

  async function handleRegenerateFromPlan(editedPlan: string) {
    setIsGenerating(true);
    abortRef.current = new AbortController();

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      project_id: projectId,
      role: "assistant",
      content: "正在根据修改后的 Plan 重新生成项目...",
      metadata: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      // Call generate with skipPlanner and the edited plan
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          prompt: project?.description || "Regenerate from edited plan",
          modelProvider,
          currentFiles: sandpackFiles !== DEFAULT_FILES ? sandpackFiles : null,
          history: messages.slice(-10),
          skipPlanner: true,
          plan: editedPlan,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error("Generation failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let coderContent = "";
      let reviewerContent = "";
      let currentAgent = "";

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
      setMessages((prev) => [...prev, coderMsg, reviewerMsg]);

      let buffer = "";
      let hasFiles = false;
      let regenSummary: GenerationSummary | null = null;
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.agent) currentAgent = data.agent;
              if (data.content) {
                if (currentAgent === "coder") {
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
              if (data.files && typeof data.files === "object") {
                setSandpackFiles(data.files);
                setSandpackKey((k) => k + 1);
                setHasGeneratedFiles(true);
                hasFiles = true;
              }
              if (data.summary) {
                regenSummary = data.summary;
              }
            } catch {
              // skip
            }
          }
        }
      }

      const summary = buildCompletionSummary(hasFiles, regenSummary);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id ? { ...m, content: summary } : m,
        ),
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: "Regeneration failed." }
              : m,
          ),
        );
      }
    } finally {
      setIsGenerating(false);
    }
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
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              if (sandpackFiles !== DEFAULT_FILES) {
                const url = getCodeSandboxUrl(sandpackFiles);
                window.open(url, "_blank");
              }
            }}
            disabled={sandpackFiles === DEFAULT_FILES}
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
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

      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <SandpackProvider
          key={sandpackKey}
          template="react"
          files={sandpackFiles}
          theme="dark"
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
          options={{
            bundlerURL: "https://atoms.kuaisanbu.com/sandpack-bundler/?v=2",
            bundlerTimeOut: 120000,
            externalResources: [
              "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
            ],
          }}
        >
          <div className="flex-1 flex overflow-hidden min-h-0">
            <ChatPanel
              messages={messages.filter((m) =>
                ["user", "assistant", "system"].includes(m.role),
              )}
              onSendMessage={handleSendMessage}
              isGenerating={isGenerating}
            />
            <PreviewPanel
              isGenerating={isGenerating}
              hasGeneratedFiles={hasGeneratedFiles}
              files={sandpackFiles}
            />
            <AgentPanel
              messages={messages.filter((m) =>
                ["planner", "coder", "reviewer"].includes(m.role),
              )}
              files={hasGeneratedFiles ? sandpackFiles : {}}
              isGenerating={isGenerating}
              onRegenerateFromPlan={handleRegenerateFromPlan}
            />
          </div>
        </SandpackProvider>
      </div>
    </div>
  );
}
