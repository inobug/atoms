import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "../dictionaries";
import LoginClient from "./LoginClient";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return <LoginClient lang={lang} dict={dict} />;
}
