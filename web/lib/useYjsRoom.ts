/**
 * M4 - Real-Time Sync Engine (client side)
 *
 * FIX (surfaced during M5 testing): the connection used to be created via
 * useMemo and only subscribed-to in the effect. That's broken under React's
 * development Strict Mode, which deliberately mounts every component twice
 * (mount -> cleanup -> mount) to catch exactly this class of bug: the
 * memoized connection survived across both mounts, but the FIRST mount's
 * cleanup already destroyed it, so the second mount was left reattaching
 * listeners to an already-dead WebSocket - hence "WebSocket is closed
 * before the connection is established".
 *
 * Fix: create the Y.Doc + HocuspocusProvider INSIDE the effect, so each
 * mount (real or Strict-Mode-phantom) gets its own fresh connection, and
 * cleanup only ever destroys the one it created. This is the standard React
 * pattern for any effect that opens an external connection.
 *
 * Consumers (e.g. useYjsTldrawStore) must handle `doc`/`provider` being
 * `null` for the brief window before the effect has run.
 */

"use client";

import { useEffect, useState } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";

export type YjsRoomStatus = "connecting" | "connected" | "disconnected";

export interface YjsRoomState {
  doc: Y.Doc | null;
  provider: HocuspocusProvider | null;
  status: YjsRoomStatus;
}

export function useYjsRoom(roomId: string): YjsRoomState {
  const [status, setStatus] = useState<YjsRoomStatus>("connecting");
  const [connection, setConnection] = useState<{
    doc: Y.Doc;
    provider: HocuspocusProvider;
  } | null>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl) {
      throw new Error(
        "NEXT_PUBLIC_WS_URL is not set. Check your .env.local against the root .env.example."
      );
    }

    setStatus("connecting");

    const doc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: wsUrl,
      name: `room-${roomId}`,
      document: doc,
    });

    setConnection({ doc, provider });

    const handleStatus = (event: { status: YjsRoomStatus }) => {
      setStatus(event.status);
    };
    provider.on("status", handleStatus);

    return () => {
      provider.off("status", handleStatus);
      provider.destroy();
      setConnection(null);
    };
  }, [roomId]);

  return {
    doc: connection?.doc ?? null,
    provider: connection?.provider ?? null,
    status,
  };
}
