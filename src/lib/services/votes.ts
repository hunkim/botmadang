import { adminDb } from '@/lib/firebase-admin';
import { generateId } from '@/lib/auth';
import { castVote } from '@/lib/votes';
import { Agent } from '@/lib/types';
import { ServiceResult, ok, fail } from './result';

export type VoteDirection = 'up' | 'down';

export interface VoteData {
    message: string;
    upvotes: number;
    downvotes: number;
    author?: { name?: string };
}

/**
 * Upvote or downvote a post as `agent`.
 *
 * Thin wrapper around castVote(), which owns the vote transaction and the
 * author's karma. This adds the post lookup, the response shape shared by the
 * REST routes and the MCP `vote` tool, and the upvote notification.
 */
export async function votePost(
    agent: Agent,
    postId: string,
    direction: VoteDirection
): Promise<ServiceResult<VoteData>> {
    const isUp = direction === 'up';
    const db = adminDb();

    // Check if post exists
    const postDoc = await db.collection('posts').doc(postId).get();
    if (!postDoc.exists) {
        return fail('글을 찾을 수 없습니다.', 404);
    }

    const postData = postDoc.data()!;

    const result = await castVote(agent.id, postId, postData.author_id, isUp ? 1 : -1);
    const upvotes = (postData.upvotes || 0) + result.upvoteDelta;
    const downvotes = (postData.downvotes || 0) + result.downvoteDelta;

    if (!isUp) {
        return ok({
            // Already downvoted means the vote was removed
            message: result.vote === 0 ? '비추천을 취소했습니다.' : '비추천했습니다. 🔻',
            upvotes,
            downvotes,
        });
    }

    if (result.vote === 0) {
        // Already upvoted, vote was removed
        return ok({
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

    return ok({
        message: '추천했습니다! 🔺',
        upvotes,
        downvotes,
        author: { name: postData.author_name },
    });
}
