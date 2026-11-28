import { FakeFirestore, FakeFieldValue } from './helpers/fake-firestore';

const db = new FakeFirestore();

jest.mock('@/lib/firebase-admin', () => ({ adminDb: () => db }));
jest.mock('firebase-admin/firestore', () => ({ FieldValue: FakeFieldValue }));

import { cache } from '@/lib/cache';
import { Agent } from '@/lib/types';
import { listPosts, getPost, createPost } from '@/lib/services/posts';
import { listComments, createComment } from '@/lib/services/comments';
import { votePost } from '@/lib/services/votes';
import { listNotifications, markNotificationsRead } from '@/lib/services/notifications';
import { registerAgent } from '@/lib/services/agents';

const MINUTE = 60 * 1000;

function makeAgent(id: string, overrides: Partial<Agent> = {}): Agent {
    const agent: Agent = {
        id,
        name: `봇_${id}`,
        description: '테스트 봇',
        api_key_hash: 'hash',
        is_claimed: true,
        karma: 0,
        created_at: new Date(),
        last_active: new Date(),
        ...overrides,
    };
    db.seed('agents', id, { name: agent.name, karma: agent.karma });
    return agent;
}

function seedPost(id: string, overrides: Record<string, unknown> = {}) {
    db.seed('posts', id, {
        title: `글 ${id}`,
        content: '안녕하세요, 본문입니다.',
        submadang: 'general',
        author_id: 'author',
        author_name: '글쓴이',
        upvotes: 0,
        downvotes: 0,
        comment_count: 0,
        created_at: new Date(Date.now() - 60 * MINUTE),
        ...overrides,
    });
}

beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    db.reset();
    cache.clear();
    db.seed('submadangs', 'general', { display_name: '자유마당' });
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('posts service', () => {
    it('lists posts newest first with cursor pagination', async () => {
        for (let i = 1; i <= 3; i++) {
            seedPost(`p${i}`, { created_at: new Date(Date.now() - i * MINUTE) });
        }

        const first = await listPosts({ sort: 'new', limit: 2 });
        expect(first.posts.map(p => p.id)).toEqual(['p1', 'p2']);
        expect(first.has_more).toBe(true);
        expect(first.next_cursor).toBe('p2');

        const second = await listPosts({ sort: 'new', limit: 2, cursor: first.next_cursor });
        expect(second.posts.map(p => p.id)).toEqual(['p3']);
        expect(second.has_more).toBe(false);
    });

    it('serves repeated list and single-post reads from cache', async () => {
        seedPost('p1');

        await listPosts({ sort: 'new' });
        await getPost('p1');
        const readsAfterFirst = db.reads;

        await listPosts({ sort: 'new' });
        await getPost('p1');
        expect(db.reads).toBe(readsAfterFirst);
    });

    it('returns null for a missing post', async () => {
        expect(await getPost('nope')).toBeNull();
    });

    it('creates a post, bumps karma and invalidates the list cache', async () => {
        const agent = makeAgent('a1');
        await listPosts({ sort: 'new' });

        const result = await createPost(agent, { submadang: 'general', title: '첫 글입니다', content: '반갑습니다 여러분' });

        expect(result.ok).toBe(true);
        expect(result.status).toBe(201);
        expect(db.peek('agents', 'a1')?.karma).toBe(1);

        const feed = await listPosts({ sort: 'new' });
        expect(feed.posts.map(p => p.title)).toContain('첫 글입니다');
    });

    it('rejects non-Korean titles and content', async () => {
        const agent = makeAgent('a1');

        const title = await createPost(agent, { submadang: 'general', title: 'Hello world', content: '본문' });
        expect(title).toMatchObject({ ok: false, status: 400 });

        const content = await createPost(agent, { submadang: 'general', title: '제목', content: 'English only body' });
        expect(content).toMatchObject({ ok: false, status: 400 });

        expect(db.all('posts')).toHaveLength(0);
    });

    it('requires content or url, and an existing madang', async () => {
        const agent = makeAgent('a1');

        expect(await createPost(agent, { submadang: 'general', title: '제목만' }))
            .toMatchObject({ ok: false, status: 400 });
        expect(await createPost(agent, { submadang: 'nowhere', title: '제목', content: '본문입니다' }))
            .toMatchObject({ ok: false, status: 404 });
    });

    it('enforces one post per 3 minutes', async () => {
        const agent = makeAgent('a1');

        const first = await createPost(agent, { submadang: 'general', title: '첫 번째 글', content: '첫 번째 내용' });
        expect(first.ok).toBe(true);

        const second = await createPost(agent, { submadang: 'general', title: '두 번째 글', content: '두 번째 내용' });
        expect(second).toMatchObject({ ok: false, status: 429, error: '너무 자주 글을 작성하고 있습니다.' });
    });

    it('blocks a duplicate title within 24 hours', async () => {
        const agent = makeAgent('a1');
        seedPost('old', { author_id: 'a1', title: '같은 제목', created_at: new Date(Date.now() - 10 * MINUTE) });

        const result = await createPost(agent, { submadang: 'general', title: '같은 제목', content: '다른 내용입니다' });
        expect(result).toMatchObject({ ok: false, status: 429 });
    });

    it('refuses unclaimed agents', async () => {
        const agent = makeAgent('a1', { is_claimed: false });
        const result = await createPost(agent, { submadang: 'general', title: '제목', content: '본문입니다' });
        expect(result).toMatchObject({ ok: false, status: 403 });
    });
});

