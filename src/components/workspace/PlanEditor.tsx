"use client";

import { useState } from "react";
import { Pencil, RotateCcw, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlanEditorProps {
  plan: string;
  onRegenerate: (editedPlan: string) => void;
  isGenerating: boolean;
}

export function PlanEditor({
  plan,
  onRegenerate,
  isGenerating,
}: PlanEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPlan, setEditedPlan] = useState(plan);

  function handleEdit() {
    setEditedPlan(plan);
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
    setEditedPlan(plan);
  }

  function handleRegenerate() {
    setIsEditing(false);
    onRegenerate(editedPlan);
  }

  if (!plan) return null;

  return (
    <div className="px-3 pb-3">
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            className="w-full h-[180px] bg-zinc-900 border border-border/50 rounded-md p-2 text-xs font-mono text-foreground/80 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50"
            value={editedPlan}
            onChange={(e) => setEditedPlan(e.target.value)}
          />
          <div className="flex gap-1.5">
            <Button
              size="sm"
              className="h-6 text-[10px] gap-1"
              onClick={handleRegenerate}
              disabled={isGenerating}
            >
              <RotateCcw className="h-3 w-3" />
              Regenerate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] gap-1"
              onClick={handleCancel}
            >
              <X className="h-3 w-3" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative group">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words font-mono leading-relaxed">
            {plan}
          </pre>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-0 right-0 h-6 text-[10px] gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleEdit}
            disabled={isGenerating}
          >
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
        </div>
      )}
    </div>
  );
}
