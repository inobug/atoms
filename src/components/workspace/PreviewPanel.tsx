"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, Smartphone, Tablet, RefreshCw } from "lucide-react";
import {
  SandpackPreview as SandpackPreviewComponent,
  useSandpack,
} from "@codesandbox/sandpack-react";
import type { SandpackFiles } from "@/types";

type DeviceMode = "desktop" | "tablet" | "mobile";

const FALLBACK_TIMEOUT_MS = 10_000;

interface PreviewPanelProps {
  isGenerating: boolean;
  hasGeneratedFiles: boolean;
  files: SandpackFiles;
}

export function PreviewPanel({
  isGenerating,
  hasGeneratedFiles,
  files,
}: PreviewPanelProps) {
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [useFallback, setUseFallback] = useState(false);
  const [fallbackHtml, setFallbackHtml] = useState("");
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const { sandpack } = useSandpack();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sandpackOkRef = useRef(false);

  const deviceWidths: Record<DeviceMode, string> = {
    desktop: "100%",
    tablet: "768px",
    mobile: "375px",
  };

  // Track if Sandpack bundler ACTUALLY connects (not just "idle" init state)
  // Only trust bundlerState being populated as proof of real connection
  useEffect(() => {
    if (sandpack.bundlerState && !sandpack.error) {
      sandpackOkRef.current = true;
      queueMicrotask(() => setUseFallback(false));
    }
    if (sandpack.status === "timeout") {
      queueMicrotask(() => setUseFallback(true));
    }
  }, [sandpack.bundlerState, sandpack.status, sandpack.error]);

  // Timer-based fallback — fires unconditionally after timeout
  useEffect(() => {
    if (!hasGeneratedFiles) return;
    sandpackOkRef.current = false;

    const timer = setTimeout(() => {
      if (!sandpackOkRef.current) {
        setUseFallback(true);
      }
    }, FALLBACK_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [hasGeneratedFiles, files]);

  // Fetch server-compiled HTML when fallback activates
  const fetchFallbackHtml = useCallback(async () => {
    if (Object.keys(files).length === 0) return;
    setFallbackLoading(true);
    setFallbackHtml("");
    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      });
      if (res.ok) {
        const html = await res.text();
        setFallbackHtml(html);
      } else {
        setFallbackHtml(
          '<html><body><p style="padding:20px;color:red;">Preview build failed.</p></body></html>',
        );
      }
    } catch {
      setFallbackHtml(
        '<html><body><p style="padding:20px;color:red;">Preview request failed.</p></body></html>',
      );
    } finally {
      setFallbackLoading(false);
    }
  }, [files]);

  useEffect(() => {
    if (useFallback) {
      queueMicrotask(() => {
        fetchFallbackHtml();
      });
    }
  }, [useFallback, fetchFallbackHtml]);

  function handleRefresh() {
    if (useFallback) {
      fetchFallbackHtml();
    } else {
      sandpack.runSandpack();
    }
  }

  function handleRetrySandpack() {
    setUseFallback(false);
    sandpackOkRef.current = false;
    sandpack.runSandpack();
  }

  const showPreview = hasGeneratedFiles;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Toolbar */}
      <div className="h-10 border-b border-border/50 flex items-center px-3 gap-1 shrink-0">
        <span className="text-xs text-muted-foreground mr-2">Preview</span>
        <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
          <Button
            variant={device === "desktop" ? "secondary" : "ghost"}
            size="icon"
            className="h-6 w-6"
            onClick={() => setDevice("desktop")}
          >
            <Monitor className="h-3 w-3" />
          </Button>
          <Button
            variant={device === "tablet" ? "secondary" : "ghost"}
            size="icon"
            className="h-6 w-6"
            onClick={() => setDevice("tablet")}
          >
            <Tablet className="h-3 w-3" />
          </Button>
          <Button
            variant={device === "mobile" ? "secondary" : "ghost"}
            size="icon"
            className="h-6 w-6"
            onClick={() => setDevice("mobile")}
          >
            <Smartphone className="h-3 w-3" />
          </Button>
        </div>
        {showPreview && (
          <div className="ml-auto flex items-center gap-1">
            {useFallback && (
              <>
                <span className="text-[10px] text-yellow-500 mr-1">
                  Fallback
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-1.5 text-muted-foreground hover:text-foreground"
                  onClick={handleRetrySandpack}
                >
                  Retry Sandpack
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Preview area */}
      <div className="flex-1 bg-[#0a0a0f] flex items-center justify-center overflow-hidden relative">
        {showPreview ? (
          <div
            className="h-full bg-white overflow-hidden transition-all duration-300"
            style={{ width: deviceWidths[device], maxWidth: "100%" }}
          >
            {useFallback ? (
              fallbackLoading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-gray-500">Compiling preview...</p>
                </div>
              ) : (
                <iframe
                  ref={iframeRef}
                  srcDoc={fallbackHtml}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                  title="Preview (fallback)"
                />
              )
            ) : (
              <SandpackPreviewComponent
                showOpenInCodeSandbox={false}
                showRefreshButton={false}
                style={{ height: "100%", width: "100%" }}
              />
            )}
          </div>
        ) : (
          <PreviewPlaceholder isGenerating={isGenerating} />
        )}
      </div>
    </div>
  );
}

