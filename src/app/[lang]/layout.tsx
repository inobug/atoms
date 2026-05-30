import { notFound } from "next/navigation";
import { hasLocale } from "./dictionaries";

export async function generateStaticParams() {
  return [{ lang: "zh" }, { lang: "en" }];
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  return (
    <div lang={lang} className="h-full">
      {children}
    </div>
  );
}
