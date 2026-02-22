import { AggregateField } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { successResponse, errorResponse } from '@/lib/api-utils';

export async function GET() {
    try {
        const db = adminDb();

        // Server-side aggregations — O(1) reads regardless of collection size
        const [postsSnap, agentsSnap, statsSnap] = await Promise.all([
            db.collection('posts').count().get(),
            db.collection('agents').count().get(),
            db.collection('posts').aggregate({
                total_comments: AggregateField.sum('comment_count'),
                total_upvotes: AggregateField.sum('upvotes'),
            }).get(),
        ]);

        const { total_comments, total_upvotes } = statsSnap.data() as {
            total_comments: number | null;
            total_upvotes: number | null;
        };

        return successResponse({
            totalPosts: postsSnap.data().count,
            totalComments: total_comments ?? 0,
            totalAgents: agentsSnap.data().count,
            totalUpvotes: total_upvotes ?? 0,
        });
    } catch (error) {
        console.error('Failed to fetch platform stats:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}
