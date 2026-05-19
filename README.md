# WhatsApp Sheet Automation

Next.js app for building personalised WhatsApp campaigns from pasted Excel/Google Sheets rows.

## Why Vercel Needs `WHATSAPP_SERVICE_URL`

The Vercel app can host the UI, AI generation, Google Sheets loading, and API proxy routes.

WhatsApp Web itself cannot run directly inside Vercel serverless functions because it needs:

- a persistent Chromium browser process;
- a QR-authenticated WhatsApp session that stays alive;
- local session storage between requests.

Vercel functions stop after requests, so the WhatsApp browser session is killed. For that reason the app expects a separate always-on service.

## Deployment Setup

### 1. Deploy the Next.js app on Vercel

Use the repo root as the Vercel project.

Add these environment variables in Vercel as needed:

```bash
ANTHROPIC_API_KEY=...
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
WHATSAPP_SERVICE_URL=https://your-whatsapp-service.onrender.com
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
```

### 2. Deploy the WhatsApp service

Deploy the `whatsapp-service/` folder on a persistent Node host such as Render, Railway, Fly.io, or a VPS.

For Render, use the included `render.yaml` blueprint or create the service manually:

1. Create a new Web Service from this GitHub repo.
2. Set the root directory to `whatsapp-service`.
3. Runtime: Docker.
4. Copy the public URL and set it in Vercel:

```bash
WHATSAPP_SERVICE_URL=https://your-render-service.onrender.com
```

Check the service before connecting:

```bash
curl https://your-render-service.onrender.com/health
```

It should return JSON with `ok: true`. If `status` becomes `disconnected`, the `lastError` field explains why Chromium or WhatsApp failed.

### 3. Connect WhatsApp

Open `/connect` in the Vercel app, click connect, scan the QR code, then send campaigns.

### 4. Connect LinkedIn

Create a LinkedIn developer app and enable **Sign In with LinkedIn using OpenID Connect**.

Add this redirect URL in the LinkedIn app:

```bash
https://your-vercel-domain.vercel.app/api/linkedin/callback
```

Then open `/linkedin` in the app and click **Connect LinkedIn**.

## Local Development

Run the Next app:

```bash
npm install
npm run dev
```

Run the WhatsApp service in another terminal:

```bash
cd whatsapp-service
npm install
npm start
```

Then set this in `.env.local`:

```bash
WHATSAPP_SERVICE_URL=http://localhost:4000
```
