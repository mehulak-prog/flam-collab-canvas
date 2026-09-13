"use client";

import { useState } from "react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { useYjsTldrawStore } from "../../../lib/useYjsTldrawStore";
import { PresenceLayer } from "./presence-layer";
import { BackgroundColorPicker } from "./background-color-picker";

/**
 * M5 - Canvas UI  +  M6 - Presence  +  M10 - Image upload + polish
 *
 * CHANGED FOR M6: useYjsTldrawStore now returns { storeWithStatus, provider }
 * instead of the store directly - see useYjsTldrawStore.ts for why.
 *
 * CHANGED FOR M10 (polish pass): custom TLAssetStore routes tldraw's own
 * Media button / drag-drop / paste through the M8 Assets API instead of
 * tldraw's default base64-embed behavior.
 *
 * CHANGED FOR M10 (polish pass 3): background color is now applied via a
 * CSS custom-property override (--tl-color-background) instead of swapping
 * tldraw's Background React component. Swapping the component on every
 * keystroke was forcing tldraw to remount internal UI and caused visible
 * lag; overriding the CSS variable is a plain style recalculation, and it
 * also keeps tldraw's own grid rendering intact (the component-swap
 * approach silently removed the grid). Local-only per browser, not synced.
 */



export default function RoomCanvas({
  roomId,
  roomName,
}: {
  roomId: string;
  roomName: string;
}) {
  const { storeWithStatus, provider } = useYjsTldrawStore(roomId);
  const [bgColor, setBgColor] = useState<string | null>(null);
  const [stylePanelOpen, setStylePanelOpen] = useState(true);

  if (storeWithStatus.status === "loading") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "#fafafa",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            padding: "28px 36px",
            borderRadius: 12,
            background: "#fff",
            border: "1px solid #e5e5e5",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "3px solid #e5e5e5",
              borderTopColor: "#3b82f6",
              animation: "room-canvas-spin 0.8s linear infinite",
            }}
          />
          <div style={{ fontSize: 14, color: "#555" }}>
            Connecting to <strong>{roomName}</strong>&hellip;
          </div>
        </div>
        <style>{`
          @keyframes room-canvas-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (storeWithStatus.status === "error") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "#fafafa",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            padding: "28px 36px",
            borderRadius: 12,
            background: "#fff",
            border: "1px solid #f3c9c9",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            maxWidth: 320,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: "#b91c1c" }}>
            Couldn&apos;t connect to this room
          </div>
          <div style={{ fontSize: 13, color: "#777" }}>
            Check your connection and try refreshing the page.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Tldraw store={storeWithStatus}>
        {provider && <PresenceLayer provider={provider} />}
      </Tldraw>
      <BackgroundColorPicker value={bgColor} onChange={setBgColor} />
      {bgColor && (
        <style>{`
      .tl-theme__light, .tl-theme__dark {
        --tl-color-background: ${bgColor} !important;
      }
    `}</style>
      )}
      <button
        onClick={() => setStylePanelOpen((v) => !v)}
        style={{
          position: "fixed",
          top: 70,
          right: 175,
          zIndex: 400,
          background: "#fff",
          border: "1px solid #e5e5e5",
          borderRadius: 6,
          height: 28,
          padding: "0 8px",
          cursor: "pointer",
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          gap: 4,
          whiteSpace: "nowrap",
          color: "black",
        }}
      >
        {stylePanelOpen ? "› Palette" : "‹ Palette"}
      </button>
      {!stylePanelOpen && (
        <style>{`
      .tlui-style-panel {
        display: none !important;
      }
    `}</style>
      )}
    </div>
  );
}