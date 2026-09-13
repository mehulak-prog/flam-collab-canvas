/**
 * M9 - Snapshot Persistence - isolation test, PHASE 2 (restore)
 *
 * Run this AFTER phase 1, and AFTER restarting the ws-server process (so
 * its in-memory Yjs doc is gone and onLoadDocument is forced to hit
 * Postgres again - this is what makes it a real "did it survive a cold
 * start" test rather than just "is the doc still cached in memory").
 *
 * Usage (from /web, with the ws-server restarted and running again):
 *   node sync-test-m9-verify.mjs <roomId>
 */

import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import WebSocket from "ws";

const roomId = process.argv[2];
if (!roomId) {
  console.error("Usage: node sync-test-m9-verify.mjs <roomId>");
  process.exit(1);
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:1234";
const DOCUMENT_NAME = `room-${roomId}`;

async function main() {
  console.log(`Connecting FRESH client to ${WS_URL} on "${DOCUMENT_NAME}" ...`);

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
  const value = map.get("testShape");

  if (value === "hello-from-m9-write-phase") {
    console.log(`PASS: restored testShape = "${value}" from snapshot, no live peer needed.`);
  } else {
    console.log(`FAIL: expected "hello-from-m9-write-phase", got: ${JSON.stringify(value)}`);
    console.log("If this is empty, either the server never persisted (check phase 1 logs),");
    console.log("or the server wasn't actually restarted between phase 1 and this run.");
  }

  provider.destroy();
  process.exit(value === "hello-from-m9-write-phase" ? 0 : 1);
}

main();
