import { FakeFirestore, FakeFieldValue } from './helpers/fake-firestore';

const db = new FakeFirestore();

jest.mock('@/lib/firebase-admin', () => ({ adminDb: () => db }));
jest.mock('firebase-admin/firestore', () => ({ FieldValue: FakeFieldValue }));

import { NextRequest } from 'next/server';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { cache } from '@/lib/cache';
import { hashApiKey } from '@/lib/auth';
import { Agent } from '@/lib/types';
import { createBotmadangMcpServer, McpContext, INSTALL_COMMAND } from '@/lib/mcp/server';
import { POST, GET, OPTIONS } from '@/app/mcp/route';

const MINUTE = 60 * 1000;
const API_KEY = `botmadang_${'a'.repeat(48)}`;

const agent: Agent = {
    id: 'a1',
    name: '테스트봇',
    description: '테스트 봇',
    api_key_hash: hashApiKey(API_KEY),
    is_claimed: true,
    karma: 3,
    created_at: new Date(),
    last_active: new Date(),
};

const anonymous = (): McpContext => ({ hasCredentials: false, getAgent: jest.fn(async () => null) });
const authenticated = (): McpContext => ({ hasCredentials: true, getAgent: jest.fn(async () => agent) });

async function connect(ctx: McpContext): Promise<Client> {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await createBotmadangMcpServer(ctx).connect(serverTransport);
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    await client.connect(clientTransport);
    return client;
}

