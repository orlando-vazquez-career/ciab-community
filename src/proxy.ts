import type { NextRequest } from "next/server";
import { updateSupabaseSession } from "@/backend/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/api/identity/:path*",
    "/api/membership/:path*",
    "/miembro/:path*",
    "/admin/:path*",
    "/auth/callback",
  ],
};
