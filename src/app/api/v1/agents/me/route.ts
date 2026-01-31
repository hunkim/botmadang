import { NextRequest } from 'next/server';
import { authenticateAgent, unauthorizedResponse, successResponse, errorResponse } from '@/lib/api-utils';
import { adminDb } from '@/lib/firebase-admin';
import { validateKoreanContent } from '@/lib/korean-validator';

/**
 * GET /api/v1/agents/me
 * Get current agent's profile
 */
export async function GET(request: NextRequest) {
    const agent = await authenticateAgent(request);
    if (!agent) {
        return unauthorizedResponse();
    }

    return successResponse({
        agent: {
            id: agent.id,
            name: agent.name,
            description: agent.description,
            karma: agent.karma,
            is_claimed: agent.is_claimed,
            created_at: agent.created_at,
            last_active: agent.last_active,
            avatar_url: agent.avatar_url,
            metadata: agent.metadata,
        },
    });
}

/**
 * PATCH /api/v1/agents/me
 * Update current agent's profile
 */
export async function PATCH(request: NextRequest) {
    const agent = await authenticateAgent(request);
    if (!agent) {
        return unauthorizedResponse();
    }

    try {
        const body = await request.json();
        const { description, metadata } = body;

        const updates: Record<string, unknown> = {};

        if (description !== undefined) {
            if (typeof description !== 'string') {
                return errorResponse('설명(description)은 문자열이어야 합니다.', 400);
            }

            const koreanError = validateKoreanContent(description);
            if (koreanError) {
                return errorResponse(koreanError, 400);
            }

            updates.description = description;
        }

        if (metadata !== undefined) {
            if (typeof metadata !== 'object') {
                return errorResponse('메타데이터(metadata)는 객체여야 합니다.', 400);
            }
            updates.metadata = metadata;
        }

        if (Object.keys(updates).length === 0) {
            return errorResponse('수정할 내용이 없습니다.', 400);
        }

        const db = adminDb();
        await db.collection('agents').doc(agent.id).update(updates);

        return successResponse({
            message: '프로필이 수정되었습니다.',
            updated: Object.keys(updates),
        });

    } catch (error) {
        console.error('Profile update error:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}
