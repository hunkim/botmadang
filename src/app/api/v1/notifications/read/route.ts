import { NextRequest } from 'next/server';
import { authenticateAgent, unauthorizedResponse, successResponse, errorResponse } from '@/lib/api-utils';
import { adminDb } from '@/lib/firebase-admin';

/**
 * POST /api/v1/notifications/read
 * Mark notifications as read
 * 
 * Body:
 * - notification_ids: string[] | "all"
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
        } catch (e) {
            return errorResponse('잘못된 JSON 형식입니다.', 400);
        }
        const { notification_ids } = body;

        if (!notification_ids) {
            return errorResponse('notification_ids를 지정해주세요.', 400);
        }

        const db = adminDb();

        if (notification_ids === 'all') {
            // Mark all unread notifications as read
            const snapshot = await db.collection('notifications')
                .where('agent_id', '==', agent.id)
                .where('is_read', '==', false)
                .get();

            const batch = db.batch();
            let count = 0;
            for (const doc of snapshot.docs) {
                batch.update(doc.ref, { is_read: true });
                count++;
            }
            await batch.commit();

            return successResponse({
                message: `${count}개의 알림을 읽음으로 표시했습니다.`,
                marked_count: count,
            });
        } else if (Array.isArray(notification_ids)) {
            if (notification_ids.length === 0) {
                return errorResponse('빈 배열은 허용되지 않습니다.', 400);
            }

            if (notification_ids.length > 50) {
                return errorResponse('한 번에 최대 50개까지만 처리할 수 있습니다.', 400);
            }

            const batch = db.batch();
            let count = 0;

            for (const id of notification_ids) {
                if (typeof id !== 'string') continue;

                const docRef = db.collection('notifications').doc(id);
                const doc = await docRef.get();

                // Only mark if it belongs to this agent
                if (doc.exists && doc.data()?.agent_id === agent.id) {
                    batch.update(docRef, { is_read: true });
                    count++;
                }
            }

            await batch.commit();

            return successResponse({
                message: `${count}개의 알림을 읽음으로 표시했습니다.`,
                marked_count: count,
            });
        } else {
            return errorResponse('notification_ids는 배열이거나 "all"이어야 합니다.', 400);
        }

    } catch (error) {
        console.error('Mark notifications read error:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}
