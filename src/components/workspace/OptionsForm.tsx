"use client";

import { useState } from "react";
import { Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatOption } from "@/types";

interface OptionsFormProps {
  options: ChatOption[];
  onSubmit: (message: string) => void;
  disabled?: boolean;
}

export function OptionsForm({ options, onSubmit, disabled }: OptionsFormProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const opt of options) {
      init[opt.id] = opt.defaultChecked ?? false;
    }
    return init;
  });
  const [submitted, setSubmitted] = useState(false);

  // Group options by group name
  const groups: Record<string, ChatOption[]> = {};
  for (const opt of options) {
    if (!groups[opt.group]) groups[opt.group] = [];
    groups[opt.group].push(opt);
  }

  function handleToggle(opt: ChatOption) {
    if (submitted) return;

    setSelected((prev) => {
      const next = { ...prev };
      if (opt.type === "radio") {
        // Deselect other options in same group
        const groupOpts = groups[opt.group];
        for (const o of groupOpts) {
          next[o.id] = false;
        }
        next[opt.id] = true;
      } else {
        next[opt.id] = !prev[opt.id];
      }
      return next;
    });
  }

  function handleSubmit() {
    setSubmitted(true);

    // Compile selections into natural language
    const lines: string[] = ["我的选择："];
    for (const [group, opts] of Object.entries(groups)) {
      const checked = opts.filter((o) => selected[o.id]);
      if (checked.length > 0) {
        lines.push(`- ${group}：${checked.map((o) => o.label).join("、")}`);
      } else {
        lines.push(`- ${group}：无`);
      }
    }

    onSubmit(lines.join("\n"));
  }

  return (
    <div className="space-y-3 mt-2">
      {Object.entries(groups).map(([group, opts]) => (
        <div key={group}>
          <p className="text-xs font-medium text-foreground/70 mb-1.5">
            {group}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {opts.map((opt) => {
              const isChecked = selected[opt.id];
              return (
                <button
                  key={opt.id}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition-all ${
                    isChecked
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 text-muted-foreground hover:border-primary/50"
                  } ${submitted ? "opacity-70 cursor-default" : "cursor-pointer"}`}
                  onClick={() => handleToggle(opt)}
                  disabled={submitted}
                  title={opt.description}
                >
                  {isChecked && <Check className="h-3 w-3" />}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!submitted && (
        <Button
          size="sm"
          className="h-7 text-xs gap-1.5 mt-1"
          onClick={handleSubmit}
          disabled={disabled}
        >
          <Send className="h-3 w-3" />
          确认提交
        </Button>
      )}
      {submitted && (
        <p className="text-[10px] text-muted-foreground/50">已提交</p>
      )}
    </div>
  );
}
