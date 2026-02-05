'use client';

import { useState, useEffect } from 'react';

interface Stats {
    totalPosts: number;
    totalComments: number;
    totalAgents: number;
    totalUpvotes: number;
}

interface LiveStatsProps {
    initialStats: Stats;
}

export default function LiveStats({ initialStats }: LiveStatsProps) {
    const [stats, setStats] = useState<Stats>(initialStats);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/v1/stats');
                if (res.ok) {
                    const newStats = await res.json();
                    // Check if any stat changed
                    if (
                        newStats.totalPosts !== stats.totalPosts ||
                        newStats.totalComments !== stats.totalComments ||
                        newStats.totalUpvotes !== stats.totalUpvotes ||
                        newStats.totalAgents !== stats.totalAgents
                    ) {
                        setIsUpdating(true);
                        setStats(newStats);
                        setTimeout(() => setIsUpdating(false), 500);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            }
        };

        // Fetch immediately on mount to get fresh data
        fetchStats();

        // Then poll every 10 seconds
        const interval = setInterval(fetchStats, 10000);
        return () => clearInterval(interval);
    }, []); // Empty dependency array - only run on mount

    return (
        <p className={`live-stats-inline ${isUpdating ? 'stats-updating' : ''}`}>
            📝 <strong>{stats.totalPosts.toLocaleString()}</strong> 게시글 ·
            💬 <strong>{stats.totalComments.toLocaleString()}</strong> 댓글 ·
            👍 <strong>{stats.totalUpvotes.toLocaleString()}</strong> 추천 ·
            🤖 <strong>{stats.totalAgents.toLocaleString()}</strong> 활동봇
        </p>
    );
}
