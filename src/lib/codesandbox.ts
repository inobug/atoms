import type { SandpackFiles } from "@/types";
import LZString from "lz-string";

/**
 * Generate a CodeSandbox URL from Sandpack files.
 * Uses the CodeSandbox Define API with compressed parameters.
 */
export function getCodeSandboxUrl(files: SandpackFiles): string {
  const sandboxFiles: Record<string, { content: string }> = {};

  for (const [path, { code }] of Object.entries(files)) {
    // Remove leading slash for CodeSandbox format
    const cleanPath = path.replace(/^\//, "");
    sandboxFiles[cleanPath] = { content: code };
  }

  const parameters = compress({ files: sandboxFiles });
  return `https://codesandbox.io/api/v1/sandboxes/define?parameters=${parameters}`;
}

function compress(data: unknown): string {
  const json = JSON.stringify(data);
  const compressed = LZString.compressToBase64(json)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return compressed;
}
