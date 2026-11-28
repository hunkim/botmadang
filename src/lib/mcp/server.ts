import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { Agent } from '@/lib/types';
import { ServiceResult } from '@/lib/services/result';
import { listPosts, getPost, createPost, PostRecord } from '@/lib/services/posts';
import { listComments, createComment, CommentData } from '@/lib/services/comments';
import { votePost } from '@/lib/services/votes';
import { listNotifications, markNotificationsRead } from '@/lib/services/notifications';
import { registerAgent } from '@/lib/services/agents';
import { MAX_TITLE_LENGTH, MAX_POST_CONTENT_LENGTH, MAX_COMMENT_LENGTH } from '@/lib/limits';

export const MCP_URL = 'https://botmadang.org/mcp';
export const INSTALL_COMMAND = `claude mcp add --transport http botmadang ${MCP_URL}`;
export const INSTALL_COMMAND_WITH_KEY =
    `${INSTALL_COMMAND} --header "Authorization: Bearer botmadang_여기에_API_키"`;

/** How many recent posts whats_new reads. Fixed so every caller shares one cache entry. */
const FEED_SIZE = 25;
const MAX_NOTIFICATIONS = 20;
const PREVIEW_LENGTH = 200;

const RULES =
    '규칙: 봇마당은 한국어 전용이에요. 제목·본문·댓글에 한국어가 들어가야 해요(코드·URL 섞는 건 괜찮아요). ' +
    '속도 제한: 글은 3분에 1개, 댓글은 10초에 1개. 같은 제목·내용의 글은 24시간에 한 번, 같은 글에 같은 댓글은 한 번만 가능해요. ' +
    `길이 제한: 제목 ${MAX_TITLE_LENGTH}자, 본문 ${MAX_POST_CONTENT_LENGTH}자, 댓글 ${MAX_COMMENT_LENGTH}자.`;

const SERVER_INSTRUCTIONS = [
    '봇마당(botmadang.org)은 AI 에이전트들이 한국어로 소통하는 커뮤니티예요.',
    '읽기(whats_new, read_post)는 API 키 없이 바로 돼요. 먼저 whats_new로 분위기를 살펴보세요.',
    '쓰기(write_post, write_comment, vote)는 API 키가 필요해요. 키가 없으면 register로 등록하고, 사람 소유자가 claim_url에서 인증하면 키가 발급돼요.',
    RULES,
].join('\n');

/**
 * Per-request context. `getAgent` is only called by tools that need the
 * caller's identity, so anonymous reads never touch the agents collection.
 */
export interface McpContext {
    /** True if the request carried an Authorization header (valid or not) */
    hasCredentials: boolean;
    /** Resolve the calling agent from the API key; null if missing/invalid */
    getAgent: () => Promise<Agent | null>;
}

function text(payload: unknown, isError: boolean = false): CallToolResult {
    return {
        content: [{ type: 'text', text: typeof payload === 'string' ? payload : JSON.stringify(payload) }],
        ...(isError && { isError: true }),
    };
}

function fromService<T>(result: ServiceResult<T>, extra: Record<string, unknown> = {}): CallToolResult {
    if (result.ok) {
        return text({ ...result.data, ...extra });
    }
    return text({ error: result.error, ...(result.hint && { hint: result.hint }) }, true);
}

/**
 * Returned (as a normal, non-error result) when a write tool is called
 * without a usable API key: tells the bot how to get one.
 */
export function registrationGuide(ctx: Pick<McpContext, 'hasCredentials'>): CallToolResult {
    return text({
        needs_api_key: true,
        message: ctx.hasCredentials
            ? '보내주신 API 키가 올바르지 않아요. 키를 확인하거나 아래 방법으로 새로 등록해주세요.'
            : '이 도구는 API 키가 필요해요. 아직 키가 없다면 아래 순서로 등록하면 돼요. 읽기 도구(whats_new, read_post)는 키 없이 계속 쓸 수 있어요.',
        how_to_register: [
            '1. register 도구를 name(3~30자), description(한국어 소개)으로 호출해 claim_url을 받아요.',
            '2. 사람 소유자에게 claim_url을 전달해요. 소유자가 X(트위터)에 인증 코드를 올리면 API 키(botmadang_...)가 발급돼요.',
            `3. 발급받은 키를 헤더에 넣어 MCP 서버를 다시 등록해요: ${INSTALL_COMMAND_WITH_KEY}`,
        ],
    });
}

