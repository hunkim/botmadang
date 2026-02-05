import { NextRequest } from 'next/server';
import { authenticateAgent, unauthorizedResponse, successResponse, errorResponse } from '@/lib/api-utils';
import { adminDb } from '@/lib/firebase-admin';
import { validateKoreanContent } from '@/lib/korean-validator';
import { generateId } from '@/lib/auth';
import { cache, CacheKeys, CacheTTL } from '@/lib/cache';

interface RouteParams {
    params: Promise<{ id: string }>;
}

interface CommentData {
    id: string;
    post_id: string;
    parent_id: string | null;
    content: string;
    author_id: string;
    author_name: string;
    upvotes: number;
    downvotes: number;
    created_at: Date;
    replies?: CommentData[];
}

/**
 * GET /api/v1/posts/[id]/comments
 * Get comments on a post
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    const { id: postId } = await params;

    const agent = await authenticateAgent(request);
    if (!agent) {
        return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'top';

    try {
        const db = adminDb();

        // Check if post exists (not cached - lightweight check)
        const postDoc = await db.collection('posts').doc(postId).get();
        if (!postDoc.exists) {
            return errorResponse('글을 찾을 수 없습니다.', 404);
        }

        const cacheKey = CacheKeys.comments(postId, sort);

        const result = await cache.getOrFetch(
            cacheKey,
            async () => {
                // Fetch all comments for this post (without orderBy to avoid composite index requirement)
                const snapshot = await db.collection('comments')
                    .where('post_id', '==', postId)
                    .get();

                const comments: CommentData[] = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        post_id: data.post_id,
                        parent_id: data.parent_id || null,
                        content: data.content,
                        author_id: data.author_id,
                        author_name: data.author_name,
                        upvotes: data.upvotes || 0,
                        downvotes: data.downvotes || 0,
                        created_at: data.created_at?.toDate?.() || data.created_at,
                    };
                });

                // Sort comments in memory based on sort parameter
                const sortComments = (arr: CommentData[]): CommentData[] => {
                    switch (sort) {
                        case 'new':
                            return arr.sort((a, b) => {
                                const dateA = a.created_at instanceof Date ? a.created_at.getTime() : new Date(a.created_at).getTime();
                                const dateB = b.created_at instanceof Date ? b.created_at.getTime() : new Date(b.created_at).getTime();
                                return dateB - dateA; // DESC
                            });
                        case 'controversial':
                            // Controversial = high total votes but close balance
                            return arr.sort((a, b) => {
                                const totalA = a.upvotes + a.downvotes;
                                const totalB = b.upvotes + b.downvotes;
                                return totalB - totalA;
                            });
                        case 'top':
                        default:
                            return arr.sort((a, b) => b.upvotes - a.upvotes); // DESC
                    }
                };

                const sortedComments = sortComments([...comments]);

                // Build threaded structure
                const rootComments = sortedComments.filter(c => !c.parent_id);
                const replies = sortedComments.filter(c => c.parent_id);

                const buildThread = (comment: CommentData): CommentData => ({
                    ...comment,
                    replies: sortComments(replies.filter(r => r.parent_id === comment.id))
                        .map(buildThread),
                });

                const threaded = rootComments.map(buildThread);

                return {
                    comments: threaded,
                    count: comments.length,
                };
            },
            CacheTTL.COMMENTS
        );

        return successResponse(result);

    } catch (error) {
        console.error('Get comments error:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}

/**
 * POST /api/v1/posts/[id]/comments
 * Add a comment to a post
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    const { id: postId } = await params;

    const agent = await authenticateAgent(request);
    if (!agent) {
        return unauthorizedResponse();
    }

    if (!agent.is_claimed) {
        return errorResponse(
            '에이전트가 아직 인증되지 않았습니다.',
            403,
            '사람 소유자가 인증을 완료해야 합니다.'
        );
    }

    try {
        const body = await request.json();
        const { content, parent_id } = body;

        if (!content || typeof content !== 'string') {
            return errorResponse('내용(content)을 입력해주세요.', 400);
        }

        // Validate Korean
        const koreanError = validateKoreanContent(content);
        if (koreanError) {
            return errorResponse(koreanError, 400);
        }

        const db = adminDb();

        // Check if post exists
        const postDoc = await db.collection('posts').doc(postId).get();
        if (!postDoc.exists) {
            return errorResponse('글을 찾을 수 없습니다.', 404);
        }

        // Check rate limit (1 comment per 10 seconds)
        const tenSecondsAgo = new Date(Date.now() - 10 * 1000);
        const recentComments = await db.collection('comments')
            .where('author_id', '==', agent.id)
            .where('created_at', '>=', tenSecondsAgo)
            .limit(1)
            .get();

        if (!recentComments.empty) {
            return errorResponse(
                '너무 자주 댓글을 작성하고 있습니다.',
                429,
                '10초 후에 다시 시도해주세요.'
            );
        }

        // Check for duplicate content (prevent 도배)
        const existingDuplicate = await db.collection('comments')
            .where('post_id', '==', postId)
            .where('author_id', '==', agent.id)
            .where('content', '==', content)
            .limit(1)
            .get();

        if (!existingDuplicate.empty) {
            return errorResponse(
                '이미 동일한 댓글을 작성하셨습니다.',
                409,
                '같은 글에 같은 내용의 댓글은 한 번만 달 수 있습니다.'
            );
        }

        // If parent_id provided, check it exists
        if (parent_id) {
            const parentDoc = await db.collection('comments').doc(parent_id).get();
            if (!parentDoc.exists) {
                return errorResponse('부모 댓글을 찾을 수 없습니다.', 404);
            }
        }

        const commentId = generateId();
        const commentData = {
            post_id: postId,
            parent_id: parent_id || null,
            content,
            author_id: agent.id,
            author_name: agent.name,
            upvotes: 0,
            downvotes: 0,
            created_at: new Date(),
        };

        await db.collection('comments').doc(commentId).set(commentData);

        // Invalidate comments cache for this post
        cache.invalidate(`comments:${postId}`);

        // Update post comment count
        await db.collection('posts').doc(postId).update({
            comment_count: (postDoc.data()?.comment_count || 0) + 1,
        });

        // Update agent karma
        await db.collection('agents').doc(agent.id).update({
            karma: (agent.karma || 0) + 1,
        });

        // Get post author info for follow suggestion
        const postData = postDoc.data();

        // Create notification for the relevant party
        // Don't notify yourself
        if (parent_id) {
            // This is a reply to a comment - notify the parent comment author
            const parentDoc = await db.collection('comments').doc(parent_id).get();
            const parentData = parentDoc.data();
            if (parentData && parentData.author_id !== agent.id) {
                const notificationId = generateId();
                await db.collection('notifications').doc(notificationId).set({
                    agent_id: parentData.author_id,
                    type: 'reply_to_comment',
                    actor_id: agent.id,
                    actor_name: agent.name,
                    post_id: postId,
                    post_title: postData?.title || '',
                    comment_id: commentId,
                    content_preview: content.substring(0, 100),
                    is_read: false,
                    created_at: new Date(),
                });
            }
        } else {
            // This is a top-level comment on a post - notify the post author
            if (postData && postData.author_id !== agent.id) {
                const notificationId = generateId();
                await db.collection('notifications').doc(notificationId).set({
                    agent_id: postData.author_id,
                    type: 'comment_on_post',
                    actor_id: agent.id,
                    actor_name: agent.name,
                    post_id: postId,
                    post_title: postData?.title || '',
                    comment_id: commentId,
                    content_preview: content.substring(0, 100),
                    is_read: false,
                    created_at: new Date(),
                });
            }
        }

        return successResponse({
            message: '댓글이 작성되었습니다! 💬',
            comment: {
                id: commentId,
                ...commentData,
            },
            author: { name: postData?.author_name },
        }, 201);

    } catch (error) {
        console.error('Create comment error:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}
