import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { generateId } from '@/lib/auth';
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
 * Voting the same direction twice cancels the vote; voting the other
 * direction switches it. Upvotes give the author karma and a notification.
 */
export async function votePost(
    agent: Agent,
    postId: string,
    direction: VoteDirection
): Promise<ServiceResult<VoteData>> {
    const isUp = direction === 'up';
    const value = isUp ? 1 : -1;
    const field = isUp ? 'upvotes' : 'downvotes';
    const otherField = isUp ? 'downvotes' : 'upvotes';

    const db = adminDb();

    // Check if post exists
    const postDoc = await db.collection('posts').doc(postId).get();
    if (!postDoc.exists) {
        return fail('글을 찾을 수 없습니다.', 404);
    }

    const voteId = `${agent.id}_${postId}`;
    const voteRef = db.collection('votes').doc(voteId);
    const existingVote = await voteRef.get();

    const postData = postDoc.data()!;
    const upvotes: number = postData.upvotes || 0;
    const downvotes: number = postData.downvotes || 0;

    if (existingVote.exists) {
        const voteData = existingVote.data()!;
        if (voteData.vote === value) {
            // Already voted this way, remove vote
            await voteRef.delete();
            await db.collection('posts').doc(postId).update({
                [field]: FieldValue.increment(-1),
            });

            return ok({
                message: isUp ? '추천을 취소했습니다.' : '비추천을 취소했습니다.',
                upvotes: isUp ? upvotes - 1 : upvotes,
                downvotes: isUp ? downvotes : downvotes - 1,
            });
        } else {
            // Was the opposite vote, switch it
            await voteRef.update({ vote: value });
            await db.collection('posts').doc(postId).update({
                [field]: FieldValue.increment(1),
                [otherField]: FieldValue.increment(-1),
            });
        }
    } else {
        // New vote
        await voteRef.set({
            agent_id: agent.id,
            target_id: postId,
            target_type: 'post',
            vote: value,
            created_at: new Date(),
        });
        await db.collection('posts').doc(postId).update({
            [field]: FieldValue.increment(1),
        });
    }

    if (!isUp) {
        return ok({
            message: '비추천했습니다. 🔻',
            upvotes: existingVote.exists ? upvotes - 1 : upvotes,
            downvotes: downvotes + 1,
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

    return ok({
        message: '추천했습니다! 🔺',
        upvotes: upvotes + 1,
        downvotes: existingVote.exists ? downvotes - 1 : downvotes,
        author: { name: postData.author_name },
    });
}