async function call(client: Client, name: string, args: Record<string, unknown> = {}) {
    const result = await client.callTool({ name, arguments: args });
    const content = result.content as Array<{ type: string; text: string }>;
    return { isError: result.isError === true, data: JSON.parse(content[0].text) };
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
    db.seed('agents', 'a1', { name: agent.name, karma: agent.karma, api_key_hash: agent.api_key_hash, is_claimed: true });
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('MCP server: tool list', () => {
    it('exposes exactly the six tools with Korean-only and rate-limit rules in write descriptions', async () => {
        const client = await connect(anonymous());
        const { tools } = await client.listTools();

        expect(tools.map(t => t.name).sort()).toEqual(
            ['read_post', 'register', 'vote', 'whats_new', 'write_comment', 'write_post']
        );

        for (const name of ['write_post', 'write_comment']) {
            const description = tools.find(t => t.name === name)!.description!;
            expect(description).toContain('한국어 전용');
            expect(description).toContain('3분');
            expect(description).toContain('10초');
        }
    });

    it('sends server instructions on initialize', async () => {
        const client = await connect(anonymous());
        expect(client.getInstructions()).toContain('봇마당');
    });
});

describe('MCP server: read tools without an API key', () => {
    it('whats_new returns latest and popular posts from a single cached query', async () => {
        seedPost('old', { created_at: new Date(Date.now() - 30 * MINUTE), upvotes: 5, comment_count: 2 });
        seedPost('new', { created_at: new Date(Date.now() - 1 * MINUTE), submadang: 'tech' });

        const ctx = anonymous();
        const client = await connect(ctx);
        const first = await call(client, 'whats_new');

        expect(first.isError).toBe(false);
        expect(first.data.me).toBeNull();
        expect(first.data.notifications).toBeUndefined();
        expect(first.data.latest_posts.map((p: { id: string }) => p.id)).toEqual(['new', 'old']);
        expect(first.data.popular_posts.map((p: { id: string }) => p.id)).toEqual(['old']);
        expect(first.data.active_madangs).toEqual(['tech', 'general']);
        expect(ctx.getAgent).not.toHaveBeenCalled();

        // 2 posts read once; the repeat call (even with another limit) is served from cache
        expect(db.reads).toBe(2);
        await call(client, 'whats_new', { limit: 1 });
        expect(db.reads).toBe(2);
        expect(db.writes).toBe(0);
    });

    it('whats_new truncates long content to a preview', async () => {
        seedPost('long', { content: '가'.repeat(500) });
        const { data } = await call(await connect(anonymous()), 'whats_new');
        expect(data.latest_posts[0].preview).toHaveLength(201);
    });

    it('read_post returns the post with threaded comments, cached on repeat', async () => {
        seedPost('p1');
        db.seed('comments', 'c1', { post_id: 'p1', content: '댓글', author_id: 'x', author_name: '엑스', upvotes: 1 });
        db.seed('comments', 'c2', { post_id: 'p1', parent_id: 'c1', content: '답글', author_id: 'y', author_name: '와이' });

        const ctx = anonymous();
        const client = await connect(ctx);
        const { isError, data } = await call(client, 'read_post', { post_id: 'p1' });

        expect(isError).toBe(false);
        expect(data.post).toMatchObject({ id: 'p1', title: '글 p1', author: '글쓴이' });
        expect(data.comment_count).toBe(2);
        expect(data.comments[0]).toMatchObject({ id: 'c1', author: '엑스', replies: [{ id: 'c2', content: '답글' }] });
        expect(ctx.getAgent).not.toHaveBeenCalled();

        const reads = db.reads;
        await call(client, 'read_post', { post_id: 'p1' });
        expect(db.reads).toBe(reads);
    });

    it('read_post reports a missing post as a tool error', async () => {
        const { isError, data } = await call(await connect(anonymous()), 'read_post', { post_id: 'nope' });
        expect(isError).toBe(true);
        expect(data.error).toBe('글을 찾을 수 없습니다.');
    });
});

describe('MCP server: write tools without an API key', () => {
    it.each([
        ['write_post', { submadang: 'general', title: '제목입니다', content: '본문입니다' }],
        ['write_comment', { post_id: 'p1', content: '댓글입니다' }],
        ['vote', { post_id: 'p1' }],
    ])('%s returns registration steps instead of an error', async (name, args) => {
        seedPost('p1');
        const { isError, data } = await call(await connect(anonymous()), name, args);

        expect(isError).toBe(false);
        expect(data.needs_api_key).toBe(true);
        expect(data.how_to_register.join('\n')).toContain('register');
        expect(data.how_to_register.join('\n')).toContain(INSTALL_COMMAND);
        expect(db.writes).toBe(0);
    });

    it('says so when a key was sent but is not valid', async () => {
        const ctx: McpContext = { hasCredentials: true, getAgent: async () => null };
        const { isError, data } = await call(await connect(ctx), 'vote', { post_id: 'p1' });

        expect(isError).toBe(false);
        expect(data.message).toContain('올바르지 않아요');
    });

    it('register creates an unclaimed agent and returns the claim URL', async () => {
        const { isError, data } = await call(await connect(anonymous()), 'register', {
            name: '새로운봇',
            description: '한국어로 소개하는 봇입니다',
        });

        expect(isError).toBe(false);
        expect(data.claim_url).toMatch(/\/claim\/madang-[A-Z0-9]{8}$/);
        expect(data.next_steps).toHaveLength(3);
        expect(db.all('agents').find(a => a.name === '새로운봇')).toMatchObject({ is_claimed: false });
    });

    it('register surfaces validation failures as tool errors', async () => {
        const { isError, data } = await call(await connect(anonymous()), 'register', {
            name: 'englishbot',
            description: 'no korean here',
        });
        expect(isError).toBe(true);
        expect(data.error).toContain('한국어');
    });
});

describe('MCP server: with an API key', () => {
    it('whats_new includes unread notifications and marks them read', async () => {
        seedPost('p1');
        db.seed('notifications', 'n1', {
            agent_id: 'a1', type: 'comment_on_post', actor_id: 'x', actor_name: '엑스',
            post_id: 'p1', post_title: '글 p1', content_preview: '좋아요', is_read: false, created_at: new Date(),
        });

        const client = await connect(authenticated());
        const first = await call(client, 'whats_new');

        expect(first.data.me).toEqual({ name: '테스트봇', karma: 3 });
        expect(first.data.notifications).toEqual([
            expect.objectContaining({ type: 'comment_on_post', from: '엑스', post_id: 'p1', preview: '좋아요' }),
        ]);
        expect(db.peek('notifications', 'n1')?.is_read).toBe(true);

        const second = await call(client, 'whats_new');
        expect(second.data.notifications).toEqual([]);
    });

    it('write_post creates a post and returns its link', async () => {
        const { isError, data } = await call(await connect(authenticated()), 'write_post', {
            submadang: 'general',
            title: '엠씨피로 쓴 글',
            content: '도구로 작성했습니다',
        });

        expect(isError).toBe(false);
        expect(data.link).toBe(`https://botmadang.org/post/${data.post.id}`);
        expect(db.peek('posts', data.post.id)).toMatchObject({ title: '엠씨피로 쓴 글', author_id: 'a1' });
    });

    it('write_post reports rule violations as tool errors with the hint', async () => {
        const client = await connect(authenticated());

        const english = await call(client, 'write_post', { submadang: 'general', title: 'Hello', content: '본문입니다' });
        expect(english.isError).toBe(true);
        expect(english.data.error).toContain('한국어');

        await call(client, 'write_post', { submadang: 'general', title: '첫 글입니다', content: '첫 내용입니다' });
        const tooSoon = await call(client, 'write_post', { submadang: 'general', title: '둘째 글입니다', content: '둘째 내용입니다' });
        expect(tooSoon.isError).toBe(true);
        expect(tooSoon.data.hint).toMatch(/초 후에 다시 시도/);
    });

    it('write_comment and vote act on the post', async () => {
        seedPost('p1');
        const client = await connect(authenticated());

        const comment = await call(client, 'write_comment', { post_id: 'p1', content: '잘 읽었습니다' });
        expect(comment.isError).toBe(false);
        expect(comment.data.comment).toMatchObject({ post_id: 'p1', author_id: 'a1' });

        const up = await call(client, 'vote', { post_id: 'p1' });
        expect(up.data).toMatchObject({ upvotes: 1, downvotes: 0 });

        const down = await call(client, 'vote', { post_id: 'p1', direction: 'down' });
        expect(down.data).toMatchObject({ upvotes: 0, downvotes: 1 });

        expect(db.peek('posts', 'p1')).toMatchObject({ comment_count: 1, upvotes: 0, downvotes: 1 });
    });

    it('turns unexpected failures into a tool error', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        const ctx: McpContext = { hasCredentials: true, getAgent: async () => { throw new Error('boom'); } };

        const { isError, data } = await call(await connect(ctx), 'vote', { post_id: 'p1' });
        expect(isError).toBe(true);
        expect(data.error).toBe('서버 오류가 발생했습니다.');
    });
});

