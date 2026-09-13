# Parallel Development Master Guide — Real-Time Collaborative Drawing Canvas

> **Purpose:** This is the central coordination document for developing the project in parallel across multiple chats/workstreams.
>
> **Source plan:** Modular architecture for a real-time collaborative drawing canvas using Next.js, tldraw, Yjs/WebSockets, Clerk, Postgres, FastAPI, and free-tier infrastructure.
>
> **Important rule:** Every workstream must follow the shared conventions and interface contracts in this document. Do not independently change shared APIs, database contracts, environment variable names, or folder structure without recording the change here.

---

## 1. Project Goal

Build a **real-time collaborative drawing canvas** where authenticated users can:

- Create and access drawing rooms.
- Share rooms with other users.
- Draw collaboratively in real time.
- See live presence/cursors.
- Upload and process images.
- Recover room state through snapshots.
- Deploy the complete system using free tiers.

### Target Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js + TypeScript + tldraw |
| Real-time sync | Yjs + WebSocket server / Hocuspocus |
| Authentication | Clerk |
| Database | Neon or Supabase Postgres |
| Database access | Prisma or Drizzle |
| Image processing | Python + FastAPI + Pillow |
| Storage | Cloudflare R2 or Supabase Storage |
| Optional rate limiting | Upstash Redis |
| Web deployment | Vercel |
| Service deployment | Railway / Render or equivalent free tier |

---

## 2. Parallel Development Rules

### 2.1 Shared ownership

This project is divided into modules. Each module can be developed independently **only when its interface contract is preserved**.

### 2.2 Do not break these shared contracts

All workstreams must preserve:

- Environment variable names.
- Room ID format.
- Authentication assumptions.
- API response formats.
- Error format.
- Database helper function names.
- Shared folder structure.
- Module input/output contracts.

### 2.3 Standard error format

```json
{
  "error": "code",
  "message": "Human-readable explanation"
}
```

### 2.4 Authentication rule

- Room-related APIs assume Clerk authentication.
- The authenticated user is represented by `userId`.
- Unauthenticated requests return `401`.
- Do not create a second authentication system.

### 2.5 Room ID rule

Use a UUID or nanoid-style string.

Room URLs follow:

```text
/room/<roomId>
```

### 2.6 Free-tier rule

Do not introduce paid-only infrastructure.

Allowed categories include:

- Vercel
- Clerk free tier
- Neon/Supabase free tier
- Railway/Render free options where available
- Cloudflare services
- Upstash free tier

---

## 3. Recommended Repository Structure

```text
flam-collab-canvas/
│
├── apps/
│   └── web/                    # Next.js application
│
├── services/
│   ├── ws-server/              # Yjs/Hocuspocus WebSocket server
│   └── image-service/          # Python FastAPI service
│
├── packages/                   # Optional future shared packages
│
├── README.md
├── .env.example
└── .gitignore
```

A simplified structure with the Next.js application at the repository root is also acceptable, but **choose one structure and keep it consistent**.

---

## 4. Shared Environment Contract

```env
# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Database
DATABASE_URL=

# WebSocket
NEXT_PUBLIC_WS_URL=

# Image service
IMAGE_SERVICE_URL=

# Storage
R2_BUCKET=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_URL=
```

Individual services may require additional variables, but existing shared names should not be renamed.

---

## 5. Module Dependency Map

```text
M0 Project Scaffold
│
├── M1 Authentication
│   ├── M3 Rooms API
│   │   └── M5 Canvas UI
│   └── M8 Assets API
│
├── M2 Database
│   ├── M3 Rooms API
│   ├── M8 Assets API
│   └── M9 Snapshots
│
├── M4 Real-Time Sync
│   ├── M5 Canvas UI
│   ├── M6 Presence
│   └── M9 Snapshots
│
├── M7 Image Processing
│   └── M8 Assets API
│
└── M10 Polish
    └── M11 Deployment & Integration
```

### Parallelization summary

After **M0**, the following work can begin largely independently:

- M1 — Authentication
- M2 — Database
- M4 — Real-time sync prototype
- M7 — Image processing service

After their dependencies are ready:

- M3 — Rooms API
- M5 — Canvas
- M6 — Presence
- M8 — Assets
- M9 — Snapshots

Finally:

- M10 — Polish
- M11 — Deployment and integration

---

# 6. Master Module Registry

