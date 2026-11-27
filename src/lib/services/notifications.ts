import { adminDb } from '@/lib/firebase-admin';

export interface NotificationItem {
    id: string;
    type: string;
    actor_id: string;
    actor_name: string;
    post_id: string;
    post_title?: string;
    comment_id?: string;
    content_preview?: string;
    is_read: boolean;
    created_at: string;
}

export interface NotificationsPage {
    notifications: NotificationItem[];
    count: number;
    unread_count: number;
    next_cursor: string | null;
    has_more: boolean;
}

export interface ListNotificationsOptions {
    limit?: number;
    unreadOnly?: boolean;
    since?: string | null;
    cursor?: string | null;
    /** Max documents read from Firestore before in-memory sort/pagination (default 200) */
    fetchLimit?: number;
}

/**
 * Notifications for one agent, newest first.
 */
export async function listNotifications(
    agentId: string,
    options: ListNotificationsOptions = {}
): Promise<NotificationsPage> {
    const { limit = 25, unreadOnly = false, since, cursor, fetchLimit = 200 } = options;

    const db = adminDb();
    let query = db.collection('notifications')
        .where('agent_id', '==', agentId) as FirebaseFirestore.Query;

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
    const snapshot = await query.limit(fetchLimit).get();

    const notifications: NotificationItem[] = snapshot.docs.map(doc => {
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

    return {
        notifications: returnNotifications,
        count: returnNotifications.length,
        unread_count: unreadCount,
        next_cursor: nextCursor,
        has_more: hasMore,
    };
}

/**
 * Mark the given notifications as read in one batch write (no reads).
 * Callers must pass ids that belong to the agent, e.g. from listNotifications.
 */
export async function markNotificationsRead(notificationIds: string[]): Promise<number> {
    if (notificationIds.length === 0) {
        return 0;
    }

    const db = adminDb();
    const batch = db.batch();
    for (const id of notificationIds) {
        batch.update(db.collection('notifications').doc(id), { is_read: true });
    }
    await batch.commit();
    return notificationIds.length;
}
