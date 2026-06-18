import { NextRequest, NextResponse } from "next/server";

const SENSITIVE_QUERY_KEYS = ["email", "password", "senha", "access_token", "refresh_token"];

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  let changed = false;

  SENSITIVE_QUERY_KEYS.forEach((key) => {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  });

  if (changed) return NextResponse.redirect(url);

  const response = NextResponse.next();
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/).*)"],
};
