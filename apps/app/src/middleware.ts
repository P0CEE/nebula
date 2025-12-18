import { type NextRequest, NextResponse } from "next/server";
import { createI18nMiddleware } from "next-international/middleware";

const I18nMiddleware = createI18nMiddleware({
  locales: ["en", "fr"],
  defaultLocale: "en",
  urlMappingStrategy: "rewrite",
});

export async function middleware(request: NextRequest) {
  const response = I18nMiddleware(request);
  const pathname = request.nextUrl.pathname;

  // Check if user has access token in cookies
  const accessToken = request.cookies.get("access_token")?.value;

  // Redirect to login if not authenticated (except for login page and public routes)
  if (!accessToken && !pathname.endsWith("/login")) {
    const locale = pathname.split("/")[1] || "en";
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  // Redirect to dashboard if authenticated and trying to access login
  if (accessToken && pathname.endsWith("/login")) {
    const locale = pathname.split("/")[1] || "en";
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|logo.png).*)"],
};
