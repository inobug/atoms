export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  current_code: string | null;
  current_files: SandpackFiles | null;
  plan: string | null;
  model_provider: "claude" | "openai";
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  project_id: string;
  role: "user" | "assistant" | "planner" | "coder" | "reviewer" | "system";
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface GeneratedFile {
  id: string;
  project_id: string;
  version: number;
  filename: string;
  content: string;
  language: string | null;
  generation_id: string | null;
  created_at: string;
}

export type AgentRole = "planner" | "coder" | "reviewer";

export interface AgentMessage {
  role: AgentRole;
  content: string;
  isStreaming?: boolean;
}

// Multi-file output types
export interface ParsedFile {
  path: string;
  content: string;
}

export type SandpackFiles = Record<string, { code: string }>;

export interface ReviewerVerdict {
  verdict: "pass" | "retry";
  issues: string[];
}

// Interactive chat options
export interface ChatOption {
  id: string;
  label: string;
  description?: string;
  type: "checkbox" | "radio";
  group: string;
  defaultChecked?: boolean;
}
