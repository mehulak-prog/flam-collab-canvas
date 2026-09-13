import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getRoom, getRoomMember, addRoomMember } from "../../../../../lib/rooms";
import { apiError } from "../../../../../lib/api-error";

/**
 * M3 - Rooms API
 * POST /api/rooms/[roomId]/join
 * - 404 if the room doesn't exist.
 * - 200 (idempotent) if the current user is already a member (e.g. the owner).
 * - 403 if the room is private and the user isn't already a member.
 * - 201 + new membership (role "editor") if the room is public.
 *
 * Next.js 16: dynamic route params are a Promise and must be awaited.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return apiError(401, "unauthorized", "Not signed in.");

  const { roomId } = await params;

  const room = await getRoom(roomId);
  if (!room) return apiError(404, "room_not_found", "No room with that id.");

  const existing = await getRoomMember(roomId, userId);
  if (existing) {
    return NextResponse.json(existing, { status: 200 });
  }

  if (!room.isPublic) {
    return apiError(
      403,
      "room_private",
      "This room is private and you have not been invited."
    );
  }

  const membership = await addRoomMember({ roomId, userId, role: "editor" });
  return NextResponse.json(membership, { status: 201 });
}
