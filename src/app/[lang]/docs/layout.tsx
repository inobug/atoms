import { notFound } from "next/navigation";
import { hasLocale, getDictionary } from "../dictionaries";
import { getDocSections } from "@/lib/docs";
import DocsLayoutClient from "./DocsLayoutClient";

export default async function DocsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const sections = getDocSections(lang);

  return (
    <DocsLayoutClient lang={lang} dict={dict} sections={sections}>
      {children}
    </DocsLayoutClient>
  );
}
