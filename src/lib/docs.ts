export interface DocPage {
  slug: string;
  title: string;
  content: string;
}

export interface DocSection {
  title: string;
  pages: { slug: string; title: string }[];
}

export function getDocSections(lang: string): DocSection[] {
  const sections: Record<string, DocSection[]> = {
    zh: [
      {
        title: "快速开始",
        pages: [{ slug: "getting-started", title: "快速开始" }],
      },
      {
        title: "使用指南",
        pages: [{ slug: "workspace", title: "使用工作区" }],
      },
      {
        title: "帮助",
        pages: [{ slug: "faq", title: "常见问题" }],
      },
    ],
    en: [
      {
        title: "Getting Started",
        pages: [{ slug: "getting-started", title: "Getting Started" }],
      },
      {
        title: "Guides",
        pages: [{ slug: "workspace", title: "Using the Workspace" }],
      },
      {
        title: "Help",
        pages: [{ slug: "faq", title: "FAQ" }],
      },
    ],
  };
  return sections[lang] || sections.en;
}

export async function getDocContent(
  lang: string,
  slug: string,
): Promise<DocPage | null> {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(
      process.cwd(),
      "src/content/docs",
      lang,
      `${slug}.md`,
    );
    const content = await fs.readFile(filePath, "utf-8");
    const titleMatch = content.match(/^#\s+(.+)$/m);
    return {
      slug,
      title: titleMatch?.[1] || slug,
      content,
    };
  } catch {
    return null;
  }
}

export function extractHeadings(
  content: string,
): { id: string; text: string; level: number }[] {
  const headings: { id: string; text: string; level: number }[] = [];
  const regex = /^(#{2,3})\s+(.+)$/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const text = match[2];
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
      .replace(/^-|-$/g, "");
    headings.push({ id, text, level: match[1].length });
  }
  return headings;
}

export function markdownToHtml(content: string): string {
  let html = content;

  // Remove the title (first h1)
  html = html.replace(/^#\s+.+\n+/, "");

  // Code blocks
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre class="code-block"><code class="language-$1">$2</code></pre>',
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Blockquotes / callouts
  html = html.replace(
    /^>\s*\*\*(.+?)\*\*[:：]\s*(.+)$/gm,
    '<div class="callout"><strong>$1</strong> $2</div>',
  );
  html = html.replace(/^>\s+(.+)$/gm, "<blockquote><p>$1</p></blockquote>");

  // Tables
  html = html.replace(
    /\|(.+)\|\n\|[-|\s]+\|\n((?:\|.+\|\n?)+)/g,
    (_, header, body) => {
      const headers = header.split("|").filter(Boolean);
      const rows = body.trim().split("\n");
      let table = '<table class="doc-table"><thead><tr>';
      headers.forEach((h: string) => {
        table += `<th>${h.trim()}</th>`;
      });
      table += "</tr></thead><tbody>";
      rows.forEach((row: string) => {
        const cells = row.split("|").filter(Boolean);
        table += "<tr>";
        cells.forEach((c: string) => {
          table += `<td>${c.trim()}</td>`;
        });
        table += "</tr>";
      });
      table += "</tbody></table>";
      return table;
    },
  );

  // Headings with IDs
  html = html.replace(/^(#{2,3})\s+(.+)$/gm, (_, hashes, text) => {
    const level = hashes.length;
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
      .replace(/^-|-$/g, "");
    return `<h${level} id="${id}">${text}</h${level}>`;
  });

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/((?:<li>.+<\/li>\n?)+)/g, "<ul>$1</ul>");

  // Ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>");

  // Paragraphs (simple)
  html = html.replace(/^(?!<[a-z]|$)(.+)$/gm, "<p>$1</p>");

  return html;
}
