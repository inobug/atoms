"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileCode,
  FileJson,
  FileType,
  Palette,
} from "lucide-react";
import type { SandpackFiles } from "@/types";

interface FileExplorerProps {
  files: SandpackFiles;
  activeFile: string | null;
  onSelectFile: (path: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

function buildTree(files: SandpackFiles): TreeNode[] {
  const root: TreeNode[] = [];

  const paths = Object.keys(files).sort();
  for (const filePath of paths) {
    const parts = filePath.replace(/^\//, "").split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const fullPath = "/" + parts.slice(0, i + 1).join("/");
      const isDir = i < parts.length - 1;

      let existing = current.find((n) => n.name === name && n.isDir === isDir);
      if (!existing) {
        existing = { name, path: fullPath, isDir, children: [] };
        current.push(existing);
      }
      current = existing.children;
    }
  }

  return root;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jsx":
    case "tsx":
    case "js":
    case "ts":
      return <FileCode className="h-3.5 w-3.5 text-yellow-400" />;
    case "json":
      return <FileJson className="h-3.5 w-3.5 text-green-400" />;
    case "css":
      return <Palette className="h-3.5 w-3.5 text-blue-400" />;
    default:
      return <FileType className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function TreeItem({
  node,
  depth,
  activeFile,
  onSelectFile,
}: {
  node: TreeNode;
  depth: number;
  activeFile: string | null;
  onSelectFile: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  if (node.isDir) {
    return (
      <div>
        <button
          className="w-full flex items-center gap-1 px-2 py-1 text-xs hover:bg-muted/50 text-muted-foreground"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <span className="font-medium">{node.name}</span>
        </button>
        {expanded &&
          node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              activeFile={activeFile}
              onSelectFile={onSelectFile}
            />
          ))}
      </div>
    );
  }

  const isActive = activeFile === node.path;
  return (
    <button
      className={`w-full flex items-center gap-1.5 px-2 py-1 text-xs hover:bg-muted/50 ${
        isActive ? "bg-muted text-foreground" : "text-muted-foreground"
      }`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      onClick={() => onSelectFile(node.path)}
    >
      {getFileIcon(node.name)}
      <span>{node.name}</span>
    </button>
  );
}

export function FileExplorer({
  files,
  activeFile,
  onSelectFile,
}: FileExplorerProps) {
  const tree = buildTree(files);

  if (Object.keys(files).length === 0) {
    return (
      <div className="p-3 text-xs text-muted-foreground text-center">
        No files generated yet
      </div>
    );
  }

  return (
    <div className="py-1">
      {tree.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          depth={0}
          activeFile={activeFile}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
}
