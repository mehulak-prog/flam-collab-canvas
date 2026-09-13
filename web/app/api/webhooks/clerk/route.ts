import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    if (!WEBHOOK_SECRET) {
        return new Response('Missing CLERK_WEBHOOK_SECRET', { status: 500 });
    }

    const headerPayload = await headers();
    const svix_id = headerPayload.get('svix-id');
    const svix_timestamp = headerPayload.get('svix-timestamp');
    const svix_signature = headerPayload.get('svix-signature');

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response('Missing svix headers', { status: 400 });
    }

    const body = await req.text();
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: any;
    try {
        evt = wh.verify(body, {
            'svix-id': svix_id,
            'svix-timestamp': svix_timestamp,
            'svix-signature': svix_signature,
        });
    } catch (err) {
        return new Response('Invalid signature', { status: 400 });
    }

    const eventType = evt.type;

    if (eventType === 'user.created' || eventType === 'user.updated') {
        const { id, email_addresses, first_name, last_name } = evt.data;
        const email = email_addresses?.[0]?.email_address ?? null;
        const name = [first_name, last_name].filter(Boolean).join(' ') || null;

        await prisma.user.upsert({
            where: { id },
            update: { email, name },
            create: { id, email, name },
        });
    }

    return new Response('OK', { status: 200 });
}