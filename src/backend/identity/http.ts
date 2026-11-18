import "server-only";

export type ApiErrorCode =
  | "ORIGIN_NOT_ALLOWED"
  | "INVALID_JSON"
  | "VALIDATION_ERROR"
  | "LOCAL_AUTH_UNAVAILABLE"
  | "AUTHENTICATION_FAILED"
  | "NOT_AUTHENTICATED"
  | "NOT_AUTHORIZED"
  | "UPDATE_FAILED"
  | "NOT_FOUND";

export function jsonSuccess<T>(data: T, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

export function jsonError(
  status: number,
  code: ApiErrorCode,
  message: string,
  fields?: Record<string, string>,
): Response {
  return Response.json(
    { error: { code, message, ...(fields ? { fields } : {}) } },
    {
      status,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    },
  );
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

export function hasAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const requestUrl = new URL(request.url);
    const host = request.headers.get("host");
    if (!host) return false;
    const hostUrl = new URL(`${requestUrl.protocol}//${host}`);
    const originUrl = new URL(origin);
    return (
      originUrl.origin === hostUrl.origin &&
      isLoopbackHost(hostUrl.hostname) &&
      isLoopbackHost(originUrl.hostname)
    );
  } catch {
    return false;
  }
}

export async function readJsonBody(request: Request): Promise<unknown | null> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) return null;

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_384) return null;

  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > 16_384) return null;
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
