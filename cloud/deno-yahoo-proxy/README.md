# Deno Deploy: Yahoo Finance Proxy (Free)

This is a tiny CORS proxy you can deploy to Deno Deploy for free. It forwards only safe Yahoo Finance endpoints and adds permissive CORS so your GitHub Pages app can fetch data.

What it forwards (GET only):
- /v7/finance/quote
- /v8/finance/chart/:symbol

Security: The proxy is allow-listed and does not accept arbitrary targets. Do not remove the allow-list.

---

## 1) Create a new GitHub repo for the proxy

Option A: New, dedicated repo (recommended)
1. Create a new public repo on GitHub, e.g. `yahoo-proxy-deno`.
2. Copy `cloud/deno-yahoo-proxy/main.ts` from this project into the new repo at the repository root (file path: `main.ts`).
3. Commit and push.

Option B: Use this repo (not recommended for Deno Deploy)
- Deno Deploy expects the entrypoint at the repository root (like `main.ts`). If you use this repo, you can still deploy by configuring the subdir during Deno Deploy setup, but a dedicated repo is simpler.

## 2) Deploy on Deno Deploy

1. Visit https://dash.deno.com/new
2. Under "Choose a GitHub repository", select the repo that contains `main.ts`.
3. When asked for settings:
   - Entrypoint file: `main.ts`
   - Leave build step empty (not required).
4. Click Deploy.
5. After it builds, you’ll get a URL like `https://your-proxy.deno.dev`.

## 3) Test your proxy

Use your new URL plus the Yahoo path:
- Quotes:
  - `https://your-proxy.deno.dev/v7/finance/quote?symbols=BHP.AX,CSL.AX`
- Chart:
  - `https://your-proxy.deno.dev/v8/finance/chart/BHP.AX?range=1d&interval=1m`

You should get JSON with CORS headers (`Access-Control-Allow-Origin: *`).

## 4) Point the web app at your proxy

In your project (`index.html`):
- Set `CONFIG.YAHOO_PROXY = 'https://your-proxy.deno.dev'`.
- Or use the in-app "Data source settings" modal and paste the URL; it stores to `localStorage`.

The app will call:
- `${YAHOO_PROXY}/v7/finance/quote?...`
- `${YAHOO_PROXY}/v8/finance/chart/SYMBOL?...`

## 5) Limits and tips

- Deno Deploy free tier is suitable for hobby use; watch usage in the Deno dashboard.
- Respect Yahoo’s ToS and rate limits. This app can poll every 1s; consider backing off if you hit limits.
- Keep the allow-list in `main.ts` so it’s not an open proxy.

## Optional: Custom domain

- In Deno Deploy project settings, add a custom domain and point DNS (CNAME) to the Deno provided host. Then update `CONFIG.YAHOO_PROXY` to use your domain.

## Troubleshooting

- 405 Method Not Allowed: Only GET/OPTIONS are supported.
- 400 Unsupported path: Make sure you’re using `/v7/finance/quote` or `/v8/finance/chart/:symbol`.
- JSON parse errors: The proxy forces JSON content-type; if upstream returns non-JSON, the body is still forwarded as text.

---

License: MIT
