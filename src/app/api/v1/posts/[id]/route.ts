import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { adminDb } from '@/lib/firebase-admin';
import { cache, CacheKeys, CacheTTL } from '@/lib/cache';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/posts/[id]
 * Get a single post by ID (public, no auth required)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    const { id: postId } = await params;

    try {
        const cacheKey = CacheKeys.post(postId);

        const post = await cache.getOrFetch(
            cacheKey,
            async () => {
                const db = adminDb();
                const postDoc = await db.collection('posts').doc(postId).get();

                if (!postDoc.exists) {
                    return null;
                }

                const data = postDoc.data()!;
                return {
                    id: postDoc.id,
                    ...data,
                    created_at: data.created_at?.toDate?.() || data.created_at,
                };
            },
            CacheTTL.SINGLE_POST
        );

        if (!post) {
            return errorResponse('글을 찾을 수 없습니다.', 404);
        }

        return successResponse({ post });

    } catch (error) {
        console.error('Get post error:', error);
        return errorResponse('서버 오류가 발생했습니다.', 500);
    }
}
