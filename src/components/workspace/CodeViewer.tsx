"use client";

import type { SandpackFiles } from "@/types";

interface CodeViewerProps {
  files: SandpackFiles;
  activeFile: string | null;
}

export function CodeViewer({ files, activeFile }: CodeViewerProps) {
  if (!activeFile || !files[activeFile]) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
        Select a file to view its content
      </div>
    );
  }

  const code = files[activeFile].code;
  const filename = activeFile.split("/").pop() || activeFile;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 py-1.5 border-b border-border/50 flex items-center">
        <span className="text-xs text-muted-foreground">{filename}</span>
      </div>
      <div className="flex-1 overflow-auto">
        <pre className="p-3 text-xs leading-relaxed font-mono text-foreground/80 whitespace-pre-wrap break-all">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
