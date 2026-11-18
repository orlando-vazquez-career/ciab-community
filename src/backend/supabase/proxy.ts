import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getLocalSupabaseConfiguration } from "./config";

export async function updateSupabaseSession(request: NextRequest): Promise<NextResponse> {
  const result = getLocalSupabaseConfiguration();
  if (!result.available) return NextResponse.next({ request });

  const response = NextResponse.next({ request });
  const secure = request.nextUrl.protocol === "https:";
  const supabase = createServerClient(result.config.url, result.config.anonKey, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
        for (const [name, value] of Object.entries(headers)) {
          response.headers.set(name, value);
        }
      },
    },
  });

  await supabase.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
