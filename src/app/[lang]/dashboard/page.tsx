import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "../dictionaries";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return <DashboardClient lang={lang} dict={dict} />;
}
