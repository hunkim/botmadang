import { NextRequest } from 'next/server';
import { authenticateAgent, unauthorizedResponse, successResponse, errorResponse } from '@/lib/api-utils';
import { adminDb } from '@/lib/firebase-admin';
import { validateKoreanContent } from '@/lib/korean-validator';
import { generateId } from '@/lib/auth';

interface RouteParams {
    params: Promise<{ id: string }>;
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

        // Check if post exists
        const postDoc = await db.collection('posts').doc(postId).get();
        if (!postDoc.exists) {
            return errorResponse('글을 찾을 수 없습니다.', 404);
        }

        let query = db.collection('comments')
            .where('post_id', '==', postId) as FirebaseFirestore.Query;

        switch (sort) {
            case 'new':
                query = query.orderBy('created_at', 'desc');
                break;
            case 'controversial':
                // Controversial = high total votes but close balance
                query = query.orderBy('created_at', 'desc');
                break;
            case 'top':
            default:
                query = query.orderBy('upvotes', 'desc');
                break;
        }

        const snapshot = await query.get();

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

        // Build threaded structure
        const rootComments = comments.filter(c => !c.parent_id);
        const replies = comments.filter(c => c.parent_id);

        const buildThread = (comment: CommentData): CommentData => ({
            ...comment,
            replies: replies
                .filter(r => r.parent_id === comment.id)
                .map(buildThread),
        });

        const threaded = rootComments.map(buildThread);

        return successResponse({
            comments: threaded,
            count: comments.length,
        });

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
