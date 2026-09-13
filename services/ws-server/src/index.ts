/**
 * M4 - Real-Time Sync Engine  +  M9 - Snapshot Persistence
 *
 * Hocuspocus WebSocket server. Maintains one Yjs document per room,
 * broadcasts updates between all clients connected to that room, and
 * (as of M9) restores/persists room state to Postgres so a room's canvas
 * survives a server restart or a cold start with no clients connected.
 *
 * Scope:
 *  - No HTTP/REST logic lives here.
 *  - No auth here - M1/Clerk auth happens in the Next.js app before a
 *    client is ever handed a room to connect to. This server trusts
 *    documentName.
 */

import "dotenv/config";
import { Server } from "@hocuspocus/server";
import * as Y from "yjs";
import { saveSnapshot, getLatestSnapshot } from "./snapshot-store";

const PORT = Number(process.env.PORT) || 1234;

// documentName convention is `room-<roomId>` (set by web/lib/useYjsRoom.ts).
// roomId itself may contain hyphens (it's a UUID), so only strip the fixed
// "room-" prefix - do not split on "-" generally.
function roomIdFromDocumentName(documentName: string): string | null {
  const prefix = "room-";
  if (!documentName.startsWith(prefix)) return null;
  return documentName.slice(prefix.length);
}

// --- M9: throttled persistence -------------------------------------------
//
// Save at most once every SNAPSHOT_THROTTLE_MS per room. Uses a standard
// leading+trailing throttle: the first change after a quiet period saves
// immediately; further changes during the cooldown window are coalesced
// into a single trailing save once the window ends, so the very latest
// state always eventually gets persisted.
const SNAPSHOT_THROTTLE_MS = 7000; // within the 5-10s range from the spec

interface ThrottleState {
  lastSavedAt: number;
  pending: boolean;
  timer?: ReturnType<typeof setTimeout>;
}

const throttleState = new Map<string, ThrottleState>();

async function persistSnapshot(documentName: string, document: Y.Doc) {
  const roomId = roomIdFromDocumentName(documentName);
  if (!roomId) return;

  try {
    // version scheme: latest existing version + 1 (starts at 1 if none
    // exist yet). Simple and sufficient for this project's scale - documented
    // here per the module spec's request to record which scheme was chosen.
    const latest = await getLatestSnapshot(roomId);
    const nextVersion = (latest?.version ?? 0) + 1;

    const update = Y.encodeStateAsUpdate(document);
    const data = Buffer.from(update);

    await saveSnapshot({ roomId, version: nextVersion, data });
    console.log(
      `[ws-server] snapshot saved room="${documentName}" version=${nextVersion} bytes=${data.byteLength}`
    );
  } catch (err) {
    // Never let a persistence failure crash the WS server or disconnect
    // clients - just log it and move on. The next throttle window will
    // retry with fresh state anyway.
    console.error(
      `[ws-server] snapshot save FAILED for room="${documentName}":`,
      err
    );
  }
}

function scheduleSnapshotSave(documentName: string, document: Y.Doc) {
  const state: ThrottleState = throttleState.get(documentName) ?? {
    lastSavedAt: 0,
    pending: false,
  };
  throttleState.set(documentName, state);

  const now = Date.now();
  const elapsed = now - state.lastSavedAt;

  if (elapsed >= SNAPSHOT_THROTTLE_MS) {
    state.lastSavedAt = now;
    void persistSnapshot(documentName, document);
    return;
  }

  if (!state.pending) {
    state.pending = true;
    const wait = SNAPSHOT_THROTTLE_MS - elapsed;
    state.timer = setTimeout(() => {
      state.pending = false;
      state.lastSavedAt = Date.now();
      void persistSnapshot(documentName, document);
    }, wait);
  }
  // else: a trailing save is already scheduled for this room - nothing more to do.
}

// --- Server ----------------------------------------------------------------

const server = Server.configure({
  port: PORT,

  async onConnect(data) {
    console.log(`[ws-server] connect  -> room="${data.documentName}"`);
  },

  async onDisconnect(data) {
    console.log(`[ws-server] disconnect <- room="${data.documentName}"`);
  },

  /**
   * M9: called once per document, the first time ANY client requests it
   * (e.g. first connection after a server restart, or the very first time
   * the room is ever opened). We try to hydrate it from the latest saved
   * snapshot. Any DB error here is caught and logged - we deliberately fall
   * back to an empty doc rather than failing the connection, per spec.
   */
  async onLoadDocument(data) {
    const { documentName, document } = data;
    const roomId = roomIdFromDocumentName(documentName);

    if (!roomId) {
      console.log(
        `[ws-server] onLoadDocument: could not parse roomId from "${documentName}", starting empty`
      );
      return document;
    }

    try {
      const snapshot = await getLatestSnapshot(roomId);
      if (snapshot?.data) {
        Y.applyUpdate(document, new Uint8Array(snapshot.data));
        console.log(
          `[ws-server] restored snapshot room="${documentName}" version=${snapshot.version}`
        );
      } else {
        console.log(
          `[ws-server] no existing snapshot for room="${documentName}", starting empty`
        );
      }
    } catch (err) {
      console.error(
        `[ws-server] onLoadDocument: failed to load snapshot for room="${documentName}", starting empty:`,
        err
      );
    }

    return document;
  },

  /**
   * M9: fires on every doc mutation. We do NOT persist synchronously here -
   * scheduleSnapshotSave throttles actual writes to Postgres.
   *
   * Known limitation (flagged per integration notes in the spec): this
   * fires for ANY Yjs update, including presence-only writes M6 will make
   * (e.g. cursor position in a `cursors` Y.Map). We have no cheap way here
   * to distinguish "real content changed" from "just a cursor moved"
   * without inspecting the update's affected keys, which is more complexity
   * than this module's scope covers. Practical impact is low: it just means
   * we may persist slightly more often than strictly necessary while users
   * are moving their mouse, capped by the same throttle window either way.
   * If this becomes a real cost/perf issue, M6 could expose a signal (e.g.
   * a separate transaction origin marker) that this hook checks to skip
   * presence-only updates - left as a future improvement, not implemented here.
   */
  async onChange(data) {
    scheduleSnapshotSave(data.documentName, data.document);
  },
});

server.listen();

console.log(`[ws-server] Hocuspocus listening on ws://localhost:${PORT}`);
console.log(`[ws-server] Clients should connect with name = "room-<roomId>"`);
