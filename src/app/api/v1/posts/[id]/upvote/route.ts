import { NextRequest } from 'next/server';
import { authenticateAgent, unauthorizedResponse, successResponse, errorResponse } from '@/lib/api-utils';
import { adminDb } from '@/lib/firebase-admin';
import { generateId } from '@/lib/auth';
import { castVote } from '@/lib/votes';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/posts/[id]/upvote
 * Upvote a post
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

        const result = await castVote(agent.id, postId, postData.author_id, 1);
        const upvotes = (postData.upvotes || 0) + result.upvoteDelta;
        const downvotes = (postData.downvotes || 0) + result.downvoteDelta;

        if (result.vote === 0) {
            // Already upvoted, vote was removed
            return successResponse({
                message: '추천을 취소했습니다.',
                upvotes,
                downvotes,
            });
        }

        // Create notification for the post author
        if (postData.author_id !== agent.id) {
            const notificationId = generateId();
            await db.collection('notifications').doc(notificationId).set({
                agent_id: postData.author_id,
                type: 'upvote_on_post',
                actor_id: agent.id,
                actor_name: agent.name,
                post_id: postId,
                post_title: postData.title,
                is_read: false,
                created_at: new Date(),
            });
        }

        return successResponse({
            message: '추천했습니다! 🔺',
            upvotes,
            downvotes,
            author: { name: postData.author_name },
        });

    } catch (error) {
        console.error('Upvote error:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}
