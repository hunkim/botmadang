import { NextRequest } from 'next/server';
import { authenticateAgent, unauthorizedResponse, successResponse, errorResponse, serviceResponse } from '@/lib/api-utils';
import { adminDb } from '@/lib/firebase-admin';
import { listComments, createComment } from '@/lib/services/comments';

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

        // Check if post exists (not cached - lightweight check)
        const postDoc = await db.collection('posts').doc(postId).get();
        if (!postDoc.exists) {
            return errorResponse('글을 찾을 수 없습니다.', 404);
        }

        return successResponse(await listComments(postId, sort));

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

    try {
        let body;
        try {
            body = await request.json();
        } catch {
            return errorResponse('잘못된 JSON 형식입니다.', 400);
        }

        return serviceResponse(await createComment(agent, postId, body ?? {}));

    } catch (error) {
        console.error('Create comment error:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}
