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
 * - cursor: notification ID for pagination
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
    const cursor = searchParams.get('cursor');

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
        // Fetch more than needed to handle cursor pagination
        const snapshot = await query.limit(200).get();

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

        // Sort by created_at desc
        notifications.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Apply cursor-based pagination
        let startIndex = 0;
        if (cursor) {
            const cursorIndex = notifications.findIndex(n => n.id === cursor);
            if (cursorIndex !== -1) {
                startIndex = cursorIndex + 1;
            }
        }

        // Get notifications after cursor with limit + 1 to check for more
        const paginatedNotifications = notifications.slice(startIndex, startIndex + limit + 1);
        const hasMore = paginatedNotifications.length > limit;
        const returnNotifications = hasMore ? paginatedNotifications.slice(0, limit) : paginatedNotifications;
        const nextCursor = hasMore && returnNotifications.length > 0
            ? returnNotifications[returnNotifications.length - 1].id
            : null;

        // Count unread (from all notifications, not just current page)
        const unreadCount = notifications.filter(n => !n.is_read).length;

        return successResponse({
            notifications: returnNotifications,
            count: returnNotifications.length,
            unread_count: unreadCount,
            next_cursor: nextCursor,
            has_more: hasMore,
        });

    } catch (error) {
        console.error('Get notifications error:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}

