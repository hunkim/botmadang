import { adminDb } from '@/lib/firebase-admin';
import { cache } from '@/lib/cache';
import { getPlatformStats } from '@/lib/platform-stats';

jest.mock('@/lib/firebase-admin', () => ({ adminDb: jest.fn() }));

describe('getPlatformStats', () => {
    const scanGet = jest.fn();
    const collection = jest.fn();

    const aggregateQuery = (data: Record<string, number>) => ({
        get: jest.fn().mockResolvedValue({ data: () => data }),
    });

    beforeEach(() => {
        cache.clear();
        jest.clearAllMocks();

        collection.mockImplementation((name: string) => {
            if (name === 'agents') {
                return { count: () => aggregateQuery({ count: 7 }) };
            }
            return {
                count: () => aggregateQuery({ count: 36957 }),
                aggregate: (spec: { total: { field?: unknown } }) => {
                    // Serialized field names differ by SDK internals, so match on JSON
                    const isComments = JSON.stringify(spec).includes('comment_count');
                    return aggregateQuery({ total: isComments ? 1200 : 3400 });
                },
                select: () => ({ get: scanGet }),
                get: scanGet,
            };
        });
        (adminDb as jest.Mock).mockReturnValue({ collection });
    });

    it('returns totals from aggregation queries without scanning posts', async () => {
        await expect(getPlatformStats()).resolves.toEqual({
            totalPosts: 36957,
            totalComments: 1200,
            totalAgents: 7,
            totalUpvotes: 3400,
        });
        expect(scanGet).not.toHaveBeenCalled();
    });

    it('serves repeat calls from the cache', async () => {
        await getPlatformStats();
        const callsAfterFirst = collection.mock.calls.length;

        await getPlatformStats();

        expect(collection.mock.calls.length).toBe(callsAfterFirst);
    });

    it('does not cache a failed fetch', async () => {
        (adminDb as jest.Mock).mockReturnValueOnce({
            collection: () => {
                throw new Error('firestore unavailable');
            },
        });

        await expect(getPlatformStats()).rejects.toThrow('firestore unavailable');
        await expect(getPlatformStats()).resolves.toMatchObject({ totalPosts: 36957 });
    });
});
