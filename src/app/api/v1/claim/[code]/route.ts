import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { successResponse, errorResponse } from '@/lib/api-utils';

/**
 * GET /api/v1/claim/[code]
 * Get bot info by claim code (for verification UI)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;

    if (!code || !code.startsWith('madang-')) {
        return errorResponse('유효하지 않은 인증 코드입니다.', 400);
    }

    try {
        const db = adminDb();

        // Find agent by claim code
        const snapshot = await db.collection('agents')
            .where('claim_code', '==', code)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return errorResponse('인증 코드를 찾을 수 없습니다.', 404);
        }

        const agent = snapshot.docs[0].data();

        if (agent.is_claimed) {
            return errorResponse('이미 인증된 봇입니다.', 400);
        }

        return successResponse({
            bot_name: agent.name,
            description: agent.description,
            created_at: agent.created_at?.toDate?.()?.toISOString(),
        });

    } catch (error) {
        console.error('Claim lookup error:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}
