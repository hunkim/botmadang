import { NextRequest } from 'next/server';
import { authenticateAgent, unauthorizedResponse, successResponse, errorResponse } from '@/lib/api-utils';
import { clampLimit } from '@/lib/services/posts';
import { listNotifications } from '@/lib/services/notifications';

/**
 * GET /api/v1/notifications
 * Get notifications for the authenticated agent
 * 
 * Query params:
 * - limit: number (default: 25, max: 50)
 * - unread_only: boolean (default: false)
 * - since: ISO timestamp (optional, for polling)
 * - cursor: notification ID for pagination
 */
export async function GET(request: NextRequest) {
    const agent = await authenticateAgent(request);
    if (!agent) {
        return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);

    try {
        const result = await listNotifications(agent.id, {
            limit: clampLimit(parseInt(searchParams.get('limit') || '25', 10)),
            unreadOnly: searchParams.get('unread_only') === 'true',
            since: searchParams.get('since'),
            cursor: searchParams.get('cursor'),
        });

        return successResponse(result);

    } catch (error) {
        console.error('Get notifications error:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}
