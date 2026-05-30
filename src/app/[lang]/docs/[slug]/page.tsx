import { notFound } from "next/navigation";
import { hasLocale, getDictionary } from "../../dictionaries";
import { getDocContent, extractHeadings, markdownToHtml } from "@/lib/docs";
import DocPageClient from "./DocPageClient";

export async function generateStaticParams() {
  const slugs = ["getting-started", "workspace", "faq"];
  const langs = ["zh", "en"];
  return langs.flatMap((lang) => slugs.map((slug) => ({ lang, slug })));
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const doc = await getDocContent(lang, slug);
  if (!doc) notFound();

  const headings = extractHeadings(doc.content);
  const html = markdownToHtml(doc.content);

  return (
    <DocPageClient
      lang={lang}
      dict={dict}
      title={doc.title}
      html={html}
      headings={headings}
    />
  );
}
