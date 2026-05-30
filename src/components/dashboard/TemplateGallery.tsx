"use client";

import { Button } from "@/components/ui/button";
import { Layout, ListTodo, BarChart3, ShoppingCart } from "lucide-react";

export interface Template {
  id: string;
  name: string;
  description: string;
  prompt: string;
  icon: React.ReactNode;
}

const templates: Template[] = [
  {
    id: "landing",
    name: "Landing Page",
    description: "Modern landing page with hero, features, and CTA",
    prompt:
      "Build a modern landing page with a hero section featuring a gradient background, a features grid with 3 cards (each with an icon, title, and description), a testimonials section, and a call-to-action footer. Use a clean dark theme with purple accent colors.",
    icon: <Layout className="h-5 w-5" />,
  },
  {
    id: "todo",
    name: "Todo App",
    description: "Interactive todo list with add, complete, and delete",
    prompt:
      "Build a todo app with: add new tasks via input field, mark tasks as complete (strikethrough), delete tasks, filter by all/active/completed, show task count. Use React via CDN. Clean minimal design with smooth animations.",
    icon: <ListTodo className="h-5 w-5" />,
  },
  {
    id: "dashboard",
    name: "Analytics Dashboard",
    description: "Data dashboard with charts and stats cards",
    prompt:
      "Build an analytics dashboard with: a top nav bar, 4 stat cards (revenue, users, orders, conversion rate with percentage changes), a line chart showing weekly data (use CSS/SVG for the chart), a recent orders table with 5 rows, and a sidebar navigation. Dark theme with blue accents.",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    id: "ecommerce",
    name: "Product Page",
    description: "E-commerce product page with gallery and cart",
    prompt:
      "Build a product page for an e-commerce site with: product image gallery (main image + thumbnails), product title, price, description, size/color selectors, quantity picker, add to cart button, and product reviews section with star ratings. Modern clean design.",
    icon: <ShoppingCart className="h-5 w-5" />,
  },
];

interface TemplateGalleryProps {
  onSelectTemplate: (prompt: string) => void;
}

export function TemplateGallery({ onSelectTemplate }: TemplateGalleryProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {templates.map((template) => (
        <button
          key={template.id}
          className="border border-border/50 rounded-lg p-4 text-left hover:border-primary/50 hover:bg-muted/50 transition-all group"
          onClick={() => onSelectTemplate(template.prompt)}
        >
          <div className="text-muted-foreground group-hover:text-primary transition-colors mb-2">
            {template.icon}
          </div>
          <h3 className="text-sm font-medium">{template.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {template.description}
          </p>
        </button>
      ))}
    </div>
  );
}
