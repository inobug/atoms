import type { SandpackFiles } from "@/types";

/**
 * Build a self-contained HTML string from SandpackFiles for srcdoc fallback.
 * Uses Babel standalone for JSX transpilation + React/ReactDOM from CDN.
 * Falls back to this when Sandpack bundler is unreachable (e.g. in China).
 */
export function buildFallbackHtml(files: SandpackFiles): string {
  const entries = Object.entries(files).map(([path, file]) => ({
    path,
    code: typeof file === "string" ? (file as string) : file.code,
  }));

  // Separate CSS, JSON, and JS/JSX files
  const cssFiles = entries.filter((e) => e.path.endsWith(".css"));
  const jsFiles = entries.filter(
    (e) =>
      !e.path.endsWith(".css") &&
      !e.path.endsWith(".json") &&
      !e.path.endsWith(".md"),
  );

  // Sort: deeper paths first (components before App), App.* always last
  jsFiles.sort((a, b) => {
    const aIsApp = /\/App\.[jt]sx?$/.test(a.path);
    const bIsApp = /\/App\.[jt]sx?$/.test(b.path);
    if (aIsApp && !bIsApp) return 1;
    if (!aIsApp && bIsApp) return -1;
    const aDepth = a.path.split("/").length;
    const bDepth = b.path.split("/").length;
    return bDepth - aDepth;
  });

  // Transform JS/JSX: strip imports/exports, keep component definitions
  const jsCode = jsFiles
    .map(({ path, code }) => {
      const transformed = stripModuleSyntax(escapeScriptClose(code));
      return `\n// --- ${path} ---\n${transformed}`;
    })
    .join("\n");

  const cssCode = cssFiles.map((e) => escapeStyleClose(e.code)).join("\n");

  // Check if code uses Tailwind classes
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
<script crossorigin src="https://atoms.kuaisanbu.com/libs/react.min.js"><\/script>
<script crossorigin src="https://atoms.kuaisanbu.com/libs/react-dom.min.js"><\/script>
<script crossorigin src="https://atoms.kuaisanbu.com/libs/babel.min.js"><\/script>
${usesTailwind ? '<script crossorigin src="https://atoms.kuaisanbu.com/libs/tailwind.js"><\\/script>' : ""}
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
${cssCode}
</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
${jsCode}

// --- Render ---
if (typeof App !== 'undefined') {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(React.createElement(App));
} else {
  document.getElementById('root').innerHTML = '<p style="padding:20px;color:#888;">No App component found.</p>';
}
<\/script>
</body>
</html>`;
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

function escapeScriptClose(code: string): string {
  return code.replace(/<\/script/gi, "<\\/script");
}

function escapeStyleClose(code: string): string {
  return code.replace(/<\/style/gi, "<\\/style");
}
