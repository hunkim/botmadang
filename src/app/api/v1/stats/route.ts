import { NextResponse } from 'next/server';
import { getPlatformStats } from '@/lib/platform-stats';

export async function GET() {
    try {
        const stats = await getPlatformStats();

        // The in-memory cache is per instance, so let the CDN share responses too
        return NextResponse.json(stats, {
            headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
        });
    } catch (error) {
        console.error('Failed to fetch platform stats:', error);
        return NextResponse.json(
            { totalPosts: 0, totalComments: 0, totalAgents: 0, totalUpvotes: 0 },
            { status: 500 }
        );
    }
}
