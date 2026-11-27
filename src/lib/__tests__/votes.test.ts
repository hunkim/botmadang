import { adminDb } from '@/lib/firebase-admin';
import { castVote } from '@/lib/votes';

jest.mock('@/lib/firebase-admin', () => ({ adminDb: jest.fn() }));
jest.mock('firebase-admin/firestore', () => ({
    FieldValue: { increment: (n: number) => ({ __increment: n }) },
}));

type Doc = Record<string, unknown>;

/**
 * Minimal in-memory Firestore: enough to run castVote and apply increments
 */
function createFakeDb(initial: Record<string, Doc>) {
    const store = new Map<string, Doc>(Object.entries(initial));

    const ref = (path: string) => ({
        path,
        get: async () => ({ exists: store.has(path), data: () => store.get(path) }),
    });

    const applyUpdate = (path: string, fields: Doc) => {
        const doc = { ...(store.get(path) || {}) };
        for (const [key, value] of Object.entries(fields)) {
            const inc = (value as { __increment?: number })?.__increment;
            doc[key] = inc !== undefined ? ((doc[key] as number) || 0) + inc : value;
        }
        store.set(path, doc);
    };

    const tx = {
        get: async (r: { path: string }) => ({ exists: store.has(r.path), data: () => store.get(r.path) }),
        set: (r: { path: string }, data: Doc) => store.set(r.path, data),
        update: (r: { path: string }, fields: Doc) => applyUpdate(r.path, fields),
        delete: (r: { path: string }) => store.delete(r.path),
    };

    return {
        store,
        db: {
            collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
            runTransaction: async <T>(fn: (t: typeof tx) => Promise<T>) => fn(tx),
        },
    };
}

describe('castVote', () => {
    let store: Map<string, Doc>;

    beforeEach(() => {
        const fake = createFakeDb({
            'posts/p1': { author_id: 'author', upvotes: 0, downvotes: 0 },
            'agents/author': { karma: 0 },
        });
        store = fake.store;
        (adminDb as jest.Mock).mockReturnValue(fake.db);
    });

    const post = () => store.get('posts/p1') as { upvotes: number; downvotes: number };
    const karma = () => (store.get('agents/author') as { karma: number }).karma;

    it('adds a new upvote and gives the author karma', async () => {
        const result = await castVote('voter', 'p1', 'author', 1);

        expect(result).toEqual({ vote: 1, upvoteDelta: 1, downvoteDelta: 0 });
        expect(post()).toMatchObject({ upvotes: 1, downvotes: 0 });
        expect(karma()).toBe(1);
        expect(store.get('votes/voter_p1')).toMatchObject({ vote: 1, target_id: 'p1' });
    });

    it('removes the vote and the karma when upvoting twice', async () => {
        await castVote('voter', 'p1', 'author', 1);
        const result = await castVote('voter', 'p1', 'author', 1);

        expect(result).toEqual({ vote: 0, upvoteDelta: -1, downvoteDelta: 0 });
        expect(post()).toMatchObject({ upvotes: 0, downvotes: 0 });
        expect(karma()).toBe(0);
        expect(store.has('votes/voter_p1')).toBe(false);
    });

    it('switches an upvote to a downvote', async () => {
        await castVote('voter', 'p1', 'author', 1);
        const result = await castVote('voter', 'p1', 'author', -1);

        expect(result).toEqual({ vote: -1, upvoteDelta: -1, downvoteDelta: 1 });
        expect(post()).toMatchObject({ upvotes: 0, downvotes: 1 });
        expect(karma()).toBe(0);
    });

    it('does not let vote flipping farm karma', async () => {
        for (let i = 0; i < 5; i++) {
            await castVote('voter', 'p1', 'author', -1);
            await castVote('voter', 'p1', 'author', 1);
        }

        expect(post()).toMatchObject({ upvotes: 1, downvotes: 0 });
        expect(karma()).toBe(1);
    });

    it('gives no karma for voting on your own post', async () => {
        await castVote('author', 'p1', 'author', 1);

        expect(post()).toMatchObject({ upvotes: 1 });
        expect(karma()).toBe(0);
    });

    it('skips karma when the author no longer exists', async () => {
        store.delete('agents/author');

        await castVote('voter', 'p1', 'author', 1);

        expect(post()).toMatchObject({ upvotes: 1 });
        expect(store.has('agents/author')).toBe(false);
    });
});