describe('comments service', () => {
    it('threads replies under their parent and caches the result', async () => {
        seedPost('p1');
        db.seed('comments', 'c1', { post_id: 'p1', content: '댓글', author_id: 'x', author_name: '엑스', upvotes: 2 });
        db.seed('comments', 'c2', { post_id: 'p1', parent_id: 'c1', content: '답글', author_id: 'y', author_name: '와이' });

        const thread = await listComments('p1');
        expect(thread.count).toBe(2);
        expect(thread.comments).toHaveLength(1);
        expect(thread.comments[0].replies?.[0].id).toBe('c2');

        const reads = db.reads;
        await listComments('p1');
        expect(db.reads).toBe(reads);
    });

    it('creates a comment, updates counters and notifies the post author', async () => {
        const agent = makeAgent('a1');
        seedPost('p1');

        const result = await createComment(agent, 'p1', { content: '좋은 글이네요!' });

        expect(result.ok).toBe(true);
        expect(db.peek('posts', 'p1')?.comment_count).toBe(1);
        expect(db.peek('agents', 'a1')?.karma).toBe(1);
        expect(db.all('notifications')).toEqual([
            expect.objectContaining({ agent_id: 'author', type: 'comment_on_post', actor_id: 'a1', is_read: false }),
        ]);
    });

    it('notifies the parent comment author on a reply', async () => {
        const agent = makeAgent('a1');
        seedPost('p1');
        db.seed('comments', 'c1', { post_id: 'p1', content: '댓글', author_id: 'commenter', author_name: '댓글러' });

        const result = await createComment(agent, 'p1', { content: '답글 남겨요', parent_id: 'c1' });

        expect(result.ok).toBe(true);
        expect(db.all('notifications')).toEqual([
            expect.objectContaining({ agent_id: 'commenter', type: 'reply_to_comment' }),
        ]);
    });

    it('enforces one comment per 10 seconds', async () => {
        const agent = makeAgent('a1');
        seedPost('p1');

        expect((await createComment(agent, 'p1', { content: '첫 댓글이에요' })).ok).toBe(true);
        expect(await createComment(agent, 'p1', { content: '바로 또 댓글이에요' }))
            .toMatchObject({ ok: false, status: 429 });
    });

    it('rejects non-Korean content, missing posts and missing parents', async () => {
        const agent = makeAgent('a1');
        seedPost('p1');

        expect(await createComment(agent, 'p1', { content: 'nice post' })).toMatchObject({ ok: false, status: 400 });
        expect(await createComment(agent, 'nope', { content: '댓글이에요' })).toMatchObject({ ok: false, status: 404 });
        expect(await createComment(agent, 'p1', { content: '댓글이에요', parent_id: 'nope' }))
            .toMatchObject({ ok: false, status: 404 });
    });
});

describe('votes service', () => {
    it('upvotes: counts, author karma and notification', async () => {
        const agent = makeAgent('a1');
        makeAgent('author');
        seedPost('p1');

        const result = await votePost(agent, 'p1', 'up');

        expect(result).toMatchObject({ ok: true, data: { upvotes: 1, downvotes: 0 } });
        expect(db.peek('posts', 'p1')).toMatchObject({ upvotes: 1, downvotes: 0 });
        expect(db.peek('agents', 'author')?.karma).toBe(1);
        expect(db.all('notifications')).toEqual([
            expect.objectContaining({ agent_id: 'author', type: 'upvote_on_post' }),
        ]);
    });

    it('cancels a repeated vote', async () => {
        const agent = makeAgent('a1');
        seedPost('p1');

        await votePost(agent, 'p1', 'up');
        const result = await votePost(agent, 'p1', 'up');

        expect(result).toMatchObject({ ok: true, data: { message: '추천을 취소했습니다.' } });
        expect(db.peek('posts', 'p1')).toMatchObject({ upvotes: 0 });
        expect(db.all('votes')).toHaveLength(0);
    });

    it('switches an upvote to a downvote', async () => {
        const agent = makeAgent('a1');
        seedPost('p1');

        await votePost(agent, 'p1', 'up');
        const result = await votePost(agent, 'p1', 'down');

        expect(result).toMatchObject({ ok: true, data: { upvotes: 0, downvotes: 1 } });
        expect(db.peek('posts', 'p1')).toMatchObject({ upvotes: 0, downvotes: 1 });
        expect(db.all('votes')).toEqual([expect.objectContaining({ vote: -1 })]);
    });

    it('returns 404 for a missing post', async () => {
        expect(await votePost(makeAgent('a1'), 'nope', 'up')).toMatchObject({ ok: false, status: 404 });
    });
});

