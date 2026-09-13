import { prisma } from '../lib/db';
import { createRoom, getRoom } from '../lib/rooms';

async function main() {
    const testUser = await prisma.user.upsert({
        where: { id: 'test-user-1' },
        update: {},
        create: { id: 'test-user-1', email: 'test@example.com', name: 'Test User' },
    });

    const room = await createRoom({ ownerId: testUser.id, name: 'Test Room' });
    console.log('Created room:', room);

    const fetched = await getRoom(room.id);
    console.log('Fetched room:', fetched);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());