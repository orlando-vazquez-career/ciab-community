import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/backend/supabase/server";
import { getLocalSupabaseConfiguration } from "@/backend/supabase/config";

function accessPage(request: NextRequest, state: string) {
  const destination = new URL("/acceso", request.url);
  destination.searchParams.set("estado", state);
  return NextResponse.redirect(destination);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const configuration = getLocalSupabaseConfiguration();
  if (!configuration.available || request.nextUrl.origin !== configuration.config.siteUrl) {
    return accessPage(request, "confirmacion-fallida");
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) return accessPage(request, "confirmacion-fallida");

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return accessPage(request, "confirmacion-fallida");
    return NextResponse.redirect(new URL("/miembro", request.url));
  } catch {
    return accessPage(request, "confirmacion-fallida");
  }
}
