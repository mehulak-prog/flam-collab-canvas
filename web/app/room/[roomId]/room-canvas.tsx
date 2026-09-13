"use client";

import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { useYjsTldrawStore } from "../../../lib/useYjsTldrawStore";

/**
 * M5 - Canvas UI
 *
 * Client component - all the tldraw/Yjs hooks need to run in the browser.
 */
export default function RoomCanvas({
  roomId,
  roomName,
}: {
  roomId: string;
  roomName: string;
}) {
  const store = useYjsTldrawStore(roomId);

  if (store.status === "loading") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          color: "#555",
        }}
      >
        Connecting to &ldquo;{roomName}&rdquo;...
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Tldraw store={store} />
    </div>
  );
}
