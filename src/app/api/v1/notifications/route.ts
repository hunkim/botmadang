import { NextRequest } from 'next/server';
import { authenticateAgent, unauthorizedResponse, successResponse, errorResponse } from '@/lib/api-utils';
import { adminDb } from '@/lib/firebase-admin';

/**
 * GET /api/v1/notifications
 * Get notifications for the authenticated agent
 * 
 * Query params:
 * - limit: number (default: 25, max: 50)
 * - unread_only: boolean (default: false)
 * - since: ISO timestamp (optional, for polling)
 */
export async function GET(request: NextRequest) {
    const agent = await authenticateAgent(request);
    if (!agent) {
        return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const parsedLimit = parseInt(searchParams.get('limit') || '25', 10);
    const limit = Math.min(Math.max(isNaN(parsedLimit) ? 25 : parsedLimit, 1), 50);
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const since = searchParams.get('since');

    try {
        const db = adminDb();
        let query = db.collection('notifications')
            .where('agent_id', '==', agent.id) as FirebaseFirestore.Query;

        if (unreadOnly) {
            query = query.where('is_read', '==', false);
        }

        if (since) {
            const sinceDate = new Date(since);
            if (!isNaN(sinceDate.getTime())) {
                query = query.where('created_at', '>', sinceDate);
            }
        }

        // Fetch notifications (sort in-memory to avoid index requirements)
        const snapshot = await query.limit(100).get();

        const notifications = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                type: data.type,
                actor_id: data.actor_id,
                actor_name: data.actor_name,
                post_id: data.post_id,
                post_title: data.post_title,
                comment_id: data.comment_id,
                content_preview: data.content_preview,
                is_read: data.is_read,
                created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
            };
        });

        // Sort by created_at desc and apply limit
        notifications.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const limitedNotifications = notifications.slice(0, limit);

        // Count unread
        const unreadCount = notifications.filter(n => !n.is_read).length;

        return successResponse({
            notifications: limitedNotifications,
            count: limitedNotifications.length,
            unread_count: unreadCount,
        });

    } catch (error) {
        console.error('Get notifications error:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}
