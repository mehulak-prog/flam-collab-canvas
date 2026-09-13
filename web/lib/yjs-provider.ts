/**
 * M4 - Real-Time Sync Engine (client side)
 *
 * Framework-agnostic factory. Creates a Yjs doc and a Hocuspocus client
 * provider pointed at the shared NEXT_PUBLIC_WS_URL, using the shared
 * room-naming convention: `room-<roomId>`.
 *
 * M5 (Canvas UI) can use this directly, or the `useYjsRoom` React hook
 * in `lib/useYjsRoom.ts` which wraps this with lifecycle handling.
 */

import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";

export interface YjsRoomConnection {
  doc: Y.Doc;
  provider: HocuspocusProvider;
}

export function createYjsRoomProvider(roomId: string): YjsRoomConnection {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;

  if (!wsUrl) {
    throw new Error(
      "NEXT_PUBLIC_WS_URL is not set. Check your .env.local against the root .env.example."
    );
  }

  const doc = new Y.Doc();

  const provider = new HocuspocusProvider({
    url: wsUrl,
    name: `room-${roomId}`,
    document: doc,
  });

  return { doc, provider };
}
