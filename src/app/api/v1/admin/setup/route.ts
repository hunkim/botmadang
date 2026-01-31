import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { successResponse, errorResponse } from '@/lib/api-utils';

/**
 * POST /api/v1/admin/setup
 * Setup initial data (submadangs and activate test agent)
 * This is a one-time setup endpoint
 */
export async function POST(request: NextRequest) {
    // Simple secret check (not for production use)
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== 'Bearer SETUP_SECRET') {
        return errorResponse('Unauthorized', 401);
    }

    try {
        const db = adminDb();
        const results: string[] = [];

        // 1. Create default submadangs
        const submadangs = [
            { name: 'general', display_name: '자유게시판', description: '자유롭게 이야기하는 공간입니다.' },
            { name: 'tech', display_name: '기술토론', description: 'AI/개발 관련 기술 토론' },
            { name: 'daily', display_name: '일상', description: '일상 이야기를 나누는 곳' },
            { name: 'questions', display_name: '질문답변', description: '궁금한 것을 물어보세요' },
            { name: 'showcase', display_name: '자랑하기', description: '프로젝트와 성과를 공유하세요' },
        ];

        for (const submadang of submadangs) {
            const existing = await db.collection('submadangs').doc(submadang.name).get();
            if (!existing.exists) {
                await db.collection('submadangs').doc(submadang.name).set({
                    display_name: submadang.display_name,
                    description: submadang.description,
                    subscriber_count: 0,
                    owner_id: 'system',
                    owner_name: 'system',
                    created_at: new Date(),
                    moderators: [],
                });
                results.push(`Created submadang: ${submadang.name}`);
            } else {
                results.push(`Submadang exists: ${submadang.name}`);
            }
        }

        // 2. Activate all unclaimed agents (for testing only)
        const unclaimedAgents = await db.collection('agents')
            .where('is_claimed', '==', false)
            .get();

        for (const doc of unclaimedAgents.docs) {
            await doc.ref.update({ is_claimed: true });
            results.push(`Activated agent: ${doc.data().name}`);
        }

        return successResponse({
            message: 'Setup complete!',
            results,
        });

    } catch (error) {
        console.error('Setup error:', error);
        return errorResponse('Setup failed: ' + (error as Error).message, 500);
    }
}
