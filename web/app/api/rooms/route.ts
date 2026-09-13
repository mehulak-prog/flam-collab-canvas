import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createRoom, getRoomsForUser } from "../../../lib/rooms";
import { apiError } from "../../../lib/api-error";

/**
 * M3 - Rooms API
 * POST /api/rooms - create a room owned by the current user.
 * Body: { name: string; isPublic?: boolean }
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return apiError(401, "unauthorized", "Not signed in.");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "invalid_body", "Request body must be valid JSON.");
  }

  const { name, isPublic } = (body ?? {}) as {
    name?: unknown;
    isPublic?: unknown;
  };

  if (typeof name !== "string" || name.trim().length === 0) {
    return apiError(
      400,
      "invalid_name",
      "`name` is required and must be a non-empty string."
    );
  }
  if (isPublic !== undefined && typeof isPublic !== "boolean") {
    return apiError(
      400,
      "invalid_is_public",
      "`isPublic` must be a boolean if provided."
    );
  }

  const room = await createRoom({
    ownerId: userId,
    name: name.trim(),
    isPublic: isPublic as boolean | undefined,
  });

  return NextResponse.json(room, { status: 201 });
}

/**
 * M3 - Rooms API
 * GET /api/rooms - list rooms the current user is a member of.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return apiError(401, "unauthorized", "Not signed in.");

  const rooms = await getRoomsForUser(userId);
  return NextResponse.json(rooms, { status: 200 });
}