describe('notifications service', () => {
    function seedNotification(id: string, overrides: Record<string, unknown> = {}) {
        db.seed('notifications', id, {
            agent_id: 'a1',
            type: 'comment_on_post',
            actor_id: 'x',
            actor_name: '엑스',
            post_id: 'p1',
            is_read: false,
            created_at: new Date(Date.now() - 5 * MINUTE),
            ...overrides,
        });
    }

    it('returns only the agent\'s notifications, newest first', async () => {
        seedNotification('n1', { created_at: new Date(Date.now() - 3 * MINUTE) });
        seedNotification('n2', { created_at: new Date(Date.now() - 1 * MINUTE), is_read: true });
        seedNotification('other', { agent_id: 'someone-else' });

        const page = await listNotifications('a1');
        expect(page.notifications.map(n => n.id)).toEqual(['n2', 'n1']);
        expect(page.unread_count).toBe(1);

        const unread = await listNotifications('a1', { unreadOnly: true });
        expect(unread.notifications.map(n => n.id)).toEqual(['n1']);
    });

    it('caps Firestore reads with fetchLimit and marks notifications read', async () => {
        for (let i = 0; i < 30; i++) seedNotification(`n${i}`);

        const page = await listNotifications('a1', { unreadOnly: true, limit: 20, fetchLimit: 20 });
        expect(page.notifications).toHaveLength(20);
        expect(db.reads).toBe(20);

        await markNotificationsRead(page.notifications.map(n => n.id));
        expect(db.reads).toBe(20);
        expect(db.all('notifications').filter(n => !n.is_read)).toHaveLength(10);
    });
});

describe('agents service', () => {
    it('registers an unclaimed agent without an API key', async () => {
        const result = await registerAgent({ name: '새로운봇', description: '한국어로 소개하는 봇입니다' });

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.status).toBe(201);
        expect(result.data.agent.claim_url).toMatch(/\/claim\/madang-[A-Z0-9]{8}$/);
        expect(db.peek('agents', result.data.agent.id)).toMatchObject({ is_claimed: false, api_key_hash: null });
    });

    it('rejects bad names, non-Korean descriptions and duplicates', async () => {
        expect(await registerAgent({ name: 'a!', description: '소개입니다' })).toMatchObject({ ok: false, status: 400 });
        expect(await registerAgent({ name: 'goodname', description: 'english only' })).toMatchObject({ ok: false, status: 400 });

        db.seed('agents', 'taken', { name: '이미있는봇' });
        expect(await registerAgent({ name: '이미있는봇', description: '소개입니다' })).toMatchObject({ ok: false, status: 409 });
    });
});

describe('behaviour carried over from main', () => {
    it('applies length limits to posts and comments', async () => {
        const agent = makeAgent('a1');
        seedPost('p1');

        expect(await createPost(agent, { submadang: 'general', title: '가'.repeat(301), content: '본문입니다' }))
            .toMatchObject({ ok: false, status: 400, error: '제목은 300자 이하로 입력해주세요.' });
        expect(await createPost(agent, { submadang: 'general', title: '제목입니다', content: '가'.repeat(40001) }))
            .toMatchObject({ ok: false, status: 400 });
        expect(await createPost(agent, { submadang: 'general', title: '제목입니다', url: `https://example.com/${'a'.repeat(2048)}` }))
            .toMatchObject({ ok: false, status: 400, error: '유효하지 않은 URL입니다.' });
        expect(await createComment(agent, 'p1', { content: '가'.repeat(10001) }))
            .toMatchObject({ ok: false, status: 400, error: '댓글은 10000자 이하로 입력해주세요.' });

        expect(db.all('posts')).toHaveLength(1);
        expect(db.all('comments')).toHaveLength(0);
    });

    it('increments post karma from the stored value, not the request snapshot', async () => {
        const agent = makeAgent('a1', { karma: 0 });
        db.seed('agents', 'a1', { name: agent.name, karma: 7 });

        await createPost(agent, { submadang: 'general', title: '카르마 확인 글', content: '본문입니다' });
        expect(db.peek('agents', 'a1')?.karma).toBe(8);
    });

    it('takes author karma back when an upvote is cancelled or switched', async () => {
        const agent = makeAgent('a1');
        makeAgent('author');
        seedPost('p1');

        await votePost(agent, 'p1', 'up');
        expect(db.peek('agents', 'author')?.karma).toBe(1);

        await votePost(agent, 'p1', 'down');
        expect(db.peek('agents', 'author')?.karma).toBe(0);
        expect(db.peek('posts', 'p1')).toMatchObject({ upvotes: 0, downvotes: 1 });
    });
});
