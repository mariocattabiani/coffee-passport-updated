import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/dashboard", "/onboarding", "/log", "/passport", "/shops", "/discover"];
const AUTH_PATHS = ["/login", "/signup"];

// A plain pathname.startsWith("/log") also matches "/login", since
// "/login" literally starts with the characters "/log". This checks
// for either an exact match or a proper "/basePath/..." segment
// boundary, so "/log" matches "/log" and "/log/123" but never "/login".
function matchesPath(pathname: string, basePath: string) {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: CookieOptions;
          }[]
        ) {
          // Applied as one batch, on one response, rather than the old
          // pattern of rebuilding the response object on every single
          // cookie. That mattered: Supabase's session is often more
          // than one cookie (a chunked auth token, for example), and
          // rebuilding the response mid-batch silently dropped all but
          // the last one written.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // getUser() above can itself trigger setAll (refreshing a near-expiry
  // session, for example), which lands new cookies on `response`, not
  // on whatever we return. A plain NextResponse.redirect(url) is a
  // brand-new response object with none of that, so it would silently
  // drop those cookie mutations. This copies them across every time we
  // redirect, so a redirect never loses a cookie that was just written.
  function redirectWithCookies(url: URL) {
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some((p) => matchesPath(pathname, p));
  const isAuthPage = AUTH_PATHS.some((p) => matchesPath(pathname, p));

  // Not signed in and trying to reach a protected page -> send to login.
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return redirectWithCookies(url);
  }

  // Signed in: figure out whether onboarding is done, so we can route
  // people to the right place instead of letting them see the wrong page.
  if (user && (isProtected || isAuthPage)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();

    const onboarded = profile?.onboarding_completed ?? false;

    if (
      (matchesPath(pathname, "/dashboard") ||
        matchesPath(pathname, "/log") ||
        matchesPath(pathname, "/passport") ||
        matchesPath(pathname, "/shops") ||
        matchesPath(pathname, "/discover")) &&
      !onboarded
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return redirectWithCookies(url);
    }

    if (matchesPath(pathname, "/onboarding") && onboarded) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return redirectWithCookies(url);
    }

    if (isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = onboarded ? "/dashboard" : "/onboarding";
      return redirectWithCookies(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/log/:path*",
    "/passport/:path*",
    "/shops/:path*",
    "/discover/:path*",
    "/login",
    "/signup",
  ],
};
