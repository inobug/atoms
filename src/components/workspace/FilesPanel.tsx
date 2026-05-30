"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileCode, ChevronRight, FolderOpen } from "lucide-react";
import type { GeneratedFile } from "@/types";

interface FilesPanelProps {
  files: GeneratedFile[];
  onSelectFile: (content: string) => void;
}

export function FilesPanel({ files, onSelectFile }: FilesPanelProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Group files by version
  const latestFiles = files.reduce<Record<string, GeneratedFile>>(
    (acc, file) => {
      if (!acc[file.filename] || file.version > acc[file.filename].version) {
        acc[file.filename] = file;
      }
      return acc;
    },
    {},
  );

  const fileList = Object.values(latestFiles);

  function handleSelectFile(file: GeneratedFile) {
    setSelectedFile(file.id);
    onSelectFile(file.content);
  }

  return (
    <div className="w-[280px] border-l border-border/50 flex flex-col shrink-0">
      <div className="h-10 border-b border-border/50 flex items-center px-3 shrink-0">
        <span className="text-xs text-muted-foreground">Files</span>
      </div>

      <ScrollArea className="flex-1">
        {fileList.length === 0 ? (
          <div className="p-4 text-center">
            <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">
              Generated files will appear here
            </p>
          </div>
        ) : (
          <div className="p-2">
            {fileList.map((file) => (
              <button
                key={file.id}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left hover:bg-muted transition-colors ${
                  selectedFile === file.id ? "bg-muted" : ""
                }`}
                onClick={() => handleSelectFile(file)}
              >
                <FileCode className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{file.filename}</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Code viewer */}
      {selectedFile && (
        <div className="border-t border-border/50 h-[40%]">
          <div className="h-8 border-b border-border/50 flex items-center px-3">
            <span className="text-xs text-muted-foreground">
              {fileList.find((f) => f.id === selectedFile)?.filename}
            </span>
          </div>
          <ScrollArea className="h-[calc(100%-2rem)]">
            <pre className="p-3 text-xs font-mono overflow-x-auto">
              <code>
                {fileList.find((f) => f.id === selectedFile)?.content || ""}
              </code>
            </pre>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
