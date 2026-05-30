import { redirect } from "next/navigation";

export default async function DocsIndexPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  redirect(`/${lang}/docs/getting-started`);
}
