"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Dictionary } from "../dictionaries";

export default function LoginClient({
  lang,
  dict,
}: {
  lang: string;
  dict: Dictionary;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        router.push(`/${lang}/dashboard`);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        router.push(`/${lang}/dashboard`);
      }
    }
    setLoading(false);
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="w-full max-w-sm mx-auto p-6">
        <div className="text-center mb-8">
          <Link
            href={`/${lang}`}
            className="inline-flex items-center gap-2 mb-4"
          >
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">{dict.common.brand}</span>
          </Link>
          <h1 className="text-2xl font-semibold">
            {isSignUp ? dict.login.createAccount : dict.login.welcomeBack}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSignUp ? dict.login.signUpDesc : dict.login.signInDesc}
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <Input
            type="email"
            placeholder={dict.login.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder={dict.login.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? dict.common.loading
              : isSignUp
                ? dict.common.signUp
                : dict.common.signIn}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {isSignUp ? dict.login.alreadyHaveAccount : dict.login.noAccount}{" "}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary hover:underline"
          >
            {isSignUp ? dict.common.signIn : dict.common.signUp}
          </button>
        </p>
      </div>
    </div>
  );
}
