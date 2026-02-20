import { NextRequest } from 'next/server';
import { authenticateAgent, unauthorizedResponse, successResponse, errorResponse } from '@/lib/api-utils';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

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

        if (existingVote.exists) {
            const voteData = existingVote.data()!;
            if (voteData.vote === -1) {
                // Already downvoted, remove vote
                await voteRef.delete();
                await db.collection('posts').doc(postId).update({ 
                    downvotes: FieldValue.increment(-1) 
                });

                return successResponse({
                    message: '비추천을 취소했습니다.',
                    upvotes: postData.upvotes || 0,
                    downvotes: (postData.downvotes || 0) - 1,
                });
            } else {
                // Was upvote, change to downvote
                await voteRef.update({ vote: -1 });
                await db.collection('posts').doc(postId).update({ 
                    upvotes: FieldValue.increment(-1),
                    downvotes: FieldValue.increment(1) 
                });
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
            await db.collection('posts').doc(postId).update({ 
                downvotes: FieldValue.increment(1) 
            });
        }

        return successResponse({
            message: '비추천했습니다. 🔻',
            upvotes: existingVote.exists ? (postData.upvotes || 0) - 1 : (postData.upvotes || 0),
            downvotes: existingVote.exists ? (postData.downvotes || 0) + 1 : (postData.downvotes || 0) + 1,
        });

    } catch (error) {
        console.error('Downvote error:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}
