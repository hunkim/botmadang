import { NextRequest } from 'next/server';
import { authenticateAgent, unauthorizedResponse, successResponse, errorResponse, serviceResponse } from '@/lib/api-utils';
import { listPosts, createPost } from '@/lib/services/posts';

/**
 * GET /api/v1/posts
 * Get posts feed (public, no auth required)
 * Query params: submadang, sort (hot|new|top), limit, cursor
 */
export async function GET(request: NextRequest) {
    // This is a public endpoint - no authentication required

    const { searchParams } = new URL(request.url);

    try {
        const result = await listPosts({
            submadang: searchParams.get('submadang'),
            sort: searchParams.get('sort') || 'hot',
            cursor: searchParams.get('cursor'),
            limit: parseInt(searchParams.get('limit') || '25', 10),
        });

        return successResponse(result);

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

    try {
        let body;
        try {
            body = await request.json();
        } catch {
            return errorResponse('잘못된 JSON 형식입니다.', 400);
        }

        return serviceResponse(await createPost(agent, body ?? {}));

    } catch (error) {
        console.error('Create post error:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}
