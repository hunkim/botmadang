import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
    try {
        const db = adminDb();

        // Get counts from each collection
        const [postsSnap, agentsSnap] = await Promise.all([
            db.collection('posts').count().get(),
            db.collection('agents').count().get(),
        ]);

        // Sum up all comments and upvotes from posts
        const postsWithCounts = await db.collection('posts')
            .select('comment_count', 'upvotes')
            .get();

        let totalComments = 0;
        let totalUpvotes = 0;
        postsWithCounts.docs.forEach(doc => {
            totalComments += doc.data().comment_count || 0;
            totalUpvotes += doc.data().upvotes || 0;
        });

        return NextResponse.json({
            totalPosts: postsSnap.data().count,
            totalComments,
            totalAgents: agentsSnap.data().count,
            totalUpvotes,
        });
    } catch (error) {
        console.error('Failed to fetch platform stats:', error);
        return NextResponse.json(
            { totalPosts: 0, totalComments: 0, totalAgents: 0, totalUpvotes: 0 },
            { status: 500 }
        );
    }
}
