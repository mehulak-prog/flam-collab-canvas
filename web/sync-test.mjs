/**
 * M4 - Real-Time Sync Engine - isolation test
 *
 * Simulates two browser tabs joining the SAME room. Client A writes into a
 * shared Y.Map; we assert Client B observes that write over the WebSocket.
 *
 * Usage:
 *   1. Start the server in one terminal:
 *        cd services/ws-server && npm run dev
 *   2. In another terminal, from the repo root:
 *        node test/sync-test.mjs
 *
 * Requires @hocuspocus/provider + yjs installed somewhere node can resolve
 * them from - easiest is to run this from inside /web (see README-M4.md).
 */

import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import WebSocket from "ws";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:1234";
const ROOM_NAME = "room-test-room-123";
const TIMEOUT_MS = 8000;

function makeClient(label) {
  const doc = new Y.Doc();
  const provider = new HocuspocusProvider({
    url: WS_URL,
    name: ROOM_NAME,
    document: doc,
    WebSocketPolyfill: WebSocket,
  });

  provider.on("status", (e) => console.log(`[${label}] status: ${e.status}`));

  return { doc, provider };
}

async function main() {
  console.log(`Connecting two clients to ${WS_URL} on "${ROOM_NAME}" ...`);

  const clientA = makeClient("A");
  const clientB = makeClient("B");

  const mapA = clientA.doc.getMap("shapes");
  const mapB = clientB.doc.getMap("shapes");

  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timed out waiting for sync between clients"));
    }, TIMEOUT_MS);

    mapB.observe(() => {
      const value = mapB.get("testShape");
      if (value === "hello-from-A") {
        clearTimeout(timer);
        resolve(value);
      }
    });

    // Give both clients a moment to finish the initial handshake before
    // writing, then have A write and B observe.
    setTimeout(() => {
      console.log("[A] writing testShape = 'hello-from-A'");
      mapA.set("testShape", "hello-from-A");
    }, 1500);
  });

  console.log(`[B] observed: ${result}`);
  console.log("PASS: sync confirmed between two independent Yjs clients.");

  clientA.provider.destroy();
  clientB.provider.destroy();
  process.exit(0);
}

main().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
