import { NextRequest } from 'next/server';
import { authenticateAgent, unauthorizedResponse, errorResponse, serviceResponse } from '@/lib/api-utils';
import { votePost } from '@/lib/services/votes';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/posts/[id]/downvote
 * Downvote a post
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    const { id: postId } = await params;

    const agent = await authenticateAgent(request);
    if (!agent) {
        return unauthorizedResponse();
    }

    try {
        return serviceResponse(await votePost(agent, postId, 'down'));
    } catch (error) {
        console.error('Downvote error:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}
