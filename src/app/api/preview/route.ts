import { NextRequest, NextResponse } from "next/server";
import { transformSync } from "@babel/core";
// Import preset directly so Next.js NFT traces it for standalone output
// @ts-expect-error - no types for preset-react default export
import presetReact from "@babel/preset-react";
import type { SandpackFiles } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { files } = (await req.json()) as { files: SandpackFiles };

  if (!files || Object.keys(files).length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  try {
    const html = buildPreviewHtml(files);
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Transpilation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function buildPreviewHtml(files: SandpackFiles): string {
  const entries = Object.entries(files).map(([path, file]) => ({
    path,
    code: typeof file === "string" ? (file as string) : file.code,
  }));

  // Separate CSS and JS/JSX files
  const cssFiles = entries.filter((e) => e.path.endsWith(".css"));
  const jsFiles = entries.filter(
    (e) =>
      !e.path.endsWith(".css") &&
      !e.path.endsWith(".json") &&
      !e.path.endsWith(".md"),
  );

  // Sort: deeper paths first (components), App.* last
  jsFiles.sort((a, b) => {
    const aIsApp = /\/App\.[jt]sx?$/.test(a.path);
    const bIsApp = /\/App\.[jt]sx?$/.test(b.path);
    if (aIsApp && !bIsApp) return 1;
    if (!aIsApp && bIsApp) return -1;
    return b.path.split("/").length - a.path.split("/").length;
  });

  // Strip module syntax and transpile JSX → JS
  const jsBlocks: string[] = [];
  for (const { path, code } of jsFiles) {
    const stripped = stripModuleSyntax(code);
    const transpiled = transpileJsx(stripped, path);
    jsBlocks.push(`\n// --- ${path} ---\n${transpiled}`);
  }

  const jsCode = jsBlocks.join("\n");
  const cssCode = cssFiles.map((e) => e.code).join("\n");

  // Detect Tailwind usage
  const allCode = entries.map((e) => e.code).join(" ");
  const usesTailwind =
    /className=["'][^"']*(?:flex|grid|bg-|text-|p-|m-|w-|h-|rounded|shadow|border|gap-|items-|justify-)/.test(
      allCode,
    );

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<script crossorigin src="/libs/react.min.js"></script>
<script crossorigin src="/libs/react-dom.min.js"></script>
${usesTailwind ? '<script crossorigin src="/libs/tailwind.js"></script>' : ""}
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
${cssCode}
</style>
</head>
<body>
<div id="root"></div>
<script>
(function() {
${jsCode}

// --- Render ---
if (typeof App !== 'undefined') {
  var root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(React.createElement(App));
} else {
  document.getElementById('root').innerHTML = '<p style="padding:20px;color:#888;">No App component found.</p>';
}
})();
</script>
</body>
</html>`;
}

function transpileJsx(code: string, filename: string): string {
  try {
    const result = transformSync(code, {
      filename,
      presets: [[presetReact, { runtime: "classic" }]],
      plugins: [],
      ast: false,
      sourceMaps: false,
    });
    return result?.code || code;
  } catch {
    // If transpilation fails, return original (might work if it's plain JS)
    return code;
  }
}

function stripModuleSyntax(code: string): string {
  return (
    code
      // Remove multi-line imports: import { X, Y } from '...'
      .replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"];?/g, "")
      // Remove * as imports: import * as X from '...'
      .replace(/import\s*\*\s*as\s+\w+\s+from\s*['"][^'"]+['"];?/g, "")
      // Remove default + named imports: import X, { Y } from '...'
      .replace(/import\s+\w+\s*,\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"];?/g, "")
      // Remove default imports: import X from '...'
      .replace(/import\s+\w+\s+from\s*['"][^'"]+['"];?/g, "")
      // Remove side-effect imports: import '...'
      .replace(/import\s+['"][^'"]+['"];?/g, "")
      // export default function Name → function Name
      .replace(/export\s+default\s+function\s+/g, "function ")
      // export default class Name → class Name
      .replace(/export\s+default\s+class\s+/g, "class ")
      // export function → function
      .replace(/export\s+function\s+/g, "function ")
      // export const/let/var → const/let/var
      .replace(/export\s+(const|let|var)\s+/g, "$1 ")
      // export default identifier; → remove
      .replace(/^export\s+default\s+\w+\s*;?\s*$/gm, "")
      // export { ... } → remove
      .replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, "")
  );
}
