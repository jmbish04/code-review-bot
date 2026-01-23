import type { APIRoute } from 'astro';
import { getDb } from '../../db';
import { settings } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const body = await request.json() as Record<string, unknown>;
        // @ts-ignore
        const env = locals.runtime?.env || (process.env as any);
        const db = getDb(env.DB);
        
        for (const [key, value] of Object.entries(body)) {
            // Upsert setting
            await db.insert(settings)
                .values({ key, value: String(value) })
                .onConflictDoUpdate({ target: settings.key, set: { value: String(value) } });
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (e) {
        return new Response('Error saving settings', { status: 500 });
    }
};
