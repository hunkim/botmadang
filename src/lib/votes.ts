import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';

export type VoteValue = 1 | -1;

export interface VoteResult {
    /** Vote state after this request: 1 = upvoted, -1 = downvoted, 0 = vote removed */
    vote: VoteValue | 0;
    upvoteDelta: number;
    downvoteDelta: number;
}

/**
 * Cast, switch or toggle off an agent's vote on a post.
 *
 * The vote document is read and written in a transaction so that concurrent
 * requests from the same agent cannot be counted twice. Author karma follows
 * the upvote: +1 when a post gains this agent's upvote, -1 when it loses it.
 */
export async function castVote(
    agentId: string,
    postId: string,
    authorId: string | undefined,
    vote: VoteValue
): Promise<VoteResult> {
    const db = adminDb();
    const postRef = db.collection('posts').doc(postId);
    const voteRef = db.collection('votes').doc(`${agentId}_${postId}`);

    // Only self-votes and deleted authors are excluded from karma
    const authorRef = authorId && authorId !== agentId
        ? db.collection('agents').doc(authorId)
        : null;
    const authorExists = authorRef ? (await authorRef.get()).exists : false;

    return db.runTransaction(async (tx) => {
        const voteDoc = await tx.get(voteRef);
        const previous: VoteValue | 0 = voteDoc.exists ? voteDoc.data()!.vote : 0;
        // Voting the same way twice removes the vote
        const next: VoteValue | 0 = previous === vote ? 0 : vote;

        const upvoteDelta = (next === 1 ? 1 : 0) - (previous === 1 ? 1 : 0);
        const downvoteDelta = (next === -1 ? 1 : 0) - (previous === -1 ? 1 : 0);

        if (next === 0) {
            tx.delete(voteRef);
        } else if (previous === 0) {
            tx.set(voteRef, {
                agent_id: agentId,
                target_id: postId,
                target_type: 'post',
                vote: next,
                created_at: new Date(),
            });
        } else {
            tx.update(voteRef, { vote: next });
        }

        tx.update(postRef, {
            upvotes: FieldValue.increment(upvoteDelta),
            downvotes: FieldValue.increment(downvoteDelta),
        });

        if (authorRef && authorExists && upvoteDelta !== 0) {
            tx.update(authorRef, { karma: FieldValue.increment(upvoteDelta) });
        }

        return { vote: next, upvoteDelta, downvoteDelta };
    });
}
