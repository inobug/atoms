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

interface TranspileResult {
  path: string;
  code: string;
  ok: boolean;
  error?: string;
}

function buildPreviewHtml(files: SandpackFiles): string {
  const entries = Object.entries(files).map(([path, file]) => ({
    path,
    code: typeof file === "string" ? (file as string) : file.code,
  }));

  // Separate CSS and JS/JSX files (only transpile actual code files)
  const cssFiles = entries.filter((e) => e.path.endsWith(".css"));
  const jsFiles = entries.filter((e) => /\.[jt]sx?$/.test(e.path));

  // Sort: deeper paths first (components), App.* last
  jsFiles.sort((a, b) => {
    const aIsApp = /\/App\.[jt]sx?$/.test(a.path);
    const bIsApp = /\/App\.[jt]sx?$/.test(b.path);
    if (aIsApp && !bIsApp) return 1;
    if (!aIsApp && bIsApp) return -1;
    return b.path.split("/").length - a.path.split("/").length;
  });

  // Strip module syntax and transpile JSX → JS (per-file, fault-tolerant)
  const results: TranspileResult[] = jsFiles.map(({ path, code }) => {
    // Check for obvious truncation
    const truncated = isLikelyTruncated(code);
    if (truncated) {
      return {
        path,
        code: "",
        ok: false,
        error: `File truncated (incomplete code)`,
      };
    }

    const stripped = stripModuleSyntax(code);
    const { code: transpiled, error } = transpileJsx(stripped, path);
    return { path, code: transpiled, ok: !error, error };
  });

  const successBlocks = results
    .filter((r) => r.ok)
    .map((r) => `\n// --- ${r.path} ---\n${r.code}`)
    .join("\n");

  const failedFiles = results.filter((r) => !r.ok);

  const cssCode = cssFiles.map((e) => e.code).join("\n");

  // Detect Tailwind usage
  const allCode = entries.map((e) => e.code).join(" ");
  const usesTailwind =
    /className=["'][^"']*(?:flex|grid|bg-|text-|p-|m-|w-|h-|rounded|shadow|border|gap-|items-|justify-)/.test(
      allCode,
    );

  // Build error banner HTML if some files failed
  const errorBanner =
    failedFiles.length > 0
      ? `<div id="__errors" style="position:fixed;top:0;left:0;right:0;background:#fef2f2;border-bottom:2px solid #ef4444;padding:8px 12px;font-family:system-ui;font-size:12px;color:#991b1b;z-index:9999;">
<strong>${failedFiles.length} file(s) skipped due to errors:</strong>
<ul style="margin:4px 0 0 16px;">${failedFiles.map((f) => `<li><code>${f.path}</code> — ${f.error}</li>`).join("")}</ul>
</div>`
      : "";

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
${errorBanner}
<div id="root"></div>
<script>
(function() {
  // Stub for missing components (skipped due to errors)
  function __stub(name) {
    return function() {
      return React.createElement('div', {
        style: {padding:'12px',margin:'8px',background:'#fef9c3',border:'1px solid #eab308',borderRadius:'4px',fontSize:'13px',color:'#854d0e'}
      }, '⚠ Component "' + name + '" failed to compile');
    };
  }
${failedFiles
  .map((f) => {
    const name = extractComponentName(f.path);
    return name ? `  var ${name} = __stub("${name}");` : "";
  })
  .filter(Boolean)
  .join("\n")}

  try {
${successBlocks}

    // --- Render ---
    if (typeof App !== 'undefined') {
      var root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(App));
    } else {
      document.getElementById('root').innerHTML = '<p style="padding:20px;color:#888;">No App component found.</p>';
    }
  } catch(e) {
    document.getElementById('root').innerHTML =
      '<div style="padding:20px;font-family:monospace;color:#dc2626;"><h3>Runtime Error</h3><pre style="margin-top:8px;white-space:pre-wrap;">' +
      (e.message || e) + '</pre></div>';
    console.error(e);
  }
})();
</script>
</body>
</html>`;
}

function transpileJsx(
  code: string,
  filename: string,
): { code: string; error?: string } {
  try {
    const result = transformSync(code, {
      filename,
      presets: [[presetReact, { runtime: "classic" }]],
      plugins: [],
      ast: false,
      sourceMaps: false,
    });
    return { code: result?.code || code };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Transpile error";
    return { code: "", error: msg };
  }
}

/**
 * Detect if file content is likely truncated:
 * - Unbalanced braces/parens
 * - Ends abruptly mid-expression
 */
function isLikelyTruncated(code: string): boolean {
  let braces = 0;
  let parens = 0;
  for (const ch of code) {
    if (ch === "{") braces++;
    else if (ch === "}") braces--;
    else if (ch === "(") parens++;
    else if (ch === ")") parens--;
  }
  // If more than 2 unclosed, likely truncated
  if (braces > 2 || parens > 2) return true;
  // Ends with obviously incomplete patterns
  if (/[{(,]\s*$/.test(code.trimEnd())) return true;
  return false;
}

function extractComponentName(path: string): string | null {
  const match = path.match(/\/([A-Z][A-Za-z0-9]*)\.(?:jsx?|tsx?)$/);
  return match ? match[1] : null;
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
