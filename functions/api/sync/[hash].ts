interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
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
  "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

const MAX_BYTES = 2_000_000

// While at least one device is linked, refresh the TTL to ~1 year on every
// operation so a synced code effectively never expires. Once the last device
// unlinks, switch to a 7-day TTL so the cleanup script will reap it.
const ACTIVE_TTL_SECONDS = 365 * 24 * 60 * 60
const INACTIVE_TTL_SECONDS = 7 * 24 * 60 * 60
const MAX_DEVICES = 50

interface Envelope {
  payload: unknown
  devices: string[]
}

function isDeviceId(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(v)
}

function parseEnvelope(raw: string | null): Envelope | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== "object") return null
  const obj = parsed as Record<string, unknown>
  if (Array.isArray(obj.devices) && "payload" in obj) {
    const devices = obj.devices.filter(isDeviceId)
    return { payload: obj.payload, devices }
  }
  // Legacy format: the raw value was the SyncPayload itself. Treat it as
  // having no known devices so the first caller registering will become the
  // sole linked device.
  return { payload: parsed, devices: [] }
}

async function writeEnvelope(
  kv: KVNamespace,
  hash: string,
  envelope: Envelope,
): Promise<void> {
  const ttl = envelope.devices.length > 0 ? ACTIVE_TTL_SECONDS : INACTIVE_TTL_SECONDS
  await kv.put(hash, JSON.stringify(envelope), { expirationTtl: ttl })
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...CORS,
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    },
  })
}

function getDeviceId(request: Request): string | null {
  const url = new URL(request.url)
  const raw = url.searchParams.get("device")
  return isDeviceId(raw) ? raw : null
}

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

  const kv = env.PLAYERDLE_SYNC_KV
  const deviceId = getDeviceId(request)

  if (request.method === "GET") {
    if (!deviceId) {
      return new Response("Missing device id", { status: 400, headers: CORS })
    }
    const envelope = parseEnvelope(await kv.get(hash))
    if (!envelope) {
      return new Response("Not found", { status: 404, headers: CORS })
    }
    if (!envelope.devices.includes(deviceId)) {
      if (envelope.devices.length >= MAX_DEVICES) {
        return new Response("Too many devices linked", { status: 409, headers: CORS })
      }
      envelope.devices.push(deviceId)
    }
    await writeEnvelope(kv, hash, envelope)
    return jsonResponse({
      payload: envelope.payload,
      devices: envelope.devices.length,
    })
  }

  if (request.method === "PUT") {
    if (!deviceId) {
      return new Response("Missing device id", { status: 400, headers: CORS })
    }
    const body = await request.text()
    if (new TextEncoder().encode(body).byteLength > MAX_BYTES) {
      return new Response("Payload too large", { status: 413, headers: CORS })
    }
    let payload: unknown
    try {
      payload = JSON.parse(body)
    } catch {
      return new Response("Invalid JSON", { status: 400, headers: CORS })
    }
    const existing = parseEnvelope(await kv.get(hash))
    const devices = existing?.devices ?? []
    if (!devices.includes(deviceId)) {
      if (devices.length >= MAX_DEVICES) {
        return new Response("Too many devices linked", { status: 409, headers: CORS })
      }
      devices.push(deviceId)
    }
    const envelope: Envelope = { payload, devices }
    await writeEnvelope(kv, hash, envelope)
    return jsonResponse({ devices: devices.length })
  }

  if (request.method === "DELETE") {
    if (!deviceId) {
      return new Response("Missing device id", { status: 400, headers: CORS })
    }
    const envelope = parseEnvelope(await kv.get(hash))
    if (!envelope) {
      return jsonResponse({ devices: 0 })
    }
    envelope.devices = envelope.devices.filter(id => id !== deviceId)
    await writeEnvelope(kv, hash, envelope)
    return jsonResponse({ devices: envelope.devices.length })
  }

  return new Response("Method not allowed", { status: 405, headers: CORS })
}
