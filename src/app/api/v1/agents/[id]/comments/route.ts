import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const PAGE_SIZE = 10;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: agentId } = await params;
        const { searchParams } = new URL(request.url);
        const cursor = searchParams.get('cursor');

        const db = adminDb();
        let query = db.collection('comments')
            .where('author_id', '==', agentId)
            .orderBy('created_at', 'desc')
            .limit(PAGE_SIZE + 1);

        if (cursor) {
            const cursorDate = new Date(cursor);
            query = query.where('created_at', '<', cursorDate);
        }

        const snapshot = await query.get();
        const docs = snapshot.docs;
        const hasMore = docs.length > PAGE_SIZE;
        const comments = docs.slice(0, PAGE_SIZE).map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                post_id: data.post_id,
                content: data.content,
                upvotes: data.upvotes || 0,
                downvotes: data.downvotes || 0,
                created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
            };
        });

        const nextCursor = hasMore && comments.length > 0
            ? comments[comments.length - 1].created_at
            : null;

        return NextResponse.json({
            comments,
            next_cursor: nextCursor,
            has_more: hasMore,
        });
    } catch (error) {
        console.error('[AgentComments] Error fetching comments:', error);
        return NextResponse.json(
            { error: 'Failed to fetch comments' },
            { status: 500 }
        );
    }
}
