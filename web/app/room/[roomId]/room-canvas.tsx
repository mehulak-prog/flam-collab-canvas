"use client";

import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { useYjsTldrawStore } from "../../../lib/useYjsTldrawStore";
import { PresenceLayer } from "./presence-layer";
import { UploadButton } from "./upload-button";

/**
 * M5 - Canvas UI  +  M6 - Presence  +  M10 - Image upload
 *
 * CHANGED FOR M6: useYjsTldrawStore now returns { storeWithStatus, provider }
 * instead of the store directly - see useYjsTldrawStore.ts for why.
 *
 * ADDED FOR M10: UploadButton lets users insert images via the M8 Assets API.
 * It's rendered as a Tldraw child so it can call useEditor() internally.
 */
export default function RoomCanvas({
  roomId,
  roomName,
}: {
  roomId: string;
  roomName: string;
}) {
  const { storeWithStatus, provider } = useYjsTldrawStore(roomId);

  if (storeWithStatus.status === "loading") {
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
      <Tldraw store={storeWithStatus}>
        {provider && <PresenceLayer provider={provider} />}
        <UploadButton roomId={roomId} />
      </Tldraw>
    </div>
  );
}