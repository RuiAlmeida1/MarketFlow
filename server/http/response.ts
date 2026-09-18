const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' } as const

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  })
}

export function emptyResponse(status = 204): Response {
  return new Response(null, { status })
}
