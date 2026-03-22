# 365softlabs-demo

Next.js demo dashboard for `demo.365softlabs.com`.

Project root:

`C:\code\365softlabs-demo`

## What this app does

- Provides a web UI for the local MVP API in `365softlabs-cli`
- Proxies API requests through `/api/mvp/*`
- Shows run timeline, artifacts, approvals
- Includes capability preflight UI
- Includes offline reference command generation and copy button

## Requirements

- Node.js 18+

## Local development

Install dependencies:

```powershell
npm install
```

Start local MVP API first (in separate terminal):

```powershell
cd C:\code\365softlabs-cli
npm run demo:api
```

Then start demo UI:

```powershell
cd C:\code\365softlabs-demo
npm run dev
```

Open:

- `http://localhost:3000`

## API proxy behavior

Proxy route:

- `/api/mvp/*`

Default upstream target:

- `http://localhost:8787/api`

To change target:

```powershell
$env:MVP_API_BASE_URL="https://api.365softlabs.com/api"
npm run dev
```

## Health checks

- `/api/health` (demo app health)
- `/api/mvp/health` (proxied MVP API health)

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run preview`

## Deploy (Cloudflare + OpenNext)

```powershell
npm install
npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy
```

If you need fresh baseline wiring:

```powershell
npm create cloudflare@latest -- 365softlabs-demo --framework=next --experimental
```

## Security & Secrets

This repository is public. Keep credentials and private infrastructure values out of source control.

Never commit:

- API tokens, Cloudflare credentials, or secret environment values
- `.env*` files with real values
- internal-only service URLs if they are not intended for public disclosure

Use placeholders in shared docs/examples:

- `<MVP_API_BASE_URL>`
- `<CLOUDFLARE_ACCOUNT_ID>`
- `<PAGES_PROJECT_NAME>`

Recommended before push:

- Run secret scanning (for example GitHub secret scanning or gitleaks)
- Validate config files do not include real secrets
