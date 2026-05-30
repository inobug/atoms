import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Code, Eye, Rocket } from "lucide-react";
import { getDictionary, hasLocale } from "./dictionaries";
import { notFound } from "next/navigation";

export default async function LangHomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">{dict.common.brand}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href={`/${lang}/login`}>
              <Button variant="ghost" size="sm">
                {dict.common.signIn}
              </Button>
            </Link>
            <Link href={`/${lang}/login`}>
              <Button size="sm">{dict.common.getStarted}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6">
        <section className="py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/50 text-sm text-muted-foreground mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            {dict.landing.badge}
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            {dict.landing.heroTitle1}
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              {dict.landing.heroTitle2}
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            {dict.landing.heroDescription}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href={`/${lang}/login`}>
              <Button size="lg" className="text-base px-8">
                {dict.landing.startBuilding}
                <Rocket className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        <section className="pb-24 grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Sparkles className="h-6 w-6" />}
            title={dict.landing.feature1Title}
            description={dict.landing.feature1Desc}
          />
          <FeatureCard
            icon={<Code className="h-6 w-6" />}
            title={dict.landing.feature2Title}
            description={dict.landing.feature2Desc}
          />
          <FeatureCard
            icon={<Eye className="h-6 w-6" />}
            title={dict.landing.feature3Title}
            description={dict.landing.feature3Desc}
          />
        </section>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="border border-border/50 rounded-xl p-6 bg-card/50">
      <div className="mb-4 text-primary">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
