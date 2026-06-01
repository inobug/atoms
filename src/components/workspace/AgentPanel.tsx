"use client";

import { useState } from "react";
import {
  Brain,
  Code,
  Search,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Loader2,
  Maximize2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Message, SandpackFiles } from "@/types";
import { FileExplorer } from "./FileExplorer";
import { CodeViewer } from "./CodeViewer";
import { PlanEditor } from "./PlanEditor";

interface AgentPanelProps {
  messages: Message[];
  files: SandpackFiles;
  isGenerating: boolean;
  onRegenerateFromPlan?: (editedPlan: string) => void;
}

const agentSections = [
  {
    role: "planner",
    label: "Planner",
    icon: Brain,
    color: "text-violet-400",
    borderColor: "border-violet-500/30",
  },
  {
    role: "coder",
    label: "Coder",
    icon: Code,
    color: "text-blue-400",
    borderColor: "border-blue-500/30",
  },
  {
    role: "reviewer",
    label: "Reviewer",
    icon: Search,
    color: "text-emerald-400",
    borderColor: "border-emerald-500/30",
  },
] as const;

type ExpandedPanel = "planner" | "coder" | "reviewer" | "files" | null;

export function AgentPanel({
  messages,
  files,
  isGenerating,
  onRegenerateFromPlan,
}: AgentPanelProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>(null);

  function getLatestMessage(role: string): Message | undefined {
    const roleMessages = messages.filter((m) => m.role === role);
    return roleMessages[roleMessages.length - 1];
  }

  function toggleSection(role: string) {
    setCollapsed((prev) => ({ ...prev, [role]: !prev[role] }));
  }

  const hasFiles = Object.keys(files).length > 0;

  // Fullscreen overlay for expanded panel
  if (expandedPanel) {
    return (
      <div className="w-[420px] border-l border-border/50 flex flex-col shrink-0 min-h-0 bg-[#0d1117]">
        <ExpandedView
          panel={expandedPanel}
          messages={messages}
          files={files}
          activeFile={activeFile}
          setActiveFile={setActiveFile}
          isGenerating={isGenerating}
          onRegenerateFromPlan={onRegenerateFromPlan}
          onClose={() => setExpandedPanel(null)}
        />
      </div>
    );
  }

  return (
    <div className="w-[420px] border-l border-border/50 flex flex-col shrink-0 min-h-0 bg-[#0d1117]">
      {/* Agent Status Sections */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {agentSections.map(
          ({ role, label, icon: Icon, color, borderColor }) => {
            const msg = getLatestMessage(role);
            const isCollapsed = collapsed[role];
            const hasContent = msg && msg.content;
            const isActive =
              isGenerating && hasContent && role === getActiveAgent(messages);

            return (
              <div key={role} className={`border-b ${borderColor}`}>
                <div className="flex items-center">
                  <button
                    className="flex-1 flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors"
                    onClick={() => toggleSection(role)}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    )}
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span className={`text-xs font-medium ${color}`}>
                      {label}
                    </span>
                    {isActive && (
                      <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        streaming
                      </span>
                    )}
                    {!isActive && hasContent && (
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        done
                      </span>
                    )}
                  </button>
                  {hasContent && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 mr-2 text-muted-foreground hover:text-foreground"
                      onClick={() => setExpandedPanel(role as ExpandedPanel)}
                    >
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="max-h-[200px] overflow-y-auto">
                    {role === "planner" &&
                    hasContent &&
                    onRegenerateFromPlan ? (
                      <PlanEditor
                        plan={msg!.content}
                        onRegenerate={onRegenerateFromPlan}
                        isGenerating={isGenerating}
                      />
                    ) : hasContent ? (
                      <pre className="px-3 pb-3 text-xs text-muted-foreground whitespace-pre-wrap break-words font-mono leading-relaxed">
                        {msg!.content}
                      </pre>
                    ) : (
                      <p className="px-3 pb-3 text-xs text-muted-foreground/50 italic">
                        Waiting...
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          },
        )}
      </div>

      {/* Files Section */}
      <div className="border-t border-border/50 flex flex-col min-h-[200px] max-h-[50%]">
        <div className="h-9 border-b border-border/50 flex items-center px-3 shrink-0">
          <FolderOpen className="h-3.5 w-3.5 text-muted-foreground mr-2" />
          <span className="text-xs text-muted-foreground">
            Files{hasFiles ? ` (${Object.keys(files).length})` : ""}
          </span>
          {hasFiles && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-auto text-muted-foreground hover:text-foreground"
              onClick={() => setExpandedPanel("files")}
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        {hasFiles ? (
          <div className="flex-1 flex min-h-0">
            <div className="w-[160px] border-r border-border/50 overflow-y-auto shrink-0">
              <FileExplorer
                files={files}
                activeFile={activeFile}
                onSelectFile={setActiveFile}
              />
            </div>
            <div className="flex-1 overflow-hidden flex flex-col min-w-0">
              <CodeViewer files={files} activeFile={activeFile} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-muted-foreground/50">
              Generated files will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Expanded fullscreen view for a single panel */
function ExpandedView({
  panel,
  messages,
  files,
  activeFile,
  setActiveFile,
  isGenerating,
  onRegenerateFromPlan,
  onClose,
}: {
  panel: ExpandedPanel;
  messages: Message[];
  files: SandpackFiles;
  activeFile: string | null;
  setActiveFile: (f: string | null) => void;
  isGenerating: boolean;
  onRegenerateFromPlan?: (plan: string) => void;
  onClose: () => void;
}) {
  const sectionConfig = agentSections.find((s) => s.role === panel);

  const title = panel === "files" ? "Files" : sectionConfig?.label || panel;
  const Icon = panel === "files" ? FolderOpen : sectionConfig?.icon || Brain;
  const color =
    panel === "files"
      ? "text-muted-foreground"
      : sectionConfig?.color || "text-white";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-10 border-b border-border/50 flex items-center px-3 gap-2 shrink-0">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className={`text-sm font-medium ${color}`}>{title}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 ml-auto"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {panel === "files" ? (
          <div className="flex h-full min-h-0">
            <div className="w-[180px] border-r border-border/50 overflow-y-auto shrink-0">
              <FileExplorer
                files={files}
                activeFile={activeFile}
                onSelectFile={setActiveFile}
              />
            </div>
            <div className="flex-1 overflow-hidden flex flex-col min-w-0">
              <CodeViewer files={files} activeFile={activeFile} />
            </div>
          </div>
        ) : panel === "planner" && onRegenerateFromPlan ? (
          <PlanEditor
            plan={getLatestContent(messages, "planner")}
            onRegenerate={onRegenerateFromPlan}
            isGenerating={isGenerating}
          />
        ) : (
          <pre className="p-4 text-xs text-muted-foreground whitespace-pre-wrap break-words font-mono leading-relaxed">
            {getLatestContent(messages, panel || "")}
          </pre>
        )}
      </div>
    </div>
  );
}

function getLatestContent(messages: Message[], role: string): string {
  const roleMessages = messages.filter((m) => m.role === role);
  return roleMessages[roleMessages.length - 1]?.content || "";
}

function getActiveAgent(messages: Message[]): string | null {
  const agentRoles = ["reviewer", "coder", "planner"];
  for (const role of agentRoles) {
    const roleMessages = messages.filter((m) => m.role === role);
    if (
      roleMessages.length > 0 &&
      roleMessages[roleMessages.length - 1].content
    ) {
      return role;
    }
  }
  return null;
}
