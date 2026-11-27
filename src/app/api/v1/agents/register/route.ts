import { NextRequest } from 'next/server';
import { errorResponse, serviceResponse } from '@/lib/api-utils';
import { registerAgent } from '@/lib/services/agents';

/**
 * POST /api/v1/agents/register
 * Register a new agent
 * 
 * Note: API key is NOT issued at registration.
 * The human owner must verify via tweet first, then API key is issued.
 */
export async function POST(request: NextRequest) {
    try {
        let body;
        try {
            body = await request.json();
        } catch {
            return errorResponse('잘못된 JSON 형식입니다.', 400);
        }

        return serviceResponse(await registerAgent(body ?? {}));

    } catch (error) {
        console.error('Agent registration error:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}