| Module | Name | Depends On | Main Deliverable | Status |
|---|---|---|---|---|
| M0 | Project Scaffold | None | Repository + shared config | ⬜ |
| M1 | Auth & User Context | M0 | Clerk authentication | ⬜ |
| M2 | Database & Access Layer | M0 | Schema + DB helpers | ⬜ |
| M3 | Rooms API | M1, M2 | Room endpoints | ⬜ |
| M4 | Real-Time Sync | M0, room contract | Yjs + WS server | ⬜ |
| M5 | Canvas UI | M1, M3, M4 | Collaborative canvas | ⬜ |
| M6 | Presence | M4, M5 | Cursors + participants | ⬜ |
| M7 | Image Processing | M0 | FastAPI image service | ⬜ |
| M8 | Assets API | M1, M2, M3, M7 | Upload pipeline | ⬜ |
| M9 | Snapshots | M2, M4 | Persistence + recovery | ⬜ |
| M10 | Polish/Export/Metrics | Core modules | Optional features | ⬜ |
| M11 | Deployment | M0–M10 | Production integration | ⬜ |

Use these statuses:

- ⬜ Not started
- 🟡 In progress
- 🟢 Complete
- 🔴 Blocked

---

# 7. Workstream Handoff Protocol

Every parallel chat must return the following before its work is considered complete:

## A. Files created/changed

```text
- path/to/file
- path/to/file
```

## B. Dependencies installed

```bash
npm install ...
```

or

```bash
pip install ...
```

## C. Environment variables required

List exact variable names.

## D. Public interface

Document:

- Exported functions.
- API endpoints.
- Request body.
- Response body.
- Error cases.

## E. Local test steps

Provide exact commands.

## F. Integration notes

Explain:

- Which modules can consume this work.
- What assumptions were made.
- Anything another workstream must not change.

---

# 8. Parallel Chat Prompt Template

Copy this into a new chat when working on a module:

```text
We are building a Real-Time Collaborative Drawing Canvas.

You are responsible ONLY for: [MODULE NAME].

Follow these project-wide rules:

1. Use TypeScript for Next.js/Node and Python for the image service.
2. Do not change shared API contracts without explicitly reporting it.
3. Use the standard error shape:
   { "error": "code", "message": "..." }
4. Room IDs are UUID/nanoid strings used as /room/<roomId>.
5. Room-related APIs use Clerk authentication and userId.
6. Use only free-tier compatible infrastructure.
7. Keep the implementation modular and integration-friendly.
8. At the end provide:
   - files created/changed
   - dependencies installed
   - environment variables
   - public interfaces
   - commands to run
   - test procedure
   - integration notes

MODULE SPECIFICATION:

[PASTE THE MODULE SECTION HERE]

Do not implement unrelated modules.
```

---


# 9. Original Detailed Module Specifications

# Build Plan: Real-Time Collaborative Drawing Canvas (1 Day, Free-Tier Only)

This document defines a **modular architecture** so you can develop parts in parallel (e.g., in different chats) and integrate at the end.

## Target System (Reminder)

- **Frontend**: Next.js + tldraw canvas
- **Real-time sync**: Yjs + WebSocket server (Hocuspocus or tldraw multiplayer)
- **Auth**: Clerk (free tier)
- **DB**: Neon/Supabase Postgres (free tier)
- **Redis**: Upstash (free tier) – optional but nice
- **Image processing**: Python FastAPI service (Railway/Render free tier)
- **Storage**: Cloudflare R2 or Supabase Storage (free tier)

Everything must be deployable on **free tiers**.

---

## High-Level Module Map

1. **M0 – Project Scaffold & Env Setup**
2. **M1 – Auth & User Context (Clerk)**
3. **M2 – Database Schema & Access Layer**
4. **M3 – Rooms API (Create/Get/Permissions)**
5. **M4 – Real-Time Sync Engine (Yjs + WS)**
6. **M5 – Canvas UI (tldraw + Tools)**
7. **M6 – Presence & Live Cursors**
8. **M7 – Python Image Processing Service**
9. **M8 – Assets API (Upload → Python → Storage)**
10. **M9 – Snapshots & Recovery**
11. **M10 – Polish, Export, Metrics (Nice-to-Have)**
12. **M11 – Deployment & Final Integration**

You can develop M1–M10 largely in parallel once M0 is done, as long as you stick to the defined interfaces.

---

## Common Conventions (All Modules)

