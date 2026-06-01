"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  Loader2,
  Brain,
  Layout,
  ListTodo,
  BarChart3,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import type { Message, ChatOption } from "@/types";
import { OptionsForm } from "./OptionsForm";

/** Lightweight markdown: bold, inline code, blockquotes. No external deps. */
function simpleMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(
      /^&gt; (.+)$/gm,
      '<span class="text-muted-foreground italic">$1</span>',
    );
}

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isGenerating: boolean;
}

const agentConfig = {
  user: { label: "You", icon: null, color: "bg-primary" },
  assistant: { label: "Assistant", icon: Sparkles, color: "bg-primary" },
  system: { label: "System", icon: null, color: "bg-muted" },
};

export function ChatPanel({
  messages,
  onSendMessage,
  isGenerating,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    onSendMessage(input.trim());
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="w-[380px] border-r border-border/50 flex flex-col shrink-0 min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Brain className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Describe what you want to build.
              </p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Or start from a template:
              </p>
              <div className="grid grid-cols-2 gap-2 text-left">
                {[
                  {
                    icon: Layout,
                    name: "Landing Page",
                    prompt:
                      "Build a modern landing page with a hero section featuring a gradient background, a features grid with 3 cards, a testimonials section, and a call-to-action footer. Dark theme with purple accents.",
                  },
                  {
                    icon: ListTodo,
                    name: "Todo App",
                    prompt:
                      "Build a todo app with: add tasks, mark complete, delete, filter by all/active/completed, show count. Use React via CDN. Clean minimal design with animations.",
                  },
                  {
                    icon: BarChart3,
                    name: "Dashboard",
                    prompt:
                      "Build an analytics dashboard with: 4 stat cards, a line chart (SVG), a recent orders table, and sidebar navigation. Dark theme with blue accents.",
                  },
                  {
                    icon: ShoppingCart,
                    name: "Product Page",
                    prompt:
                      "Build an e-commerce product page with: image gallery, title, price, size/color selectors, quantity picker, add to cart button, and reviews with star ratings.",
                  },
                ].map((t) => (
                  <button
                    key={t.name}
                    className="flex items-center gap-2 p-2 rounded-md border border-border/50 hover:border-primary/50 hover:bg-muted/50 transition-all"
                    onClick={() => onSendMessage(t.prompt)}
                  >
                    <t.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onSendMessage={onSendMessage}
              isGenerating={isGenerating}
            />
          ))}
          {isGenerating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Agents are working...
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border/50">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build..."
            className="min-h-[80px] max-h-[200px] pr-12 resize-none"
            disabled={isGenerating}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute bottom-2 right-2 h-8 w-8"
            disabled={!input.trim() || isGenerating}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({
  message,
  onSendMessage,
  isGenerating,
}: {
  message: Message;
  onSendMessage: (content: string) => void;
  isGenerating: boolean;
}) {
  const config =
    agentConfig[message.role as keyof typeof agentConfig] || agentConfig.system;
  const isUser = message.role === "user";
  const Icon = config.icon;
  const options = message.metadata?.options as ChatOption[] | undefined;

  if (!message.content && !options && !isUser) {
    return null;
  }

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      {!isUser && (
        <div
          className={`h-7 w-7 rounded-full ${config.color} flex items-center justify-center shrink-0`}
        >
          {Icon && <Icon className="h-3.5 w-3.5 text-white" />}
        </div>
      )}
      <div className={`flex-1 ${isUser ? "text-right" : ""}`}>
        {!isUser && (
          <span className="text-xs font-medium text-muted-foreground mb-1 block">
            {config.label}
          </span>
        )}
        <div
          className={`inline-block text-sm rounded-lg px-3 py-2 max-w-full text-left ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          }`}
        >
          {message.content && (
            <div
              className="whitespace-pre-wrap break-words [&_strong]:font-semibold [&_code]:bg-background/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono"
              dangerouslySetInnerHTML={{
                __html: simpleMarkdown(message.content),
              }}
            />
          )}
          {options && options.length > 0 && (
            <OptionsForm
              options={options}
              onSubmit={onSendMessage}
              disabled={isGenerating}
            />
          )}
        </div>
      </div>
    </div>
  );
}
