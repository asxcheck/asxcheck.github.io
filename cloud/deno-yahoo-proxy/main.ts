// Deno Deploy Yahoo Finance CORS proxy
// - Allowed GET endpoints only:
//   - /v7/finance/quote
//   - /v8/finance/chart/:symbol
// - Adds permissive CORS headers
// - NOT an open proxy; only forwards to Yahoo Finance allow-listed paths

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  Vary: "Origin",
};

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(JSON.stringify(body), { ...init, headers });
}

function withCors(resp: Response) {
  const headers = new Headers(resp.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(resp.body, { status: resp.status, headers });
}

function html(body: string, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(body, { ...init, headers });
}

// Use Deno.serve for Deno Deploy when available; otherwise fall back to a fetch event listener.
const denoAny = (globalThis as any).Deno;
if (denoAny && typeof denoAny.serve === "function") {
  denoAny.serve((req: Request) => handleRequest(req));
} else if (typeof addEventListener === "function") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addEventListener("fetch", (event: any) => {
    event.respondWith(handleRequest(event.request));
  });
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "GET") {
    return json({ error: "Method Not Allowed" }, { status: 405 });
  }

  // Root/help page
  if (url.pathname === "/" || url.pathname === "/index.html") {
    const base = `${url.protocol}//${url.host}`;
    return html(`<!doctype html>
<meta charset="utf-8" />
<title>Yahoo Finance Proxy</title>
<body style="font-family:system-ui,Segoe UI,Arial;line-height:1.4;padding:16px">
  <h1>Yahoo Finance Proxy</h1>
  <p>Status: OK</p>
  <p>Allowed endpoints:</p>
  <ul>
    <li><code>/v7/finance/quote?symbols=BHP.AX,CSL.AX</code></li>
    <li><code>/v8/finance/chart/BHP.AX?range=1d&interval=1m</code></li>
  </ul>
  <p>Examples:</p>
  <ul>
    <li><a href="${base}/v7/finance/quote?symbols=BHP.AX,CSL.AX">${base}/v7/finance/quote?symbols=BHP.AX,CSL.AX</a></li>
    <li><a href="${base}/v8/finance/chart/BHP.AX?range=1d&interval=1m">${base}/v8/finance/chart/BHP.AX?range=1d&interval=1m</a></li>
  </ul>
  <p>CORS: <code>Access-Control-Allow-Origin: *</code></p>
  <hr />
  <small>Not an open proxy; only the above allow-listed Yahoo endpoints are forwarded.</small>
</body>`);
  }

  // Health endpoints
  if (url.pathname === "/health" || url.pathname === "/healthz" || url.pathname === "/status") {
    return json({ ok: true });
  }

  // Route allow-list
  // /v7/finance/quote?...
  if (url.pathname === "/v7/finance/quote") {
    const target = new URL("https://query1.finance.yahoo.com/v7/finance/quote");
    target.search = url.search; // forward query params
    return forward(target.href, req);
  }

  // /v8/finance/chart/:symbol
  const chartMatch = url.pathname.match(/^\/v8\/finance\/chart\/([^/]+)$/);
  if (chartMatch) {
    const symbol = chartMatch[1];
    const target = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);
    target.search = url.search;
    return forward(target.href, req);
  }

  return json({ error: "Unsupported path", path: url.pathname }, { status: 400 });
}

async function forward(target: string, req: Request): Promise<Response> {
  const upstreamHeaders: HeadersInit = {
    "accept": "application/json, text/plain, */*",
    // Provide a UA to avoid occasional 403s
    "user-agent": "asxcheck-proxy/1.0 (+https://github.com/asxcheck/asxcheck.github.io)",
  };
  try {
    const resp = await fetch(target, {
      method: "GET",
      headers: upstreamHeaders,
      // No body for GET
    });
    // Pass through as-is, but enforce CORS headers
    return withCors(resp);
  } catch (err) {
    return json({ error: "Upstream fetch failed", message: String(err) }, { status: 502 });
  }
}