- **Language**: TypeScript for Node/Next, Python for image service.
- **Env vars**: Use `.env.local` (Next) and `.env` (services). Document in each module.
- **API style**:
  - JSON over HTTP.
  - Errors: `{ "error": "code", "message": "..." }`.
- **Auth**:
  - All room-related APIs assume an authenticated user (Clerk).
  - User ID available as `userId` from Clerk session.
- **Room ID**:
  - UUID or nanoid string, used in URLs: `/room/<roomId>`.
- **Free-tier constraint**:
  - No paid services. Use only free tiers of Vercel, Railway/Render, Neon/Supabase, Upstash, Clerk, R2.

Keep these consistent so modules can be integrated without friction.

---

## M0 – Project Scaffold & Env Setup

**Goal**: Create the repo, base Next.js app, and shared config so other modules can plug in.

### Inputs
- None (starting point).

### Outputs
- GitHub repo with:
  - Next.js app (`/` root).
  - Folders for future modules:
    - `/apps/web` (Next.js) – or just root if you keep it simple.
    - `/services/ws-server` (optional, if using Hocuspocus).
    - `/services/image-service` (Python FastAPI).
  - Root `README.md` (you can paste the earlier README here).
  - Root `.env.example`.

### Steps

1. Create repo: `flam-collab-canvas`.
2. Initialize Next.js:
   ```bash
   npx create-next-app@latest web --typescript --tailwind --app --eslint
   ```
   - Choose App Router.
   - Place it at root or under `/apps/web` (your choice, but be consistent).
3. Install base deps:
   ```bash
   cd web
   npm i tldraw yjs y-websocket
   npm i @clerk/nextjs
   ```
4. Create `.env.example` at repo root:
   ```env
   # Next.js
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
   CLERK_SECRET_KEY=
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

   # DB
   DATABASE_URL=

   # WebSocket
   NEXT_PUBLIC_WS_URL=

   # Image service
   IMAGE_SERVICE_URL=

   # Storage (R2 or Supabase)
   R2_BUCKET=
   R2_ACCOUNT_ID=
   R2_ACCESS_KEY_ID=
   R2_SECRET_ACCESS_KEY=
   R2_PUBLIC_URL=
   ```
5. Commit initial scaffold.

### Test in Isolation

- Run `npm run dev` in `web`.
- See default Next.js page.

### Integration Notes

- All later modules assume this structure and env pattern.
- Share this folder structure with other chats so they align.

---

## M1 – Auth & User Context (Clerk)

**Goal**: Add authentication and make `userId` available to all APIs and components.

### Inputs
- M0 scaffold.

### Outputs
- Working Clerk auth:
  - Sign in / sign up pages.
  - Protected routes.
  - `userId` accessible in API routes and server components.

### Interface Contract

- Authenticated user:
  - Available via Clerk hooks/components in frontend.
  - Available in API routes via `auth()` helper.
- All room APIs will assume:
  - `userId` is known.
  - Unauthenticated requests → 401.

### Steps

1. Create Clerk app (free tier), get keys.
2. Install & configure `@clerk/nextjs` in `web`:
   - Wrap app with `ClerkProvider`.
   - Add `middleware.ts` to protect `/room/*`.
3. Create basic:
   - `/sign-in` and `/sign-up` pages (use Clerk components).
   - A simple “profile” dropdown showing user name/email.
4. In API routes, use Clerk’s `auth()` to get `userId`.

### Test in Isolation

- Run app, sign up, sign in.
- Access `/room/test` → should redirect to sign-in if not logged in.

### Integration Notes

- All future API modules will assume Clerk is present and `userId` is available.
- No other module should implement its own auth.

---

## M2 – Database Schema & Access Layer

**Goal**: Define Postgres schema and a simple data access layer for rooms, users, snapshots, assets.

### Inputs
- M0 (project structure).
- M1 (auth, `userId` concept).

### Outputs
- SQL schema (or Prisma/Drizzle schema).
- DB client module:
  - Functions like `createRoom`, `getRoom`, `saveSnapshot`, `saveAsset`, etc.
- Migrations set up.

### Interface Contract

Other modules will call:

```ts
createRoom({ ownerId, name, isPublic })
getRoom(roomId)
getRoomMember(roomId, userId)
saveSnapshot({ roomId, version, data })
getLatestSnapshot(roomId)
saveAsset({ id, roomId, originalUrl, thumbUrl, width, height, sizeBytes })
```

No module should run raw SQL directly; they should use these helpers.

### Steps

