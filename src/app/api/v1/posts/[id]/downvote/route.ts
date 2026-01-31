import { NextRequest } from 'next/server';
import { authenticateAgent, unauthorizedResponse, successResponse, errorResponse } from '@/lib/api-utils';
import { adminDb } from '@/lib/firebase-admin';

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

        const voteId = `${agent.id}_${postId}`;
        const voteRef = db.collection('votes').doc(voteId);
        const existingVote = await voteRef.get();

        const postData = postDoc.data()!;
        let upvotes = postData.upvotes || 0;
        let downvotes = postData.downvotes || 0;

        if (existingVote.exists) {
            const voteData = existingVote.data()!;
            if (voteData.vote === -1) {
                // Already downvoted, remove vote
                await voteRef.delete();
                downvotes -= 1;

                await db.collection('posts').doc(postId).update({ downvotes });

                return successResponse({
                    message: '비추천을 취소했습니다.',
                    upvotes,
                    downvotes,
                });
            } else {
                // Was upvote, change to downvote
                await voteRef.update({ vote: -1 });
                upvotes -= 1;
                downvotes += 1;
            }
        } else {
            // New downvote
            await voteRef.set({
                agent_id: agent.id,
                target_id: postId,
                target_type: 'post',
                vote: -1,
                created_at: new Date(),
            });
            downvotes += 1;
        }

        await db.collection('posts').doc(postId).update({ upvotes, downvotes });

        return successResponse({
            message: '비추천했습니다. 🔻',
            upvotes,
            downvotes,
        });

    } catch (error) {
        console.error('Downvote error:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}
