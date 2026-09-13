/**
 * M5 - Canvas UI
 *
 * Bridges tldraw's TLStore to the Yjs doc from M4's useYjsRoom, since
 * modern tldraw (v5) no longer ships a built-in Yjs binding - its own docs
 * point to @tldraw/sync instead. Per project decision, we keep the
 * already-built M4/M9 Yjs+Hocuspocus stack and hand-write this bridge
 * rather than reworking M4/M9 onto @tldraw/sync.
 *
 * UPDATED: useYjsRoom's `doc`/`provider` are now nullable for the brief
 * window before its effect creates the connection (see the strict-mode fix
 * in useYjsRoom.ts) - this hook's effect now no-ops until both exist.
 *
 * Design:
 *  - One Y.Map (doc.getMap("tldraw")), keyed by tldraw record id, holding
 *    the record itself as the value.
 *  - Local ('user'-scoped) store changes are pushed into the Y.Map inside a
 *    Yjs transaction tagged with LOCAL_ORIGIN.
 *  - The Y.Map observer ignores events whose transaction origin is
 *    LOCAL_ORIGIN and applies everything else via store.mergeRemoteChanges.
 *  - Initial store content is populated only after the Hocuspocus
 *    provider's "synced" event fires.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createTLStore,
  defaultShapeUtils,
  type TLRecord,
  type TLStoreWithStatus,
} from "tldraw";
import * as Y from "yjs";
import { useYjsRoom } from "./useYjsRoom";

const LOCAL_ORIGIN = "tldraw-local-write";

export function useYjsTldrawStore(roomId: string): TLStoreWithStatus {
  const { doc, provider } = useYjsRoom(roomId);

  const store = useMemo(
    () => createTLStore({ shapeUtils: defaultShapeUtils }),
    [roomId]
  );

  const [initiallyLoaded, setInitiallyLoaded] = useState(false);

  useEffect(() => {
    // Connection not established yet (brief window on mount, or between
    // strict-mode's phantom unmount and the real one) - nothing to wire up.
    if (!doc || !provider) {
      setInitiallyLoaded(false);
      return;
    }

    setInitiallyLoaded(false);

    const yRecords = doc.getMap<TLRecord>("tldraw");

    function applyRemoteChange(event: Y.YMapEvent<TLRecord>) {
      if (event.transaction.origin === LOCAL_ORIGIN) return;

      const toPut: TLRecord[] = [];
      const toRemove: TLRecord["id"][] = [];

      event.changes.keys.forEach((change, key) => {
        if (change.action === "add" || change.action === "update") {
          const record = yRecords.get(key);
          if (record) toPut.push(record);
        } else if (change.action === "delete") {
          toRemove.push(key as TLRecord["id"]);
        }
      });

      store.mergeRemoteChanges(() => {
        if (toPut.length) store.put(toPut);
        if (toRemove.length) store.remove(toRemove);
      });
    }

    function loadInitialState() {
      const records = Array.from(yRecords.values());
      if (records.length > 0) {
        store.mergeRemoteChanges(() => {
          store.put(records);
        });
      }
      setInitiallyLoaded(true);
    }

    const unsubscribeLocal = store.listen(
      (entry) => {
        const { added, updated, removed } = entry.changes;

        doc.transact(() => {
          for (const record of Object.values(added)) {
            yRecords.set(record.id, record as TLRecord);
          }
          for (const [, to] of Object.values(updated)) {
            yRecords.set(to.id, to as TLRecord);
          }
          for (const id of Object.keys(removed)) {
            yRecords.delete(id);
          }
        }, LOCAL_ORIGIN);
      },
      { source: "user", scope: "document" }
    );

    yRecords.observe(applyRemoteChange);
    provider.on("synced", loadInitialState);

    return () => {
      unsubscribeLocal();
      yRecords.unobserve(applyRemoteChange);
      provider.off("synced", loadInitialState);
    };
  }, [doc, provider, store]);

  return useMemo<TLStoreWithStatus>(() => {
    if (!initiallyLoaded) {
      return { status: "loading" };
    }
    return {
      status: "synced-remote",
      store,
      connectionStatus: "online",
    };
  }, [initiallyLoaded, store]);
}