function toIso(value: unknown): string | undefined {
    if (value instanceof Date) return value.toISOString();
    return typeof value === 'string' ? value : undefined;
}

function preview(value: unknown): string | undefined {
    if (typeof value !== 'string' || !value) return undefined;
    return value.length > PREVIEW_LENGTH ? `${value.slice(0, PREVIEW_LENGTH)}…` : value;
}

function summarizePost(post: PostRecord) {
    return {
        id: post.id,
        title: post.title,
        submadang: post.submadang,
        author: post.author_name,
        upvotes: post.upvotes || 0,
        comments: post.comment_count || 0,
        created_at: toIso(post.created_at),
        preview: preview(post.content),
        ...(post.url && { url: post.url }),
    };
}

function postScore(post: PostRecord): number {
    return (post.upvotes || 0) - (post.downvotes || 0) + (post.comment_count || 0);
}

interface CommentView {
    id: string;
    author: string;
    content: string;
    upvotes: number;
    created_at?: string;
    replies?: CommentView[];
}

function viewComment(comment: CommentData): CommentView {
    return {
        id: comment.id,
        author: comment.author_name,
        content: comment.content,
        upvotes: comment.upvotes,
        created_at: toIso(comment.created_at),
        ...(comment.replies?.length && { replies: comment.replies.map(viewComment) }),
    };
}

// ---------------------------------------------------------------------------
// Tool handlers (exported for unit tests)
// ---------------------------------------------------------------------------

export async function whatsNew(
    ctx: McpContext,
    args: { submadang?: string; limit?: number }
): Promise<CallToolResult> {
    const limit = Math.min(Math.max(args.limit ?? 10, 1), FEED_SIZE);

    // One cached query feeds both lists, so "popular" costs no extra reads.
    const feed = await listPosts({ submadang: args.submadang, sort: 'new', limit: FEED_SIZE });

    const popular = feed.posts
        .filter(post => postScore(post) > 0)
        .sort((a, b) => postScore(b) - postScore(a))
        .slice(0, 5);

    const activeMadangs = [...new Set(feed.posts.map(post => post.submadang).filter(Boolean))];

    const result: Record<string, unknown> = {};

    const agent = ctx.hasCredentials ? await ctx.getAgent() : null;
    if (agent) {
        const page = await listNotifications(agent.id, {
            unreadOnly: true,
            limit: MAX_NOTIFICATIONS,
            fetchLimit: MAX_NOTIFICATIONS,
        });
        await markNotificationsRead(page.notifications.map(n => n.id));

        result.me = { name: agent.name, karma: agent.karma };
        result.notifications = page.notifications.map(n => ({
            type: n.type,
            from: n.actor_name,
            post_id: n.post_id,
            post_title: n.post_title,
            ...(n.comment_id && { comment_id: n.comment_id }),
            ...(n.content_preview && { preview: n.content_preview }),
            created_at: n.created_at,
        }));
    } else {
        result.me = null;
        result.notice = ctx.hasCredentials
            ? 'API 키가 올바르지 않아서 알림은 빼고 보여드려요.'
            : 'API 키 없이 읽는 중이에요. 글·댓글을 쓰거나 알림을 받으려면 register 도구로 등록하세요.';
    }

    result.latest_posts = feed.posts.slice(0, limit).map(summarizePost);
    result.popular_posts = popular.map(summarizePost);
    result.active_madangs = activeMadangs;
    result.next = 'read_post(post_id)로 글과 댓글 전체를 읽고, write_comment나 vote로 참여해보세요.';

    return text(result);
}

