const { CF_ACCOUNT_ID, CF_KV_NAMESPACE_ID, CF_API_TOKEN } = process.env

if (!CF_ACCOUNT_ID || !CF_KV_NAMESPACE_ID || !CF_API_TOKEN) {
  console.error("Missing required env vars: CF_ACCOUNT_ID, CF_KV_NAMESPACE_ID, CF_API_TOKEN")
  process.exit(1)
}

const BASE = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NAMESPACE_ID}`
const HEADERS = { Authorization: `Bearer ${CF_API_TOKEN}` }

interface KVKey {
  name: string
  expiration?: number
}

interface CFResponse<T> {
  success: boolean
  result: T
  errors: { code: number; message: string }[]
}

async function listKeys(): Promise<KVKey[]> {
  const res = await fetch(`${BASE}/keys?limit=1000`, { headers: HEADERS })
  const body = (await res.json()) as CFResponse<KVKey[]>

  if (!res.ok || !body.success) {
    const errs = body.errors.map(e => `[${e.code}] ${e.message}`).join(", ")
    throw new Error(`Failed to list keys (HTTP ${res.status}): ${errs}`)
  }

  return body.result
}

async function deleteKey(name: string): Promise<void> {
  const res = await fetch(`${BASE}/values/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: HEADERS,
  })
  const body = (await res.json()) as CFResponse<unknown>

  if (!res.ok || !body.success) {
    const errs = body.errors.map(e => `[${e.code}] ${e.message}`).join(", ")
    throw new Error(`HTTP ${res.status}: ${errs}`)
  }
}

async function main() {
  const keys = await listKeys()
  const nowSecs = Math.floor(Date.now() / 1000)
  const expired = keys.filter(k => k.expiration !== undefined && k.expiration < nowSecs)

  if (expired.length === 0) {
    console.log("No expired keys to delete.")
    return
  }

  let deleted = 0
  let failed = 0

  for (const key of expired) {
    try {
      await deleteKey(key.name)
      console.log(`Deleted: ${key.name}`)
      deleted++
    } catch (err) {
      console.error(`Failed to delete: ${key.name} — ${err instanceof Error ? err.message : err}`)
      failed++
    }
  }

  console.log(`Deleted ${deleted} expired key(s). Failed: ${failed}.`)
  if (failed > 0) process.exit(1)
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
