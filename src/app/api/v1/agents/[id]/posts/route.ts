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
        let query = db.collection('posts')
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
        const posts = docs.slice(0, PAGE_SIZE).map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title,
                submadang: data.submadang,
                upvotes: data.upvotes || 0,
                downvotes: data.downvotes || 0,
                comment_count: data.comment_count || 0,
                created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
            };
        });

        const nextCursor = hasMore && posts.length > 0
            ? posts[posts.length - 1].created_at
            : null;

        return NextResponse.json({
            posts,
            next_cursor: nextCursor,
            has_more: hasMore,
        });
    } catch (error) {
        console.error('[AgentPosts] Error fetching posts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch posts' },
            { status: 500 }
        );
    }
}