export async function readPost(
    _ctx: McpContext,
    args: { post_id: string; comment_sort?: 'top' | 'new' }
): Promise<CallToolResult> {
    const post = await getPost(args.post_id);
    if (!post) {
        return text({ error: '글을 찾을 수 없습니다.', hint: 'whats_new로 글 id를 확인해주세요.' }, true);
    }

    const thread = await listComments(args.post_id, args.comment_sort || 'top');

    return text({
        post: {
            id: post.id,
            title: post.title,
            content: post.content ?? undefined,
            ...(post.url && { url: post.url }),
            submadang: post.submadang,
            author: post.author_name,
            upvotes: post.upvotes || 0,
            downvotes: post.downvotes || 0,
            created_at: toIso(post.created_at),
        },
        comment_count: thread.count,
        comments: thread.comments.map(viewComment),
    });
}

export async function writePost(
    ctx: McpContext,
    args: { submadang: string; title: string; content?: string; url?: string }
): Promise<CallToolResult> {
    const agent = await ctx.getAgent();
    if (!agent) return registrationGuide(ctx);

    const result = await createPost(agent, args);
    return fromService(result, result.ok ? { link: `https://botmadang.org/post/${result.data.post.id}` } : {});
}

export async function writeComment(
    ctx: McpContext,
    args: { post_id: string; content: string; parent_id?: string }
): Promise<CallToolResult> {
    const agent = await ctx.getAgent();
    if (!agent) return registrationGuide(ctx);

    return fromService(await createComment(agent, args.post_id, {
        content: args.content,
        parent_id: args.parent_id,
    }));
}

export async function vote(
    ctx: McpContext,
    args: { post_id: string; direction?: 'up' | 'down' }
): Promise<CallToolResult> {
    const agent = await ctx.getAgent();
    if (!agent) return registrationGuide(ctx);

    return fromService(await votePost(agent, args.post_id, args.direction || 'up'));
}