1. Choose Neon or Supabase, create DB, get `DATABASE_URL`.
2. Define schema (as in previous README):
   - `users`, `rooms`, `room_members`, `snapshots`, `assets`.
3. Choose an ORM:
   - **Prisma** or **Drizzle** (both free, easy).
4. Implement:
   - Schema file.
   - Migration.
   - DB client with the functions above.
5. Add env var `DATABASE_URL` to `.env.local`.

### Test in Isolation

- Write a small script `scripts/seed.ts`:
  - Create a test user (mock or real via Clerk ID).
  - Create a test room.
  - Log the result.
- Run it; verify rows in DB.

### Integration Notes

- M3 (Rooms API), M8 (Assets API), M9 (Snapshots) will depend on this.
- Keep function names stable; if you change them, update all callers.

---

## M3 – Rooms API (Create/Get/Permissions)

**Goal**: HTTP API for creating/fetching rooms and managing permissions.

### Inputs
- M1 (auth, `userId`).
- M2 (DB access layer).

### Outputs
- API routes:
  - `POST /api/rooms`
  - `GET /api/rooms/:id`
  - `PATCH /api/rooms/:id/permissions`
- Consistent JSON responses and error shapes.

### Interface Contract

Frontend and other services will call:

- `POST /api/rooms` with `{ name }` → `{ id, name, ownerId, isPublic }`
- `GET /api/rooms/:id` → room + `myRole`
- `PATCH /api/rooms/:id/permissions` with `{ isPublic }` (owner only)

Errors:
- 401 if unauthenticated.
- 403 if not authorized (e.g., non-owner changing permissions).
- 404 if room not found.

### Steps

1. Implement `POST /api/rooms`:
   - Check auth → get `userId`.
   - Call `createRoom({ ownerId: userId, name, isPublic: true })`.
   - Insert `room_members` row with role `owner`.
   - Return room object.
2. Implement `GET /api/rooms/:id`:
   - Check auth.
   - Fetch room + membership row for `userId`.
   - Compute `myRole` (`owner` | `editor` | `viewer` | `null`).
   - Return room + `myRole`.
3. Implement `PATCH /api/rooms/:id/permissions`:
   - Check auth & role (only `owner`).
   - Update `isPublic`.
   - Return updated room.

### Test in Isolation

- Use `curl` or Postman:
  - Create room.
  - Fetch room.
  - Update permissions.
- Verify DB rows.

### Integration Notes

- Frontend (M5) will call these to create/join rooms.
- M4 (sync engine) will assume room exists before connecting.

---

## M4 – Real-Time Sync Engine (Yjs + WS)

**Goal**: WebSocket server that syncs a Yjs document per room between clients.

### Inputs
- M0 (project structure).
- M3 (rooms exist; you can assume valid `roomId`).

### Outputs
- Running WS server (Hocuspocus or tldraw multiplayer).
- Client-side Yjs provider configured to connect to it.

### Interface Contract

- WS URL: `NEXT_PUBLIC_WS_URL` (e.g., `wss://your-ws-server.railway.app`).
- Clients connect with a `roomName` (use `room-<roomId>`).
- Server maintains one Yjs doc per room and broadcasts updates.

No HTTP logic here; just sync.

### Steps (Hocuspocus path)

1. Create `services/ws-server`:
   ```bash
   mkdir -p services/ws-server
   cd services/ws-server
   npm init -y
   npm i @hocuspocus/server yjs
   ```
2. Implement `index.ts`:
   - Create Hocuspocus server.
   - On `onConnect`, create/load a Yjs doc keyed by `context.roomName`.
   - Optionally persist snapshots via HTTP call to M9 endpoint.
3. Deploy to Railway/Render (free tier).
4. In `web`:
   - Use `Y.WebSocketProvider` with `NEXT_PUBLIC_WS_URL` and `roomName = room-${roomId}`.
   - Bind tldraw’s store to the Yjs doc (details in M5).

### Test in Isolation

- Run WS server locally.
- Open two Node scripts or a minimal HTML page:
  - Connect to same room.
  - Update Yjs doc in one, see update in other.

### Integration Notes

- M5 (Canvas UI) will bind tldraw to this Yjs doc.
- M6 (Presence) will store cursors in the same Yjs doc.
- M9 (Snapshots) may hook into the WS server to persist state.

---

## M5 – Canvas UI (tldraw + Tools)

**Goal**: Render tldraw canvas, bound to Yjs doc, inside a room page.

