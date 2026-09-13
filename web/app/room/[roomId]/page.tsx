import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getRoom, getRoomMember } from "../../../lib/rooms";
import RoomCanvas from "./room-canvas";

/**
 * M5 - Canvas UI
 *
 * Server component: checks auth + membership before rendering the canvas.
 *
 * Implementation note (deviation from the literal spec wording "fetch room
 * details from GET /api/rooms/[roomId]"): since this is already a server
 * component, it calls getRoom/getRoomMember directly (the same functions
 * M3's API route calls) instead of making an HTTP round-trip to our own API
 * from the server, which would require constructing an absolute URL and
 * manually forwarding the Clerk session cookie - more fragile for no
 * benefit. The actual HTTP endpoint is untouched and still used by the
 * dashboard page (a client component, where a same-origin fetch is the
 * natural approach).
 *
 * Next.js 16: dynamic route params are a Promise and must be awaited.
 */
export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const room = await getRoom(roomId);
  if (!room) {
    notFound();
  }

  const membership = await getRoomMember(roomId, userId);
  if (!membership) {
    // Joining a room (POST /api/rooms/[roomId]/join, M3) is a separate flow
    // from this page's scope (canvas UI) - not a member yet, so send them
    // back to the dashboard rather than silently letting them view/edit.
    redirect("/dashboard?error=not_a_member");
  }

  return <RoomCanvas roomId={roomId} roomName={room.name} />;
}
