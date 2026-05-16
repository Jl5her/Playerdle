interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
}

interface Env {
  PLAYERDLE_SYNC_KV?: KVNamespace
}

interface PagesContext {
  request: Request
  params: Record<string, string>
  env: Env
  next(): Promise<Response>
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

const MAX_BYTES = 2_000_000
const TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days; reset on every read or write

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, params, env } = context
  const hash = params["hash"] ?? ""

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS })
  }

  if (!/^[0-9a-f]{64}$/.test(hash)) {
    return new Response("Invalid hash", { status: 400, headers: CORS })
  }

  if (!env.PLAYERDLE_SYNC_KV) {
    return new Response("Sync storage not configured", { status: 503, headers: CORS })
  }

  if (request.method === "GET") {
    const value = await env.PLAYERDLE_SYNC_KV.get(hash)
    if (!value) {
      return new Response("Not found", { status: 404, headers: CORS })
    }
    // Bump TTL so the 7-day window resets on every import
    await env.PLAYERDLE_SYNC_KV.put(hash, value, { expirationTtl: TTL_SECONDS })
    return new Response(value, {
      headers: { ...CORS, "Content-Type": "application/json" },
    })
  }

  if (request.method === "PUT") {
    const body = await request.text()
    if (body.length > MAX_BYTES) {
      return new Response("Payload too large", { status: 413, headers: CORS })
    }
    try {
      JSON.parse(body)
    } catch {
      return new Response("Invalid JSON", { status: 400, headers: CORS })
    }
    await env.PLAYERDLE_SYNC_KV.put(hash, body, { expirationTtl: TTL_SECONDS })
    return new Response("OK", { status: 200, headers: CORS })
  }

  return new Response("Method not allowed", { status: 405, headers: CORS })
}