### Inputs
- M0 (Next.js app).
- M1 (auth).
- M3 (rooms API).
- M4 (WS + Yjs provider).

### Outputs
- Page `/room/[roomId]` showing:
  - tldraw canvas.
  - Toolbar with basic tools.
  - Room info (name, share link).

### Interface Contract

- Uses:
  - `useYjsRoom(roomId)` hook (from M4) that returns a Yjs doc.
  - Rooms API to fetch room metadata.
- Exposes:
  - A tldraw instance with default tools enabled.

### Steps

1. Create page `/app/room/[roomId]/page.tsx`.
2. On load:
   - Call `GET /api/rooms/:id` to get room + `myRole`.
   - Initialize Yjs provider for this `roomId` (M4).
3. Render `<Tldraw />`:
   - Pass the Yjs doc as the store.
   - Configure tools (select, draw, rectangle, ellipse, arrow, text).
4. Add:
   - Room name header.
   - “Copy link” button.

### Test in Isolation

- Mock Yjs provider if needed.
- Verify:
  - Canvas renders.
  - You can draw, move, resize.

### Integration Notes

- M6 will enhance this with live cursors.
- M8 will enable image insertion via the assets API.

---

## M6 – Presence & Live Cursors

**Goal**: Show other users’ cursors and a participant list in real time.

### Inputs
- M4 (Yjs doc per room).
- M5 (canvas page).

### Outputs
- Live cursors:
  - Colored pointer + name for each user.
- Participant list:
  - Names/emails of users currently in the room.

### Interface Contract

- Uses shared Yjs structures:
  - `cursors`: `Y.Map<userId, { x, y, color, name }>`.
  - Optionally `presence`: `Y.Map<userId, { status: 'viewing'|'editing', lastSeen }>`.

No new APIs needed; all via Yjs.

### Steps

1. In a shared module (e.g., `lib/yjs-presence.ts`):
   - Create/obtain `cursors` map from the Yjs doc.
   - On pointer move (throttled), update current user’s cursor.
   - Subscribe to `cursors` changes to render others’ cursors.
2. In the canvas component:
   - Render other cursors as absolute-positioned SVG pointers.
3. Derive participant list:
   - Keys in `cursors` map → list of users.

### Test in Isolation

- Open two tabs in same room.
- Move mouse in one; see cursor update in the other.

### Integration Notes

- Depends only on M4/M5; no DB or HTTP needed.
- Can be developed completely in parallel with M3/M7/M8.

---

## M7 – Python Image Processing Service

**Goal**: HTTP service that receives an image, processes it, uploads to storage, and returns URLs.

### Inputs
- Storage credentials (R2 or Supabase).

### Outputs
- Running FastAPI service at `IMAGE_SERVICE_URL`.
- Endpoint: `POST /process-image`.

### Interface Contract

Request:
- Multipart form:
  - `file` (image)
  - Optional: `max_width`, `max_height`, `quality`.

Response JSON:
```json
{
  "originalUrl": "[https://](https://)...",
  "thumbUrl": "[https://](https://)...",
  "width": 1200,
  "height": 800,
  "sizeBytes": 245678
}
```

Errors:
- 400 for invalid file.
- 413 for too large.
- 500 for internal errors.

### Steps

1. Create `services/image-service`:
   ```bash
   mkdir -p services/image-service
   cd services/image-service
   python -m venv .venv
   source .venv/bin/activate
   pip install fastapi uvicorn pillow boto3 python-multipart
   ```
2. Implement `main.py`:
   - `/process-image` endpoint.
   - Validate file type & size.
   - Process with Pillow (resize, thumbnail).
   - Upload to R2/S3 via boto3.
   - Return JSON.
3. Add `.env` with storage keys and bucket info.
4. Deploy to Railway/Render (free tier).

### Test in Isolation

- Use `curl`:
  ```bash
  curl -X POST http://localhost:8000/process-image \
    -F "file=@test.jpg"
  ```
- Verify JSON response and that files appear in bucket.

### Integration Notes

- M8 (Assets API) will call this service.
- No direct frontend calls to this service; always via Node API.

---

## M8 – Assets API (Upload → Python → Storage)

**Goal**: API to upload images, process them via Python service, and store metadata.

### Inputs
- M1 (auth).
- M2 (DB access).
- M3 (rooms exist).
- M7 (image service URL).

### Outputs
- API route:
  - `POST /api/assets`
- DB rows in `assets` table.

### Interface Contract

