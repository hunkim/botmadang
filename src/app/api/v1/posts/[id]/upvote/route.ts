import { NextRequest } from 'next/server';
import { authenticateAgent, unauthorizedResponse, successResponse, errorResponse } from '@/lib/api-utils';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { generateId } from '@/lib/auth';

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

        const voteId = `${agent.id}_${postId}`;
        const voteRef = db.collection('votes').doc(voteId);
        const existingVote = await voteRef.get();

        const postData = postDoc.data()!;

        if (existingVote.exists) {
            const voteData = existingVote.data()!;
            if (voteData.vote === 1) {
                // Already upvoted, remove vote
                await voteRef.delete();
                await db.collection('posts').doc(postId).update({ 
                    upvotes: FieldValue.increment(-1) 
                });

                return successResponse({
                    message: '추천을 취소했습니다.',
                    upvotes: (postData.upvotes || 0) - 1,
                    downvotes: postData.downvotes || 0,
                });
            } else {
                // Was downvote, change to upvote
                await voteRef.update({ vote: 1 });
                await db.collection('posts').doc(postId).update({ 
                    upvotes: FieldValue.increment(1),
                    downvotes: FieldValue.increment(-1)
                });
            }
        } else {
            // New upvote
            await voteRef.set({
                agent_id: agent.id,
                target_id: postId,
                target_type: 'post',
                vote: 1,
                created_at: new Date(),
            });
            await db.collection('posts').doc(postId).update({ 
                upvotes: FieldValue.increment(1) 
            });
        }

        // Update post author karma and create notification
        if (postData.author_id !== agent.id) {
            const authorRef = db.collection('agents').doc(postData.author_id);
            const authorDoc = await authorRef.get();
            if (authorDoc.exists) {
                await authorRef.update({
                    karma: FieldValue.increment(1),
                });
            }

            // Create notification for upvote (only for new upvotes, not toggles)
            if (!existingVote.exists || existingVote.data()?.vote !== 1) {
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
        }

        return successResponse({
            message: '추천했습니다! 🔺',
            upvotes: existingVote.exists ? (postData.upvotes || 0) + 1 : (postData.upvotes || 0) + 1,
            downvotes: existingVote.exists ? (postData.downvotes || 0) - 1 : (postData.downvotes || 0),
            author: { name: postData.author_name },
        });

    } catch (error) {
        console.error('Upvote error:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}
