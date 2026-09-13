/**
 * M5 - Canvas UI (bridge)  +  M6 - Presence (extension)
 *
 * CHANGED FOR M6: now returns { storeWithStatus, provider } instead of just
 * the TLStoreWithStatus directly. M6's presence layer needs access to the
 * same HocuspocusProvider (for its awareness API) - reusing it here avoids
 * opening a second WebSocket connection to the room just for presence.
 *
 * Consumers: pass `storeWithStatus` to <Tldraw store={...} />, and
 * `provider` (when non-null) to <PresenceLayer provider={provider} />.
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
import type { HocuspocusProvider } from "@hocuspocus/provider";
import { useYjsRoom } from "./useYjsRoom";

const LOCAL_ORIGIN = "tldraw-local-write";

export interface YjsTldrawStore {
  storeWithStatus: TLStoreWithStatus;
  provider: HocuspocusProvider | null;
}

export function useYjsTldrawStore(roomId: string): YjsTldrawStore {
  const { doc, provider } = useYjsRoom(roomId);

  const store = useMemo(
    () => createTLStore({ shapeUtils: defaultShapeUtils }),
    [roomId]
  );

  const [initiallyLoaded, setInitiallyLoaded] = useState(false);

  useEffect(() => {
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

  const storeWithStatus = useMemo<TLStoreWithStatus>(() => {
    if (!initiallyLoaded) {
      return { status: "loading" };
    }
    return {
      status: "synced-remote",
      store,
      connectionStatus: "online",
    };
  }, [initiallyLoaded, store]);

  return { storeWithStatus, provider };
}