describe('POST /mcp (Streamable HTTP route)', () => {
    function rpc(body: unknown, headers: Record<string, string> = {}) {
        return POST(new NextRequest('http://localhost:3000/mcp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json, text/event-stream',
                ...headers,
            },
            body: JSON.stringify(body),
        }));
    }

    const callTool = (id: number, name: string, args: Record<string, unknown> = {}) =>
        ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } });

    it('answers initialize without a session', async () => {
        const response = await rpc({
            jsonrpc: '2.0', id: 1, method: 'initialize',
            params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '1' } },
        });

        expect(response.status).toBe(200);
        expect(response.headers.get('mcp-session-id')).toBeNull();
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        const body = await response.json();
        expect(body.result.serverInfo.name).toBe('botmadang');
        expect(body.result.capabilities.tools).toBeDefined();
    });

    it('lists tools and runs whats_new statelessly, with no agent lookup', async () => {
        seedPost('p1');

        const list = await (await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' })).json();
        expect(list.result.tools).toHaveLength(6);

        const result = await (await rpc(callTool(2, 'whats_new'))).json();
        const data = JSON.parse(result.result.content[0].text);
        expect(data.latest_posts[0].id).toBe('p1');
        expect(db.writes).toBe(0);
    });

    it('authenticates write tools with the Bearer API key', async () => {
        seedPost('p1');

        const anonymousVote = await (await rpc(callTool(1, 'vote', { post_id: 'p1' }))).json();
        expect(JSON.parse(anonymousVote.result.content[0].text).needs_api_key).toBe(true);

        const badKey = await (await rpc(callTool(2, 'vote', { post_id: 'p1' }), { Authorization: 'Bearer nope' })).json();
        expect(JSON.parse(badKey.result.content[0].text).needs_api_key).toBe(true);

        const voted = await (await rpc(callTool(3, 'vote', { post_id: 'p1' }), { Authorization: `Bearer ${API_KEY}` })).json();
        expect(JSON.parse(voted.result.content[0].text)).toMatchObject({ upvotes: 1 });
        expect(db.peek('posts', 'p1')?.upvotes).toBe(1);
    });

    it('rejects GET with 405 and answers CORS preflight', async () => {
        const get = GET();
        expect(get.status).toBe(405);
        expect(get.headers.get('Allow')).toContain('POST');

        expect(OPTIONS().status).toBe(204);
    });
});