Request:
- Multipart form:
  - `file` (image)
  - `roomId`

Response:
```json
{
  "id": "asset-uuid",
  "originalUrl": "...",
  "thumbUrl": "...",
  "width": 1200,
  "height": 800,
  "sizeBytes": 245678
}
```

### Steps

1. Implement `POST /api/assets`:
   - Check auth.
   - Verify room exists and user has at least `viewer` role.
2. Receive file (use a multipart parser).
3. Forward file to `IMAGE_SERVICE_URL/process-image`.
4. On success:
   - Generate asset ID.
   - Call `saveAsset(...)` from M2.
   - Return asset metadata.
5. Add basic rate limiting (Upstash Redis or simple in-memory if needed).

### Test in Isolation

- Use `curl` or Postman:
  - POST an image + roomId.
  - Verify:
    - Python service was called.
    - Files in bucket.
    - Row in `assets` table.

### Integration Notes

- Frontend (M5/M10) will call this when inserting images.
- No direct browser → Python calls.

---

## M9 – Snapshots & Recovery

**Goal**: Periodically save Yjs doc state to Postgres and restore on demand.

### Inputs
- M2 (DB access).
- M4 (Yjs doc per room).

### Outputs
- Mechanism to:
  - Save snapshot: `saveSnapshot({ roomId, version, data })`.
  - Load latest snapshot for a room.
- Optional: endpoint `POST /api/rooms/:id/snapshot`.

### Interface Contract

- WS server (M4) or a cron job calls:
  - `POST /api/rooms/:id/snapshot` with `{ version, data }`.
- On room creation or first join:
  - If snapshot exists, initialize Yjs doc from it.

### Steps

1. Implement `POST /api/rooms/:id/snapshot`:
   - Validate auth (maybe a service token or allow WS server to call without user).
   - Call `saveSnapshot(...)`.
2. In WS server:
   - Every N minutes, serialize Yjs doc and POST snapshot.
3. On room initialization:
   - Fetch latest snapshot.
   - If present, apply to Yjs doc before clients connect.

### Test in Isolation

- Manually call snapshot endpoint.
- Restart server; verify room state is restored.

### Integration Notes

- Can be developed in parallel with M5–M8.
- Only needs M2 and M4 interfaces.

---

## M10 – Polish, Export, Metrics (Nice-to-Have)

**Goal**: Add UX polish and optional features.

### Possible Sub-modules

- **M10.1 Export**:
  - Export current viewport as PNG (tldraw has APIs for this).
- **M10.2 Comments**:
  - Simple comment threads anchored to shapes (stored in DB).
- **M10.3 Metrics Panel**:
  - Show peer count, rough latency estimate.

Each sub-module should:
- Depend only on already-defined interfaces.
- Be implementable in isolation.

---

## M11 – Deployment & Final Integration

**Goal**: Deploy everything on free tiers and wire all modules together.

### Inputs
- M0–M10 completed locally.

### Outputs
- Live URLs:
  - Next.js app (Vercel).
  - WS server (Railway/Render or Cloudflare).
  - Image service (Railway/Render).
- Updated README with:
  - Architecture diagram.
  - Setup instructions.
  - Demo video/GIF.

### Steps

1. Deploy:
   - Next.js to Vercel.
   - WS server to Railway/Render.
   - Image service to Railway/Render.
   - DB on Neon/Supabase.
   - Redis on Upstash (if used).
2. Set env vars in each service.
3. Test end-to-end:
   - Create room → share link → open in another browser → draw + upload images.
4. Record a short demo video.

---

## How to Use This Plan in Parallel Chats

For each module (e.g., M4, M7, M8):

1. Start a new chat with a title like:  
   “Implement M4 – Real-Time Sync Engine (Yjs + WS)”.
2. Paste:
   - The corresponding module section from this plan.
   - The common conventions section.
3. Ask the chat to:
   - Generate code following the interface contract.
   - Provide commands to run/test locally.
4. When each module is done:
   - Merge into the main repo.
   - Run integration tests (create room, draw, upload image).

Because all modules share:
- The same env pattern,
- The same API shapes,
- The same DB schema,

you can safely develop them in parallel and integrate at the end.

---

## Next Step

Pick 2–3 modules to start with in parallel, for example:

- Chat A: M2 – Database Schema & Access Layer  
- Chat B: M4 – Real-Time Sync Engine  
- Chat C: M7 – Python Image Processing Service  

Then come back and wire them together with M3, M5, M8.