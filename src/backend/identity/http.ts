import "server-only";

export type ApiErrorCode =
  | "ORIGIN_NOT_ALLOWED"
  | "INVALID_JSON"
  | "VALIDATION_ERROR"
  | "LOCAL_AUTH_UNAVAILABLE"
  | "AUTHENTICATION_FAILED"
  | "NOT_AUTHENTICATED"
  | "NOT_AUTHORIZED"
  | "CREATE_FAILED"
  | "READ_FAILED"
  | "REVIEW_FAILED"
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

export async function readJsonBody(
  request: Request,
  maxBytes = 16_384,
): Promise<unknown | null> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) return null;

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(contentLength) || contentLength > maxBytes) return null;

  try {
    const reader = request.body?.getReader();
    if (!reader) return null;

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
