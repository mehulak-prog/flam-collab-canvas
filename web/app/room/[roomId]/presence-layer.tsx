/**
 * M6 - Presence
 *
 * Rendered as a child of <Tldraw>, so it has access to useEditor() and its
 * absolutely-positioned divs land inside tldraw's own container,
 * automatically aligned with the canvas.
 *
 * - Sets local awareness state on mount: { name, color, cursor: null }.
 * - Tracks the local pointer in PAGE space (not screen space) via
 *   editor.screenToPage, so cursors stay correctly placed even if two users
 *   have different zoom/pan/window sizes.
 * - Renders other users' cursors by converting their page-space position
 *   back to screen space with editor.pageToScreen. Wrapped in tldraw's
 *   `track()` so it automatically re-renders when the camera (zoom/pan)
 *   changes, not just when awareness changes.
 * - Presence is intentionally NOT persisted anywhere (no Postgres writes) -
 *   awareness is Yjs's own ephemeral-by-design layer.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { track, useEditor } from "tldraw";
import { useUser } from "@clerk/nextjs";
import type { HocuspocusProvider } from "@hocuspocus/provider";

const CURSOR_COLORS = [
  "#e03131",
  "#2f9e44",
  "#1971c2",
  "#f08c00",
  "#9c36b5",
  "#0c8599",
];

interface PresenceState {
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
}

interface AwarenessEntry extends PresenceState {
  clientId: number;
}

export const PresenceLayer = track(function PresenceLayer({
  provider,
}: {
  provider: HocuspocusProvider;
}) {
  const editor = useEditor();
  const { user } = useUser();

  const color = useState(
    () => CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)]
  )[0];
  const name = user?.fullName || user?.username || "Anonymous";

  // Set (and keep up to date) our own awareness state.
  useEffect(() => {
    provider.setAwarenessField("presence", {
      name,
      color,
      cursor: null,
    } satisfies PresenceState);
  }, [provider, name, color]);

  // Track our pointer over tldraw's own container, convert to page space,
  // and broadcast it via awareness.
  useEffect(() => {
    const container = editor.getContainer();

    function handlePointerMove(e: PointerEvent) {
      const rect = container.getBoundingClientRect();
      const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const pagePoint = editor.screenToPage(screenPoint);

      provider.setAwarenessField("presence", {
        name,
        color,
        cursor: { x: pagePoint.x, y: pagePoint.y },
      } satisfies PresenceState);
    }

    container.addEventListener("pointermove", handlePointerMove);
    return () => container.removeEventListener("pointermove", handlePointerMove);
  }, [editor, provider, name, color]);

  // Re-render whenever ANY client's awareness state changes. We re-read
  // getStates() fresh each time rather than trusting the event payload's
  // shape, since Hocuspocus's awarenessUpdate payload format isn't
  // guaranteed the same across versions - awareness.getStates() (from the
  // underlying y-protocols Awareness class) is the stable, documented API.
  //
  // FIX: `tick` must be a real dependency of the `others` memo below - it
  // was previously only depended on `[provider]`, which never changes, so
  // the list was computed once at mount and then frozen. `setTick` was
  // firing correctly on every awareness change, but nothing was
  // recomputing in response to it - hence cursors only ever showed the
  // position from the moment the component first mounted (a page refresh
  // "fixed" it only because refreshing creates a brand new mount).
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const awareness = provider.awareness;
    if (!awareness) return;

    const handleChange = () => setTick((t) => t + 1);
    awareness.on("change", handleChange);
    return () => awareness.off("change", handleChange);
  }, [provider]);

  const others = useMemo<AwarenessEntry[]>(() => {
    const awareness = provider.awareness;
    if (!awareness) return [];

    const myClientId = awareness.clientID;
    const entries: AwarenessEntry[] = [];

    awareness.getStates().forEach((state, clientId) => {
      if (clientId === myClientId) return;
      const presence = (state as { presence?: PresenceState }).presence;
      if (presence?.cursor) {
        entries.push({ clientId, ...presence });
      }
    });

    return entries;
  }, [provider, tick]);

  return (
    <>
      {others.map(({ clientId, name: otherName, color: otherColor, cursor }) => {
        if (!cursor) return null;
        const screenPoint = editor.pageToScreen(cursor);

        return (
          <div
            key={clientId}
            style={{
              position: "absolute",
              left: screenPoint.x,
              top: screenPoint.y,
              pointerEvents: "none",
              zIndex: 999,
              transform: "translate(-2px, -2px)",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: otherColor,
                border: "1px solid white",
              }}
            />
            <div
              style={{
                marginTop: 2,
                padding: "2px 6px",
                borderRadius: 4,
                background: otherColor,
                color: "white",
                fontSize: 11,
                fontFamily: "sans-serif",
                whiteSpace: "nowrap",
              }}
            >
              {otherName}
            </div>
          </div>
        );
      })}
    </>
  );
});
