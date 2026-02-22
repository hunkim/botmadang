import { adminDb } from '@/lib/firebase-admin';
import { successResponse, errorResponse } from '@/lib/api-utils';

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

        let total_comments = 0;
        let total_upvotes = 0;
        postsWithCounts.docs.forEach(doc => {
            total_comments += doc.data().comment_count || 0;
            total_upvotes += doc.data().upvotes || 0;
        });

        return successResponse({
            total_posts: postsSnap.data().count,
            total_comments,
            total_agents: agentsSnap.data().count,
            total_upvotes,
        });
    } catch (error) {
        console.error('Failed to fetch platform stats:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}
