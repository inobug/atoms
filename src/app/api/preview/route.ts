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
    // Replace const/let with var to avoid duplicate declaration errors
    // when multiple files are concatenated in the same scope
    const safeCode = transpiled.replace(/\b(const|let)\s+/g, "var ");
    return { path, code: safeCode, ok: !error, error };
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
  // --- React hooks destructuring ---
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;
  var useCallback = React.useCallback;
  var useMemo = React.useMemo;
  var useContext = React.useContext;
  var useReducer = React.useReducer;
  var createContext = React.createContext;
  var Fragment = React.Fragment;

  // --- framer-motion stub: motion.div → div, motion.span → span, etc. ---
  var motion = new Proxy({}, {
    get: function(_, tag) {
      return function(props) {
        var children = Array.prototype.slice.call(arguments, 1);
        // Strip motion-specific props, pass the rest
        var clean = {};
        if (props) {
          Object.keys(props).forEach(function(k) {
            if (['initial','animate','exit','transition','whileInView','whileHover','whileTap','viewport','variants','layout','layoutId','drag','dragConstraints'].indexOf(k) === -1) {
              clean[k] = props[k];
            }
          });
        }
        return React.createElement.apply(React, [tag, clean].concat(children));
      };
    }
  });
  var AnimatePresence = function(props) { return props.children || null; };

  // --- lucide-react icon stubs: render as inline SVG placeholder ---
  function __icon(name) {
    return function(props) {
      var size = (props && props.size) || 24;
      var color = (props && props.color) || 'currentColor';
      var fill = (props && props.fill) || 'none';
      var stroke = (props && props.stroke) || color;
      return React.createElement('svg', {
        width: size, height: size, viewBox: '0 0 24 24',
        fill: fill, stroke: stroke, strokeWidth: '2',
        strokeLinecap: 'round', strokeLinejoin: 'round',
        style: props && props.style ? props.style : undefined,
        className: props && props.className ? props.className : undefined
      }, React.createElement('circle', {cx:'12',cy:'12',r:'10',opacity:'0.3'}),
         React.createElement('text', {x:'12',y:'16',textAnchor:'middle',fontSize:'8',fill:stroke,stroke:'none'}, name.charAt(0))
      );
    };
  }
  var Activity = __icon('Activity');
  var Thermometer = __icon('Thermometer');
  var Shield = __icon('Shield');
  var Star = __icon('Star');
  var Phone = __icon('Phone');
  var Mail = __icon('Mail');
  var MapPin = __icon('MapPin');
  var Wifi = __icon('Wifi');
  var Battery = __icon('Battery');
  var Smartphone = __icon('Smartphone');
  var Zap = __icon('Zap');
  var Moon = __icon('Moon');
  var Sun = __icon('Sun');
  var X = __icon('X');
  var Menu = __icon('Menu');
  var ChevronRight = __icon('ChevronRight');
  var ChevronLeft = __icon('ChevronLeft');
  var ChevronDown = __icon('ChevronDown');
  var ChevronUp = __icon('ChevronUp');
  var ArrowRight = __icon('ArrowRight');
  var ArrowLeft = __icon('ArrowLeft');
  var Check = __icon('Check');
  var Search = __icon('Search');
  var Heart = __icon('Heart');
  var User = __icon('User');
  var Settings = __icon('Settings');
  var Home = __icon('Home');
  var Clock = __icon('Clock');
  var Calendar = __icon('Calendar');
  var Eye = __icon('Eye');
  var Download = __icon('Download');
  var Upload = __icon('Upload');
  var Trash = __icon('Trash');
  var Edit = __icon('Edit');
  var Plus = __icon('Plus');
  var Minus = __icon('Minus');
  var RefreshCw = __icon('RefreshCw');
  var ExternalLink = __icon('ExternalLink');
  var Globe = __icon('Globe');
  var Lock = __icon('Lock');
  var Unlock = __icon('Unlock');
  var AlertCircle = __icon('AlertCircle');
  var Info = __icon('Info');
  var HelpCircle = __icon('HelpCircle');
  var Monitor = __icon('Monitor');
  var Tablet = __icon('Tablet');
  var Laptop = __icon('Laptop');
  var Camera = __icon('Camera');
  var Image = __icon('Image');
  var Play = __icon('Play');
  var Pause = __icon('Pause');
  var Volume2 = __icon('Volume2');
  var Share2 = __icon('Share2');
  var Copy = __icon('Copy');
  var Send = __icon('Send');
  var MessageCircle = __icon('MessageCircle');
  var Bell = __icon('Bell');
  var Tag = __icon('Tag');
  var Bookmark = __icon('Bookmark');
  var Filter = __icon('Filter');
  var MoreHorizontal = __icon('MoreHorizontal');
  var MoreVertical = __icon('MoreVertical');
  var Code = __icon('Code');
  var Terminal = __icon('Terminal');
  var Database = __icon('Database');
  var Server = __icon('Server');
  var Cloud = __icon('Cloud');
  var Cpu = __icon('Cpu');
  var Layers = __icon('Layers');
  var Box = __icon('Box');
  var Package = __icon('Package');
  var GitBranch = __icon('GitBranch');
  var FileText = __icon('FileText');
  var Folder = __icon('Folder');
  var Map = __icon('Map');
  var Navigation = __icon('Navigation');
  var Compass = __icon('Compass');
  var Award = __icon('Award');
  var TrendingUp = __icon('TrendingUp');
  var BarChart2 = __icon('BarChart2');
  var PieChart = __icon('PieChart');
  var Target = __icon('Target');
  var Briefcase = __icon('Briefcase');
  var ShoppingCart = __icon('ShoppingCart');
  var CreditCard = __icon('CreditCard');
  var DollarSign = __icon('DollarSign');
  var Gift = __icon('Gift');
  var Truck = __icon('Truck');
  var Users = __icon('Users');
  var UserPlus = __icon('UserPlus');
  var LogIn = __icon('LogIn');
  var LogOut = __icon('LogOut');

  // --- recharts stubs: render children or placeholder ---
  function __chartContainer(props) {
    var children = Array.prototype.slice.call(arguments, 1);
    return React.createElement('div', {
      style: {width: props && props.width || '100%', height: props && props.height || 200, background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.08)'}
    }, React.createElement('span', {style:{color:'#666',fontSize:'12px'}}, 'Chart'));
  }
  var ResponsiveContainer = function(props) { var children = Array.prototype.slice.call(arguments, 1); return React.createElement('div', {style:{width:'100%',height: props.height || 200}}, children); };
  var AreaChart = __chartContainer;
  var LineChart = __chartContainer;
  var BarChart = __chartContainer;
  var PieChart2 = __chartContainer;
  var RadarChart = __chartContainer;
  var ComposedChart = __chartContainer;
  var Area = function() { return null; };
  var Line = function() { return null; };
  var Bar = function() { return null; };
  var XAxis = function() { return null; };
  var YAxis = function() { return null; };
  var CartesianGrid = function() { return null; };
  var Tooltip = function() { return null; };
  var Legend = function() { return null; };
  var Cell = function() { return null; };
  var Pie = function() { return null; };
  var Radar = function() { return null; };
  var PolarGrid = function() { return null; };
  var PolarAngleAxis = function() { return null; };
  var PolarRadiusAxis = function() { return null; };
  var RadialBar = function() { return null; };
  var Treemap = function() { return null; };

  // --- Stub for missing components (skipped due to errors) ---
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
      var __reactRoot = ReactDOM.createRoot(document.getElementById('root'));
      __reactRoot.render(React.createElement(App));
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
 * Detect if file content is likely truncated.
 * Only checks for obvious signs — brace counting is unreliable for JSX
 * because inline styles like style={{...}} create nested brace patterns.
 */
function isLikelyTruncated(code: string): boolean {
  const trimmed = code.trimEnd();
  // Ends with obviously incomplete patterns (mid-expression)
  if (/[{(,]\s*$/.test(trimmed)) return true;
  // Ends mid-string (unclosed quote on last line)
  const lastLine = trimmed.split("\n").pop() || "";
  if (/['"`][^'"`]*$/.test(lastLine) && !/\/\//.test(lastLine)) return true;
  // Very short file that looks like it started but never finished
  if (trimmed.length < 20 && /^(import|export|function|const)\s/.test(trimmed))
    return true;
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
      // Remove ReactDOM.createRoot / ReactDOM.render entry-point code
      .replace(
        /(?:const|let|var)\s+\w+\s*=\s*ReactDOM\.createRoot\([^)]*\);?/g,
        "",
      )
      .replace(/ReactDOM\.createRoot\([^)]*\)\.render\([^)]*\);?/g, "")
      .replace(/ReactDOM\.render\([^)]*,[^)]*\);?/g, "")
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
