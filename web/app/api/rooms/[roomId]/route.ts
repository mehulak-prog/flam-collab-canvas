import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getRoom, getRoomMember } from "../../../../lib/rooms";
import { apiError } from "../../../../lib/api-error";

/**
 * M3 - Rooms API
 * GET /api/rooms/[roomId] - room details.
 * 404 if the room doesn't exist, 403 if the current user isn't a member.
 *
 * Next.js 16: dynamic route params are a Promise and must be awaited.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return apiError(401, "unauthorized", "Not signed in.");

  const { roomId } = await params;

  const room = await getRoom(roomId);
  if (!room) return apiError(404, "room_not_found", "No room with that id.");

  const membership = await getRoomMember(roomId, userId);
  if (!membership) {
    return apiError(
      403,
      "not_a_member",
      "You are not a member of this room."
    );
  }

  return NextResponse.json(room, { status: 200 });
}
