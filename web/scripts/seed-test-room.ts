/**
 * M9 - Snapshot Persistence - test fixture
 *
 * Snapshot.roomId has a foreign key to Room.id, and Room.ownerId has a
 * foreign key to User.id. That means we can't test snapshot saving with a
 * made-up roomId string (like M4's isolation test used) - we need a real
 * Room row backed by a real User row.
 *
 * This script creates both (if they don't already exist) and prints the
 * roomId to use in the M9 sync test.
 *
 * Run from /web:
 *   npx tsx scripts/seed-test-room.ts
 */

import { prisma } from "../lib/db";
import { createRoom } from "../lib/rooms";

async function main() {
  const testUserId = "test-user-m9";

  await prisma.user.upsert({
    where: { id: testUserId },
    update: {},
    create: {
      id: testUserId,
      email: "m9-test@example.com",
      name: "M9 Test User",
    },
  });

  const room = await createRoom({
    ownerId: testUserId,
    name: "M9 Snapshot Test Room",
  });

  console.log("Created test room:");
  console.log(`  roomId = ${room.id}`);
  console.log("");
  console.log("Use this roomId in the M9 sync test (sync-test-m9.mjs).");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Seed failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
