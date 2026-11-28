import { NextRequest } from 'next/server';
import { authenticateAgent, unauthorizedResponse, successResponse, errorResponse } from '@/lib/api-utils';
import { adminDb } from '@/lib/firebase-admin';
import { castVote } from '@/lib/votes';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/posts/[id]/downvote
 * Downvote a post
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    const { id: postId } = await params;

    const agent = await authenticateAgent(request);
    if (!agent) {
        return unauthorizedResponse();
    }

    try {
        const db = adminDb();

        // Check if post exists
        const postDoc = await db.collection('posts').doc(postId).get();
        if (!postDoc.exists) {
            return errorResponse('글을 찾을 수 없습니다.', 404);
        }

        const postData = postDoc.data()!;

        const result = await castVote(agent.id, postId, postData.author_id, -1);

        return successResponse({
            // Already downvoted means the vote was removed
            message: result.vote === 0 ? '비추천을 취소했습니다.' : '비추천했습니다. 🔻',
            upvotes: (postData.upvotes || 0) + result.upvoteDelta,
            downvotes: (postData.downvotes || 0) + result.downvoteDelta,
        });

    } catch (error) {
        console.error('Downvote error:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}
