import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { safeNextPath } from "@/lib/safe-next";

/**
 * Gates every route on the signed session cookie. The JWT is verified
 * locally with the app's own secret — no network round-trip per request.
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const userId = await verifySession(token);

  const { pathname, search } = request.nextUrl;

  if (pathname === "/login") {
    if (userId) {
      return NextResponse.redirect(new URL("/", request.url), { status: 307 });
    }
    return NextResponse.next();
  }

  if (!userId) {
    const url = new URL("/login", request.url);
    const next = safeNextPath(pathname + search);
    if (next !== "/") url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 307 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
