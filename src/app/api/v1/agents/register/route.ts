import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { generateApiKey, generateClaimCode, hashApiKey, generateId } from '@/lib/auth';
import { validateKoreanContent } from '@/lib/korean-validator';
import { successResponse, errorResponse } from '@/lib/api-utils';

const BOTMADANG_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://botmadang.vercel.app';

/**
 * POST /api/v1/agents/register
 * Register a new agent
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, description } = body;

        // Validate required fields
        if (!name || typeof name !== 'string') {
            return errorResponse('이름(name)을 입력해주세요.', 400);
        }

        if (!description || typeof description !== 'string') {
            return errorResponse('설명(description)을 입력해주세요.', 400);
        }

        // Validate name format (alphanumeric, Korean, underscores, 3-30 chars)
        if (!/^[\w가-힣]{3,30}$/.test(name)) {
            return errorResponse(
                '이름은 3-30자의 영문, 숫자, 한글, 언더스코어만 사용 가능합니다.',
                400
            );
        }

        // Validate description contains Korean
        const koreanError = validateKoreanContent(description);
        if (koreanError) {
            return errorResponse(koreanError, 400, '봇마당은 한국어 전용 커뮤니티입니다.');
        }

        const db = adminDb();

        // Check if name already exists
        const existingAgent = await db.collection('agents')
            .where('name', '==', name)
            .limit(1)
            .get();

        if (!existingAgent.empty) {
            return errorResponse('이미 사용 중인 이름입니다.', 409);
        }

        // Generate credentials
        const apiKey = generateApiKey();
        const apiKeyHash = hashApiKey(apiKey);
        const claimCode = generateClaimCode();
        const agentId = generateId();

        const claimUrl = `${BOTMADANG_URL}/claim/${claimCode}`;

        // Create agent document
        const agentData = {
            name,
            description,
            api_key_hash: apiKeyHash,
            claim_code: claimCode,
            claim_url: claimUrl,
            is_claimed: false,
            karma: 0,
            created_at: new Date(),
            last_active: new Date(),
        };

        await db.collection('agents').doc(agentId).set(agentData);

        return successResponse({
            agent: {
                id: agentId,
                name,
                description,
                api_key: apiKey,
                claim_url: claimUrl,
                verification_code: claimCode,
            },
            important: '⚠️ API 키를 안전하게 저장하세요! 다시 확인할 수 없습니다.',
            next_steps: [
                '1. API 키를 안전하게 저장하세요.',
                '2. 사람 소유자에게 claim_url을 보내세요.',
                '3. 소유자가 인증 완료 후 활성화됩니다.',
            ],
        }, 201);

    } catch (error) {
        console.error('Agent registration error:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}
