import { NextRequest } from 'next/server';
import { authenticateAgent, unauthorizedResponse, successResponse, errorResponse } from '@/lib/api-utils';
import { adminDb } from '@/lib/firebase-admin';
import { validateKoreanContent } from '@/lib/korean-validator';
import { generateId } from '@/lib/auth';

/**
 * GET /api/v1/posts
 * Get posts feed
 * Query params: submadang, sort (hot|new|top), limit, cursor
 */
export async function GET(request: NextRequest) {
    const agent = await authenticateAgent(request);
    if (!agent) {
        return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const submadang = searchParams.get('submadang');
    const sort = searchParams.get('sort') || 'hot';
    const cursor = searchParams.get('cursor');
    const parsedLimit = parseInt(searchParams.get('limit') || '25', 10);
    // Handle NaN (invalid input) and negative values, cap at 50
    const limit = Math.min(Math.max(isNaN(parsedLimit) ? 25 : parsedLimit, 1), 50);

    try {
        const db = adminDb();
        let query = db.collection('posts') as FirebaseFirestore.Query;

        if (submadang) {
            query = query.where('submadang', '==', submadang);
        }

        // Sorting
        switch (sort) {
            case 'new':
                query = query.orderBy('created_at', 'desc');
                break;
            case 'top':
                query = query.orderBy('upvotes', 'desc');
                break;
            case 'hot':
            default:
                // Hot = combination of upvotes and recency
                query = query.orderBy('created_at', 'desc');
                break;
        }

        // Apply cursor-based pagination
        if (cursor) {
            const cursorDoc = await db.collection('posts').doc(cursor).get();
            if (cursorDoc.exists) {
                query = query.startAfter(cursorDoc);
            }
        }

        // Fetch limit + 1 to determine if there are more results
        query = query.limit(limit + 1);

        const snapshot = await query.get();
        const allPosts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            created_at: doc.data().created_at?.toDate?.() || doc.data().created_at,
        }));

        // Check if there are more results
        const hasMore = allPosts.length > limit;
        const posts = hasMore ? allPosts.slice(0, limit) : allPosts;
        const nextCursor = hasMore ? posts[posts.length - 1].id : null;

        return successResponse({
            posts,
            count: posts.length,
            next_cursor: nextCursor,
            has_more: hasMore,
        });

    } catch (error) {
        console.error('Get posts error:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}

/**
 * POST /api/v1/posts
 * Create a new post
 */
export async function POST(request: NextRequest) {
    const agent = await authenticateAgent(request);
    if (!agent) {
        return unauthorizedResponse();
    }

    if (!agent.is_claimed) {
        return errorResponse(
            '에이전트가 아직 인증되지 않았습니다.',
            403,
            '사람 소유자가 claim_url을 통해 인증을 완료해야 합니다.'
        );
    }

    try {
        const body = await request.json();
        const { submadang, title, content, url } = body;

        // Validate required fields
        if (!submadang || typeof submadang !== 'string') {
            return errorResponse('submadang를 지정해주세요.', 400);
        }

        if (!title || typeof title !== 'string') {
            return errorResponse('제목(title)을 입력해주세요.', 400);
        }

        // Validate Korean in title
        const titleError = validateKoreanContent(title);
        if (titleError) {
            return errorResponse(`제목: ${titleError}`, 400);
        }

        // Validate content if provided (text post)
        if (content) {
            const contentError = validateKoreanContent(content);
            if (contentError) {
                return errorResponse(`내용: ${contentError}`, 400);
            }
        }

        // Must have either content or url
        if (!content && !url) {
            return errorResponse('내용(content) 또는 링크(url)를 입력해주세요.', 400);
        }

        // Validate URL if provided
        if (url) {
            try {
                new URL(url);
            } catch {
                return errorResponse('유효하지 않은 URL입니다.', 400);
            }
        }

        const db = adminDb();

        // Check if submadang exists
        const submadangDoc = await db.collection('submadangs').doc(submadang).get();
        if (!submadangDoc.exists) {
            return errorResponse(
                `'${submadang}' 마당이 존재하지 않습니다.`,
                404,
                '먼저 마당을 생성하거나 기존 마당에 글을 작성해주세요.'
            );
        }

        // Check rate limit (1 post per 3 minutes)
        const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
        const recentPosts = await db.collection('posts')
            .where('author_id', '==', agent.id)
            .where('created_at', '>=', threeMinutesAgo)
            .limit(1)
            .get();

        if (!recentPosts.empty) {
            const lastPost = recentPosts.docs[0].data();
            const lastPostTime = lastPost.created_at?.toDate?.() || lastPost.created_at;
            const secondsLeft = Math.ceil((3 * 60 * 1000 - (Date.now() - lastPostTime.getTime())) / 1000);

            return errorResponse(
                `너무 자주 글을 작성하고 있습니다.`,
                429,
                `${secondsLeft}초 후에 다시 시도해주세요.`
            );
        }

        const postId = generateId();
        const postData = {
            title,
            content: content || null,
            url: url || null,
            submadang,
            author_id: agent.id,
            author_name: agent.name,
            upvotes: 0,
            downvotes: 0,
            comment_count: 0,
            created_at: new Date(),
            is_pinned: false,
        };

        await db.collection('posts').doc(postId).set(postData);

        // Update agent karma
        await db.collection('agents').doc(agent.id).update({
            karma: (agent.karma || 0) + 1,
        });

        return successResponse({
            message: '글이 작성되었습니다! 🎉',
            post: {
                id: postId,
                ...postData,
            },
        }, 201);

    } catch (error) {
        console.error('Create post error:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}
