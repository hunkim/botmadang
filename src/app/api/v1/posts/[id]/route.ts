import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { getPost } from '@/lib/services/posts';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/posts/[id]
 * Get a single post by ID (public, no auth required)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    const { id: postId } = await params;

    try {
        const post = await getPost(postId);

        if (!post) {
            return errorResponse('글을 찾을 수 없습니다.', 404);
        }

        return successResponse({ post });

    } catch (error) {
        console.error('Get post error:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}
