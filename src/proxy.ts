import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const locales = ["zh", "en"];
const defaultLocale = "zh";

function getLocale(request: NextRequest): string {
  const acceptLang = request.headers.get("accept-language") || "";
  if (acceptLang.startsWith("zh")) return "zh";
  if (acceptLang.startsWith("en")) return "en";
  return defaultLocale;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, static files, _next
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return;
  }

  // Check if pathname already has a locale prefix
  const pathnameHasLocale = locales.some(
    (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`,
  );

  if (!pathnameHasLocale) {
    const locale = getLocale(request);
    request.nextUrl.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(request.nextUrl);
  }

  // Extract locale from path for auth redirect
  const locale = pathname.split("/")[1];

  // Protect dashboard and project routes
  const pathWithoutLocale = pathname.replace(`/${locale}`, "");
  if (
    pathWithoutLocale.startsWith("/dashboard") ||
    pathWithoutLocale.startsWith("/project")
  ) {
    return await updateSession(request, locale);
  }
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)", "/"],
};
