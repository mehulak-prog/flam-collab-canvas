# Flam Collab Canvas

A real-time collaborative drawing canvas — multiple users can draw together on the same board with live cursors, presence, and image uploads.

## Stack

- **Frontend**: Next.js (App Router, TypeScript), [tldraw](https://tldraw.dev) for the canvas
- **Auth**: Clerk
- **Database**: PostgreSQL (Neon) via Prisma
- **Real-time sync**: Yjs + Hocuspocus WebSocket server
- **Image processing**: Python (FastAPI + Pillow), Cloudflare R2 for storage

## Project structure

```
web/                    Next.js app (frontend + API routes)
services/ws-server/     Real-time sync server (Yjs/Hocuspocus)
services/image-service/ Python image processing service (FastAPI)
```

## Features

- Google/email auth via Clerk, with users auto-synced to Postgres via webhook
- Create and join rooms
- Real-time collaborative drawing (tldraw + Yjs)
- Live cursor presence for all users in a room
- Image upload directly onto the canvas (routed through the image processing service, stored on Cloudflare R2)
- Auto-saved snapshots — canvas state persists across sessions
- Collapsible style/color palette

## Local development setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- A Neon (Postgres) account
- A Clerk account
- A Cloudflare R2 (or S3-compatible) bucket
- A tldraw license key for production deployment (see [tldraw license](#tldraw-license) below) — not required for local dev

### 1. Web app
```bash
cd web
npm install
# Create .env and .env.local with the variables below
npx prisma migrate dev
npm run dev
```

### 2. WebSocket sync server
```bash
cd services/ws-server
npm install
npm run dev
```

### 3. Image processing service
```bash
cd services/image-service
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\Activate.ps1 on Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Environment variables

See `.env.example` at the repo root for the full list. Required across services:

```
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
NEXT_PUBLIC_WS_URL=
IMAGE_SERVICE_URL=
R2_BUCKET=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_URL=
NEXT_PUBLIC_TLDRAW_LICENSE_KEY=
```

## tldraw license

The tldraw SDK requires a valid license key when running in production (HTTPS on a real, non-localhost domain). Without one, the canvas renders fine locally but goes blank in production after a few seconds.

- Not needed for local dev — tldraw treats `localhost` as a dev environment automatically.
- For production (e.g. the Vercel deployment), request a free key:
  - [Trial license](https://tldraw.dev/pricing) — issued instantly by email, good for getting unblocked quickly.
  - [Hobby license](https://tldraw.dev/get-a-license/hobby) — free for student/personal/non-commercial projects like this one, manually reviewed.
- Set the key as `NEXT_PUBLIC_TLDRAW_LICENSE_KEY` in `.env.local` and in Vercel's project environment variables, and pass it to the `<Tldraw licenseKey={...} />` component in `room-canvas.tsx`.

## Deployment

- `web` → Vercel
- `services/ws-server` → Railway/Render
- `services/image-service` → Railway/Render