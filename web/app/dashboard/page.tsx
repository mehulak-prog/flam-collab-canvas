"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

/**
 * M5 - Canvas UI
 *
 * Simple dashboard: list rooms the user is a member of, create a new one.
 * Calls the M3 API routes directly from the browser (same-origin, cookies
 * sent automatically - no auth wiring needed here).
 *
 * ADDED (polish): Clerk's <UserButton /> in the header - gives users an
 * avatar with a built-in account menu, including Sign out. Previously
 * there was no way to sign out from anywhere in the app.
 */

interface Room {
  id: string;
  name: string;
  isPublic: boolean;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [newRoomName, setNewRoomName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/rooms")
      .then((res) => res.json())
      .then((data) => setRooms(Array.isArray(data) ? data : []))
      .finally(() => setLoadingRooms(false));
  }, []);

  async function handleCreate() {
    const name = newRoomName.trim();
    if (!name) return;

    setCreating(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, isPublic: true }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(`Could not create room: ${data.message ?? "unknown error"}`);
        return;
      }

      router.push(`/room/${data.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "48px auto", padding: 16, fontFamily: "sans-serif" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1>Your Rooms</h1>
        <UserButton />
      </div>

      <div style={{ display: "flex", gap: 8, margin: "16px 0 32px" }}>
        <input
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="New room name"
          style={{ flex: 1, padding: "8px 12px", fontSize: 14 }}
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newRoomName.trim()}
          style={{ padding: "8px 16px", fontSize: 14 }}
        >
          {creating ? "Creating..." : "Create Room"}
        </button>
      </div>

      {loadingRooms ? (
        <p>Loading rooms...</p>
      ) : rooms.length === 0 ? (
        <p>No rooms yet - create one above.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {rooms.map((room) => (
            <li key={room.id} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
              <a href={`/room/${room.id}`} style={{ fontSize: 16 }}>
                {room.name}
              </a>{" "}
              <span style={{ color: "#888", fontSize: 12 }}>
                {room.isPublic ? "(public)" : "(private)"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}