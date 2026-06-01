import type { ParsedFile, SandpackFiles } from "@/types";

/**
 * Parse multi-file output from Coder agent.
 * Format: --- FILE: path --- ... --- END FILE ---
 * Falls back to treating entire output as single index.html if no delimiters found.
 * Detects and discards truncated files (missing END FILE or incomplete syntax).
 */
export function parseMultiFileOutput(raw: string): ParsedFile[] {
  const filePattern = /^--- FILE: (.+?) ---$/gm;
  const matches = [...raw.matchAll(filePattern)];

  if (matches.length === 0) {
    // Fallback: treat as single HTML file
    const trimmed = raw.trim();
    // Strip markdown code fences if present
    const fenceMatch = trimmed.match(/^```(?:html)?\s*\n([\s\S]*?)\n```$/);
    const content = fenceMatch ? fenceMatch[1].trim() : trimmed;
    return [{ path: "index.html", content }];
  }

  const files: ParsedFile[] = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const path = match[1].trim();
    const startIdx = match.index! + match[0].length + 1; // +1 for newline

    let endIdx: number;
    let hasEndMarker = false;

    // Look for --- END FILE --- before next --- FILE: ---
    const remaining = raw.slice(startIdx);
    const endMatch = remaining.match(/^--- END FILE ---$/m);
    const nextFileStart = matches[i + 1]?.index;

    if (endMatch) {
      // Make sure END FILE is before the next FILE marker
      const endAbsIdx = startIdx + endMatch.index!;
      if (nextFileStart === undefined || endAbsIdx < nextFileStart) {
        endIdx = endAbsIdx;
        hasEndMarker = true;
      } else {
        endIdx = nextFileStart;
      }
    } else if (nextFileStart !== undefined) {
      endIdx = nextFileStart;
    } else {
      endIdx = raw.length;
    }

    const content = raw
      .slice(startIdx, endIdx)
      .replace(/\n--- END FILE ---\s*$/, "")
      .trim();

    if (!content) continue;

    // For the LAST file: if no END FILE marker, it's likely truncated
    const isLastFile = i === matches.length - 1;
    if (isLastFile && !hasEndMarker) {
      // Check if the file looks truncated (incomplete syntax)
      if (isFileTruncated(path, content)) {
        console.warn(`[parser] Discarding truncated file: ${path}`);
        continue;
      }
    }

    files.push({ path, content });
  }

  // Validate: check that App.jsx imports only reference files that exist
  const filePaths = new Set(
    files.map((f) => {
      const p = f.path.startsWith("/") ? f.path : `/${f.path}`;
      return p;
    }),
  );
  const appFile = files.find(
    (f) => f.path === "src/App.jsx" || f.path === "/src/App.jsx",
  );
  if (appFile) {
    // Find imports in App.jsx that reference local files
    const importRegex =
      /import\s+(?:[\w{}\s,*]+)\s+from\s+['"]\.\/(.+?)['"];?/g;
    const appImports = [...appFile.content.matchAll(importRegex)];
    for (const imp of appImports) {
      const importPath = imp[1];
      // Resolve relative to src/
      const resolvedPaths = [
        `/src/${importPath}`,
        `/src/${importPath}.jsx`,
        `/src/${importPath}.js`,
        `/src/${importPath}/index.jsx`,
        `/src/${importPath}/index.js`,
      ];
      const exists = resolvedPaths.some((p) => filePaths.has(p));
      if (!exists) {
        console.warn(
          `[parser] App.jsx imports "${importPath}" but file not found in output`,
        );
      }
    }
  }

  return files;
}

/**
 * Check if file content looks truncated (incomplete syntax).
 */
function isFileTruncated(path: string, content: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase();

  if (ext === "json") {
    try {
      JSON.parse(content);
      return false;
    } catch {
      return true;
    }
  }

  if (ext === "jsx" || ext === "js" || ext === "tsx" || ext === "ts") {
    // Check bracket balance
    const opens = (content.match(/[{(]/g) || []).length;
    const closes = (content.match(/[})]/g) || []).length;
    if (opens - closes > 2) return true; // Allow minor imbalance from template literals

    // Check if it ends mid-statement (no closing of function/component)
    const lastLine = content.trim().split("\n").pop()?.trim() || "";
    if (
      lastLine.endsWith(",") ||
      lastLine.endsWith("(") ||
      lastLine.endsWith("{")
    ) {
      return true;
    }

    return false;
  }

  return false; // Can't check other file types
}

/**
 * Validate file completeness: check that App.jsx imports only reference existing files.
 * Returns a list of issues found (empty = all good).
 */
export function validateFileCompleteness(files: SandpackFiles): {
  missing: string[];
  truncated: string[];
} {
  const filePaths = new Set(Object.keys(files));
  const missing: string[] = [];
  const truncated: string[] = [];

  // Check App.jsx imports
  const appCode =
    files["/src/App.jsx"]?.code || files["/src/App.tsx"]?.code || "";
  if (appCode) {
    const importRegex =
      /import\s+(?:[\w{}\s,*]+)\s+from\s+['"](\.\/[^'"]+)['"];?/g;
    const imports = [...appCode.matchAll(importRegex)];
    for (const imp of imports) {
      const importPath = imp[1]; // e.g., "./components/Header"
      // Resolve relative to src/
      const base = importPath.replace("./", "/src/");
      const candidates = [
        base,
        `${base}.jsx`,
        `${base}.js`,
        `${base}.tsx`,
        `${base}.ts`,
        `${base}/index.jsx`,
        `${base}/index.js`,
      ];
      if (!candidates.some((c) => filePaths.has(c))) {
        missing.push(importPath);
      }
    }
  }

  // Check each JS/JSX file for truncation signs
  for (const [path, { code }] of Object.entries(files)) {
    const ext = path.split(".").pop()?.toLowerCase();
    if (
      (ext === "jsx" || ext === "js" || ext === "tsx" || ext === "ts") &&
      isFileTruncated(path, code)
    ) {
      truncated.push(path);
    }
    if (ext === "json" && isFileTruncated(path, code)) {
      truncated.push(path);
    }
  }

  return { missing, truncated };
}

/**
 * Convert parsed files to Sandpack file format.
 * Ensures all paths start with /.
 */
export function toSandpackFiles(files: ParsedFile[]): SandpackFiles {
  const result: SandpackFiles = {};
  for (const f of files) {
    const key = f.path.startsWith("/") ? f.path : `/${f.path}`;
    result[key] = { code: f.content };
  }
  return result;
}

/**
 * Convert SandpackFiles back to ParsedFile array.
 */
export function fromSandpackFiles(files: SandpackFiles): ParsedFile[] {
  return Object.entries(files).map(([path, { code }]) => ({
    path: path.startsWith("/") ? path.slice(1) : path,
    content: code,
  }));
}

/**
 * Serialize current files to a string for passing to Coder as context.
 */
export function serializeFilesForPrompt(files: SandpackFiles): string {
  return Object.entries(files)
    .map(
      ([path, { code }]) => `--- FILE: ${path} ---\n${code}\n--- END FILE ---`,
    )
    .join("\n\n");
}

/**
 * Get file extension language mapping.
 */
export function getFileLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    css: "css",
    json: "json",
    html: "html",
    md: "markdown",
  };
  return map[ext || ""] || "text";
}
