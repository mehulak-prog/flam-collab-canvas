/**
 * M9 - Snapshot Persistence (server-side data access for ws-server)
 *
 * ws-server is a SEPARATE npm package from /web, so it cannot import
 * web/lib/rooms.ts directly. To keep the function-level contract identical
 * (same names, same params, same conceptual return shape) without
 * duplicating a full second Prisma schema + migration setup in this
 * package, we talk to the same Postgres database directly via `pg`.
 *
 * IMPORTANT: table/column names below match Prisma's default mapping for
 * the `Snapshot` model in web/prisma/schema.prisma (no @@map/@map used
 * there, so Prisma preserves exact-case identifiers and quotes them - we
 * mirror that quoting here). If that schema ever adds @@map/@map, this file
 * must be updated to match, or these two implementations will drift.
 *
 * Do not rename saveSnapshot / getLatestSnapshot or change their parameter
 * shapes - M2's version in web/lib/rooms.ts and this one must stay in sync.
 */

import { Pool } from "pg";
import { randomUUID } from "crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export interface SnapshotRow {
  id: string;
  roomId: string;
  version: number;
  data: Buffer;
  createdAt: Date;
}

export async function saveSnapshot({
  roomId,
  version,
  data,
}: {
  roomId: string;
  version: number;
  data: Buffer;
}): Promise<SnapshotRow> {
  const id = randomUUID();

  const result = await pool.query(
    `INSERT INTO "Snapshot" ("id", "roomId", "version", "data", "createdAt")
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING "id", "roomId", "version", "data", "createdAt"`,
    [id, roomId, version, data]
  );

  return result.rows[0];
}

export async function getLatestSnapshot(
  roomId: string
): Promise<SnapshotRow | null> {
  const result = await pool.query(
    `SELECT "id", "roomId", "version", "data", "createdAt"
     FROM "Snapshot"
     WHERE "roomId" = $1
     ORDER BY "version" DESC
     LIMIT 1`,
    [roomId]
  );

  return result.rows[0] ?? null;
}
