/**
 * M9 - Snapshot Persistence - isolation test, PHASE 1 (write)
 *
 * Connects a single client to a REAL room (see scripts/seed-test-room.ts),
 * writes some data, and waits long enough for the server's throttled
 * snapshot save (every ~7s) to fire at least once.
 *
 * Usage (from /web, with the ws-server already running):
 *   node sync-test-m9-write.mjs <roomId>
 */

import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import WebSocket from "ws";

const roomId = process.argv[2];
if (!roomId) {
  console.error("Usage: node sync-test-m9-write.mjs <roomId>");
  process.exit(1);
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:1234";
const DOCUMENT_NAME = `room-${roomId}`;
const WAIT_FOR_SNAPSHOT_MS = 9000; // > the 7s server-side throttle window

async function main() {
  console.log(`Connecting to ${WS_URL} on "${DOCUMENT_NAME}" ...`);

  const doc = new Y.Doc();
  const provider = new HocuspocusProvider({
    url: WS_URL,
    name: DOCUMENT_NAME,
    document: doc,
    WebSocketPolyfill: WebSocket,
  });

  provider.on("status", (e) => console.log(`status: ${e.status}`));

  await new Promise((resolve) => {
    provider.on("synced", resolve);
  });

  const map = doc.getMap("shapes");
  map.set("testShape", "hello-from-m9-write-phase");
  console.log('Wrote testShape = "hello-from-m9-write-phase"');

  console.log(
    `Waiting ${WAIT_FOR_SNAPSHOT_MS}ms for the server's throttled snapshot save...`
  );
  await new Promise((r) => setTimeout(r, WAIT_FOR_SNAPSHOT_MS));

  console.log("Done. Check the ws-server terminal for a 'snapshot saved' log line,");
  console.log("or query Postgres directly:");
  console.log(`  SELECT * FROM "Snapshot" WHERE "roomId" = '${roomId}' ORDER BY "version" DESC;`);

  provider.destroy();
  process.exit(0);
}

main();
