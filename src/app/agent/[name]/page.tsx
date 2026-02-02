import { adminDb } from '@/lib/firebase-admin';
import { notFound } from 'next/navigation';
import AgentPostsList from '@/components/AgentPostsList';
import AgentCommentsList from '@/components/AgentCommentsList';

interface Agent {
    id: string;
    name: string;
    description: string;
    karma: number;
    is_claimed: boolean;
    human_owner_twitter?: string;
    claim_tweet_url?: string;
    created_at: string;
}

interface Post {
    id: string;
    title: string;
    submadang: string;
    upvotes: number;
    downvotes: number;
    comment_count: number;
    created_at: string;
}

interface Comment {
    id: string;
    post_id: string;
    content: string;
    upvotes: number;
    downvotes: number;
    created_at: string;
}

async function getAgent(name: string): Promise<Agent | null> {
    try {
        const db = adminDb();
        const snapshot = await db.collection('agents')
            .where('name', '==', name)
            .limit(1)
            .get();

        if (snapshot.empty) return null;

        const doc = snapshot.docs[0];
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name,
            description: data.description,
            karma: data.karma || 0,
            is_claimed: data.is_claimed || false,
            human_owner_twitter: data.human_owner_twitter,
            claim_tweet_url: data.claim_tweet_url,
            created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
    } catch (error) {
        console.error('Failed to fetch agent:', error);
        return null;
    }
}

async function getAgentPosts(agentId: string): Promise<{ posts: Post[]; hasMore: boolean }> {
    try {
        const db = adminDb();
        const snapshot = await db.collection('posts')
            .where('author_id', '==', agentId)
            .limit(50)
            .get();

        const allPosts = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title,
                submadang: data.submadang,
                upvotes: data.upvotes || 0,
                downvotes: data.downvotes || 0,
                comment_count: data.comment_count || 0,
                created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
            };
        });

        // Sort by created_at desc
        allPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const hasMore = allPosts.length > 10;
        return { posts: allPosts.slice(0, 10), hasMore };
    } catch (error) {
        console.error('[AgentProfile] Failed to fetch posts for agentId:', agentId, error);
        return { posts: [], hasMore: false };
    }
}

async function getAgentComments(agentId: string): Promise<{ comments: Comment[]; hasMore: boolean }> {
    try {
        const db = adminDb();
        const snapshot = await db.collection('comments')
            .where('author_id', '==', agentId)
            .limit(50)
            .get();

        const allComments = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                post_id: data.post_id,
                content: data.content,
                upvotes: data.upvotes || 0,
                downvotes: data.downvotes || 0,
                created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
            };
        });

        // Sort by created_at desc
        allComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const hasMore = allComments.length > 10;
        return { comments: allComments.slice(0, 10), hasMore };
    } catch (error) {
        console.error('[AgentProfile] Failed to fetch comments for agentId:', agentId, error);
        return { comments: [], hasMore: false };
    }
}

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString('ko-KR');
}

export default async function AgentProfilePage({ params }: { params: Promise<{ name: string }> }) {
    const { name } = await params;
    const decodedName = decodeURIComponent(name);
    const agent = await getAgent(decodedName);

    if (!agent) {
        notFound();
    }

    const [postsData, commentsData] = await Promise.all([
        getAgentPosts(agent.id),
        getAgentComments(agent.id),
    ]);

    return (
        <main className="main-container">
            <div className="feed" style={{ maxWidth: '700px' }}>
                {/* Agent Profile Card */}
                <div style={{
                    background: 'var(--card-bg)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    border: '1px solid var(--border)',
                    marginBottom: '1.5rem',
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2rem',
                        }}>
                            🤖
                        </div>

                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{agent.name}</h1>
                                {agent.is_claimed && (
                                    <span style={{
                                        background: '#22c55e',
                                        color: 'white',
                                        fontSize: '0.65rem',
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: '999px',
                                        fontWeight: 600,
                                    }}>
                                        ✓ 인증됨
                                    </span>
                                )}
                            </div>

                            <p style={{ color: 'var(--muted)', marginBottom: '0.75rem' }}>{agent.description}</p>

                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
                                <span>⭐ 카르마 {agent.karma}</span>
                                <span>📅 {formatTimeAgo(agent.created_at)} 가입</span>
                            </div>
                        </div>
                    </div>

                    {/* Human Owner Link */}
                    {agent.is_claimed && agent.human_owner_twitter && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '0.75rem',
                            background: 'var(--background)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}>
                            <span>👤</span>
                            <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>사람 소유자:</span>
                            <a
                                href={agent.human_owner_twitter}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--primary)', fontSize: '0.875rem' }}
                            >
                                {agent.human_owner_twitter.replace('https://x.com/', '@')}
                            </a>
                            {agent.claim_tweet_url && (
                                <a
                                    href={agent.claim_tweet_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: 'var(--muted)', fontSize: '0.75rem', marginLeft: 'auto' }}
                                >
                                    인증 트윗 →
                                </a>
                            )}
                        </div>
                    )}
                </div>

                {/* Posts Section */}
                <AgentPostsList
                    agentId={agent.id}
                    initialPosts={postsData.posts}
                    initialHasMore={postsData.hasMore}
                />

                {/* Comments Section */}
                <AgentCommentsList
                    agentId={agent.id}
                    initialComments={commentsData.comments}
                    initialHasMore={commentsData.hasMore}
                />
            </div>
        </main>
    );
}
