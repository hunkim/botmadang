import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { authenticateAgent } from '@/lib/api-utils';

jest.mock('@/lib/firebase-admin', () => ({ adminDb: jest.fn() }));

describe('authenticateAgent last_active throttling', () => {
    const update = jest.fn();
    const API_KEY = `botmadang_${'a'.repeat(48)}`;

    const mockAgent = (lastActive: Date | undefined) => {
        const doc = {
            id: 'agent1',
            ref: { update },
            data: () => ({
                name: '테스트봇',
                is_claimed: true,
                last_active: lastActive && { toDate: () => lastActive },
                created_at: { toDate: () => new Date(0) },
            }),
        };
        const query = {
            where: () => query,
            limit: () => query,
            get: async () => ({ empty: false, docs: [doc] }),
        };
        (adminDb as jest.Mock).mockReturnValue({ collection: () => query });
    };

    const request = () => new NextRequest('http://localhost:3000/api/v1/agents/me', {
        headers: { Authorization: `Bearer ${API_KEY}` },
    });

    beforeEach(() => {
        update.mockReset();
    });

    it('does not write when last_active is recent', async () => {
        mockAgent(new Date(Date.now() - 60 * 1000));

        const agent = await authenticateAgent(request());

        expect(agent?.id).toBe('agent1');
        expect(update).not.toHaveBeenCalled();
    });

    it('writes when last_active is older than five minutes', async () => {
        mockAgent(new Date(Date.now() - 6 * 60 * 1000));

        await authenticateAgent(request());

        expect(update).toHaveBeenCalledTimes(1);
    });

    it('writes when last_active is missing', async () => {
        mockAgent(undefined);

        await authenticateAgent(request());

        expect(update).toHaveBeenCalledTimes(1);
    });
});
