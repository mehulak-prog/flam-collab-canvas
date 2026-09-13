/**
 * M4 - Real-Time Sync Engine (client side)
 *
 * React hook for M5 (Canvas UI) to consume:
 *
 *   const { doc, provider, status } = useYjsRoom(roomId);
 *   <Tldraw store={... bind to doc ...} />
 *
 * Handles connect/disconnect lifecycle and exposes a simple status string
 * so the UI can show "connecting..." / "connected" / "disconnected".
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { createYjsRoomProvider, YjsRoomConnection } from "./yjs-provider";

export type YjsRoomStatus = "connecting" | "connected" | "disconnected";

export function useYjsRoom(roomId: string) {
  const [status, setStatus] = useState<YjsRoomStatus>("connecting");

  const { doc, provider }: YjsRoomConnection = useMemo(
    () => createYjsRoomProvider(roomId),
    [roomId]
  );

  useEffect(() => {
    const handleStatus = (event: { status: YjsRoomStatus }) => {
      setStatus(event.status);
    };

    provider.on("status", handleStatus);

    return () => {
      provider.off("status", handleStatus);
      provider.destroy();
    };
  }, [provider]);

  return { doc, provider, status };
}
