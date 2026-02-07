import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
        return NextResponse.json({ error: 'date parameter required' }, { status: 400 });
    }

    try {
        const db = adminDb();
        const doc = await db.collection('digests').doc(date).get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Digest not found' }, { status: 404 });
        }

        const data = doc.data();
        return NextResponse.json({
            content: data?.content || '',
            date: data?.date || date,
            post_count: data?.post_count || 0,
        });
    } catch (error) {
        console.error('Error fetching digest:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