function PreviewPlaceholder({ isGenerating }: { isGenerating: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 select-none">
      <div className="relative w-32 h-32">
        <div
          className={`absolute inset-0 rounded-full border border-violet-500/20 ${isGenerating ? "animate-spin" : ""}`}
          style={{ animationDuration: "8s" }}
        />
        <div
          className={`absolute inset-3 rounded-full border border-blue-500/30 ${isGenerating ? "animate-spin" : ""}`}
          style={{ animationDuration: "6s", animationDirection: "reverse" }}
        />
        <div
          className={`absolute inset-6 rounded-full border border-cyan-500/20 ${isGenerating ? "animate-spin" : ""}`}
          style={{ animationDuration: "4s" }}
        />
        <div className="absolute inset-9 rounded-full bg-gradient-to-br from-violet-500/30 to-blue-500/30 blur-sm" />
        <div className="absolute inset-10 rounded-full bg-gradient-to-br from-violet-600/50 to-blue-600/50" />
        {isGenerating && (
          <>
            <div
              className="absolute w-2 h-2 rounded-full bg-violet-400 animate-spin"
              style={{
                top: "0",
                left: "50%",
                marginLeft: "-4px",
                animationDuration: "3s",
                transformOrigin: "4px 64px",
                boxShadow: "0 0 8px 2px rgba(167,139,250,0.4)",
              }}
            />
            <div
              className="absolute w-1.5 h-1.5 rounded-full bg-blue-400 animate-spin"
              style={{
                top: "50%",
                right: "0",
                marginTop: "-3px",
                animationDuration: "4s",
                transformOrigin: "-60px 3px",
                boxShadow: "0 0 8px 2px rgba(96,165,250,0.4)",
              }}
            />
            <div
              className="absolute w-1 h-1 rounded-full bg-cyan-400 animate-spin"
              style={{
                bottom: "0",
                left: "50%",
                marginLeft: "-2px",
                animationDuration: "5s",
                transformOrigin: "2px -60px",
                boxShadow: "0 0 6px 2px rgba(34,211,238,0.3)",
              }}
            />
          </>
        )}
        {isGenerating && (
          <div
            className="absolute inset-6 rounded-full bg-violet-500/10 animate-ping"
            style={{ animationDuration: "2s" }}
          />
        )}
      </div>
      <div className="text-center space-y-2">
        {isGenerating ? (
          <>
            <div className="flex items-center gap-2 text-sm text-violet-300/90">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
              </span>
              Building your project...
            </div>
            <p className="text-xs text-muted-foreground/50">
              Agents are generating code. Preview will appear shortly.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground/70">Ready to build</p>
            <p className="text-xs text-muted-foreground/40">
              Describe your project in the chat to get started
            </p>
          </>
        )}
      </div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
      </div>
    </div>
  );
}
