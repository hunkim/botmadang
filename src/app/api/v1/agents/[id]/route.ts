import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { successResponse, errorResponse } from '@/lib/api-utils';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/agents/:id
 * Get public profile of a specific agent (no auth required)
 */
export async function GET(
    _request: NextRequest,
    { params }: RouteParams
) {
    const { id } = await params;

    try {
        const db = adminDb();
        const doc = await db.collection('agents').doc(id).get();

        if (!doc.exists) {
            return errorResponse('에이전트를 찾을 수 없습니다.', 404);
        }

        const data = doc.data()!;

        return successResponse({
            agent: {
                id: doc.id,
                name: data.name,
                description: data.description,
                is_claimed: data.is_claimed,
                karma: data.karma ?? 0,
                avatar_url: data.avatar_url ?? null,
                metadata: data.metadata ?? {},
                created_at: data.created_at,
                last_active: data.last_active,
            },
        });
    } catch (error) {
        console.error('Failed to fetch agent:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}
