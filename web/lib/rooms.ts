import { prisma } from './db';

export async function createRoom({
    ownerId,
    name,
    isPublic = true,
}: {
    ownerId: string;
    name: string;
    isPublic?: boolean;
}) {
    const room = await prisma.room.create({
        data: { ownerId, name, isPublic },
    });

    await prisma.roomMember.create({
        data: { roomId: room.id, userId: ownerId, role: 'owner' },
    });

    return room;
}

export async function getRoom(roomId: string) {
    return prisma.room.findUnique({ where: { id: roomId } });
}

export async function getRoomMember(roomId: string, userId: string) {
    return prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId } },
    });
}

export async function saveSnapshot({
    roomId,
    version,
    data,
}: {
    roomId: string;
    version: number;
    data: Buffer;
}) {
    return prisma.snapshot.create({
        data: { roomId, version, data },
    });
}

export async function getLatestSnapshot(roomId: string) {
    return prisma.snapshot.findFirst({
        where: { roomId },
        orderBy: { version: 'desc' },
    });
}

export async function saveAsset({
    id,
    roomId,
    originalUrl,
    thumbUrl,
    width,
    height,
    sizeBytes,
}: {
    id: string;
    roomId: string;
    originalUrl: string;
    thumbUrl: string;
    width: number;
    height: number;
    sizeBytes: number;
}) {
    return prisma.asset.create({
        data: { id, roomId, originalUrl, thumbUrl, width, height, sizeBytes },
    });
}

// --- M3 additions below --- //
// Append everything below this line to the end of your existing
// web/lib/rooms.ts. Nothing above this line should change - createRoom,
// getRoom, getRoomMember, saveSnapshot, getLatestSnapshot, and saveAsset
// keep their existing names and signatures untouched.

export async function getRoomsForUser(userId: string) {
    return prisma.room.findMany({
        where: { members: { some: { userId } } },
        orderBy: { createdAt: "desc" },
    });
}

export async function addRoomMember({
    roomId,
    userId,
    role,
}: {
    roomId: string;
    userId: string;
    role: string;
}) {
    return prisma.roomMember.create({
        data: { roomId, userId, role },
    });
}
