/**
 * M4 - Real-Time Sync Engine
 *
 * Hocuspocus WebSocket server. Maintains one Yjs document per room and
 * broadcasts updates between all clients connected to that room.
 *
 * Scope (per module contract):
 *  - No HTTP/REST logic lives here.
 *  - No DB calls here - persistence (M9 Snapshots) is a future hook, stubbed
 *    below with comments only.
 *  - No auth here - M1/Clerk auth happens in the Next.js app before a client
 *    is ever handed a room to connect to. This server trusts documentName.
 *
 * Room naming convention (must match /web client):
 *    documentName = `room-${roomId}`
 * roomId itself is an opaque UUID string owned by M2/M3 - this server does
 * not validate its shape, only uses it as a map key.
 */

import { Server } from "@hocuspocus/server";

const PORT = Number(process.env.PORT) || 1234;

const server = Server.configure({
  port: PORT,

  /**
   * Fired when a client connects, before the doc sync handshake completes.
   * Hocuspocus already creates/loads a Y.Doc keyed by `documentName`
   * internally - we don't need to manage that map ourselves. This hook is
   * where a future M9 snapshot-restore call would go:
   *
   *   const snapshot = await fetchLatestSnapshot(roomIdFromDocName(documentName));
   *   if (snapshot) Y.applyUpdate(document, snapshot.data);
   *
   * Left as a comment intentionally: M9 owns the DB call, M4 only owns the
   * place it would be applied.
   */
  async onConnect(data) {
    const { documentName } = data;
    console.log(`[ws-server] connect  -> room="${documentName}"`);
  },

  async onDisconnect(data) {
    const { documentName } = data;
    console.log(`[ws-server] disconnect <- room="${documentName}"`);
  },

  /**
   * Fires on every doc mutation. Not persisting anything yet - this is the
   * hook point M9 will use to periodically POST the serialized doc to
   * `/api/rooms/:id/snapshot`.
   */
  async onChange(data) {
    // Intentionally left as a no-op for M4. Example of what M9 will add:
    // const update = Y.encodeStateAsUpdate(data.document);
    // await maybeThrottledSaveSnapshot(data.documentName, update);
  },

  async onLoadDocument(data) {
    // Called once per document the first time it's requested. Returning
    // undefined here tells Hocuspocus to use its default in-memory Y.Doc.
    // M9 can override this to hydrate from a stored snapshot instead.
    return undefined;
  },
});

server.listen();

console.log(`[ws-server] Hocuspocus listening on ws://localhost:${PORT}`);
console.log(`[ws-server] Clients should connect with name = "room-<roomId>"`);