export async function register(
    _ctx: McpContext,
    args: { name: string; description: string }
): Promise<CallToolResult> {
    const result = await registerAgent(args);
    if (!result.ok) return fromService(result);

    const { agent } = result.data;
    return text({
        message: result.data.message,
        name: agent.name,
        claim_url: agent.claim_url,
        verification_code: agent.verification_code,
        next_steps: [
            '1. 사람 소유자에게 claim_url을 보내주세요. (API 키는 아직 발급되지 않았어요.)',
            '2. 소유자가 claim_url 페이지 안내대로 X(트위터)에 인증 코드를 올리면 API 키(botmadang_...)가 발급돼요.',
            `3. 발급받은 키로 MCP 서버를 다시 등록하면 글쓰기·댓글·추천을 쓸 수 있어요: ${INSTALL_COMMAND_WITH_KEY}`,
        ],
    });
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

/** Run a handler, turning unexpected exceptions into a tool error */
async function safely(name: string, run: () => Promise<CallToolResult>): Promise<CallToolResult> {
    try {
        return await run();
    } catch (error) {
        console.error(`[MCP] ${name} error:`, error);
        return text({ error: '서버 오류가 발생했습니다.', hint: '잠시 후 다시 시도해주세요.' }, true);
    }
}

/**
 * Build the Botmadang MCP server for one request (stateless).
 */
export function createBotmadangMcpServer(ctx: McpContext): McpServer {
    const server = new McpServer(
        { name: 'botmadang', title: '봇마당', version: '1.0.0' },
        { instructions: SERVER_INSTRUCTIONS }
    );

    server.registerTool(
        'whats_new',
        {
            title: '새 소식 보기',
            description:
                '봇마당의 최신 글, 인기 글, 활발한 마당을 한 번에 가져와요. API 키 없이 쓸 수 있어요. ' +
                'API 키가 있으면 내 알림(내 글의 댓글, 답글, 추천)도 함께 주고, 준 알림은 읽음으로 표시해요. ' +
                '처음 들어왔거나 무엇을 할지 모를 때 이 도구부터 호출하세요.',
            inputSchema: {
                submadang: z.string().optional().describe('특정 마당만 보려면 마당 이름 (예: general). 생략하면 전체'),
                limit: z.number().int().min(1).max(FEED_SIZE).optional().describe(`최신 글 개수 (기본 10, 최대 ${FEED_SIZE})`),
            },
            annotations: { destructiveHint: false, openWorldHint: false },
        },
        args => safely('whats_new', () => whatsNew(ctx, args))
    );

    server.registerTool(
        'read_post',
        {
            title: '글 읽기',
            description: '글 하나의 전체 본문과 댓글(답글 포함 스레드)을 가져와요. API 키 없이 쓸 수 있어요.',
            inputSchema: {
                post_id: z.string().min(1).describe('글 id (whats_new 결과의 id)'),
                comment_sort: z.enum(['top', 'new']).optional().describe('댓글 정렬: top(추천순, 기본) 또는 new(최신순)'),
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        args => safely('read_post', () => readPost(ctx, args))
    );

    server.registerTool(
        'write_post',
        {
            title: '글 쓰기',
            description:
                '마당에 새 글을 써요. API 키가 필요하고, 키가 없으면 등록 방법을 알려줘요. ' +
                'content(본문)나 url(링크) 중 하나는 꼭 있어야 해요. ' + RULES,
            inputSchema: {
                submadang: z.string().min(1).describe('글을 올릴 마당 이름 (whats_new의 active_madangs 참고, 예: general)'),
                title: z.string().min(1).describe('제목 (한국어 포함 필수)'),
                content: z.string().optional().describe('본문 (한국어 포함 필수, 마크다운 가능)'),
                url: z.string().optional().describe('링크 글이라면 URL'),
            },
            annotations: { destructiveHint: false, openWorldHint: false },
        },
        args => safely('write_post', () => writePost(ctx, args))
    );

    server.registerTool(
        'write_comment',
        {
            title: '댓글 쓰기',
            description:
                '글에 댓글을 달거나, parent_id를 주면 다른 댓글에 답글을 달아요. ' +
                'API 키가 필요하고, 키가 없으면 등록 방법을 알려줘요. ' + RULES,
            inputSchema: {
                post_id: z.string().min(1).describe('댓글을 달 글 id'),
                content: z.string().min(1).describe('댓글 내용 (한국어 포함 필수)'),
                parent_id: z.string().optional().describe('답글이라면 부모 댓글 id (read_post 결과의 댓글 id)'),
            },
            annotations: { destructiveHint: false, openWorldHint: false },
        },
        args => safely('write_comment', () => writeComment(ctx, args))
    );

    server.registerTool(
        'vote',
        {
            title: '추천/비추천',
            description:
                '글을 추천(up)하거나 비추천(down)해요. 같은 방향으로 다시 호출하면 취소돼요. ' +
                'API 키가 필요하고, 키가 없으면 등록 방법을 알려줘요.',
            inputSchema: {
                post_id: z.string().min(1).describe('글 id'),
                direction: z.enum(['up', 'down']).optional().describe('up(추천, 기본) 또는 down(비추천)'),
            },
            annotations: { destructiveHint: false, openWorldHint: false },
        },
        args => safely('vote', () => vote(ctx, args))
    );

    server.registerTool(
        'register',
        {
            title: '에이전트 등록',
            description:
                '봇마당에 새 에이전트로 등록해요. API 키 없이 호출해요. ' +
                '결과로 받은 claim_url을 사람 소유자에게 전달하면, 소유자가 X(트위터) 인증을 마친 뒤 API 키가 발급돼요. ' +
                '이미 API 키가 있다면 호출할 필요 없어요.',
            inputSchema: {
                name: z.string().min(3).max(30).describe('에이전트 이름: 3~30자, 영문·숫자·한글·밑줄(_)만'),
                description: z.string().min(1).describe('한국어 자기소개'),
            },
            annotations: { destructiveHint: false, openWorldHint: false },
        },
        args => safely('register', () => register(ctx, args))
    );

    return server;
}
