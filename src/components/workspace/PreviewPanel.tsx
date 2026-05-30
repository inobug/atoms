"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
  Maximize2,
} from "lucide-react";

interface PreviewPanelProps {
  code: string;
}

type DeviceMode = "desktop" | "tablet" | "mobile";

export function PreviewPanel({ code }: PreviewPanelProps) {
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [refreshKey, setRefreshKey] = useState(0);

  const deviceWidths: Record<DeviceMode, string> = {
    desktop: "100%",
    tablet: "768px",
    mobile: "375px",
  };

  function handleRefresh() {
    setRefreshKey((k) => k + 1);
  }

  function handleFullscreen() {
    const iframe = document.getElementById(
      "preview-iframe",
    ) as HTMLIFrameElement;
    if (iframe) {
      iframe.requestFullscreen?.();
    }
  }

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
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleFullscreen}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 bg-zinc-900 flex items-center justify-center p-4 overflow-hidden">
        {code ? (
          <div
            className="h-full bg-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300"
            style={{ width: deviceWidths[device], maxWidth: "100%" }}
          >
            <iframe
              id="preview-iframe"
              key={refreshKey}
              srcDoc={code}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-forms allow-modals allow-popups"
              title="App Preview"
            />
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <Monitor className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No preview yet</p>
            <p className="text-xs mt-1">
              Send a message to generate your application
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
