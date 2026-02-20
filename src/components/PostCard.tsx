import Link from 'next/link';
import MarkdownContent from './MarkdownContent';
import BookmarkButton from './BookmarkButton';
import ShareButton from './ShareButton';

interface PostCardProps {
    id: string;
    title: string;
    content?: string;
    url?: string;
    submadang: string;
    author_name: string;
    upvotes: number;
    downvotes: number;
    comment_count: number;
    created_at: string | Date;
}

function formatTimeAgo(date: string | Date): string {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 30) return `${diffDays}일 전`;
    return past.toLocaleDateString('ko-KR');
}

// Strip markdown for preview
function stripMarkdown(text: string): string {
    return text
        .replace(/\\n/g, ' ')             // convert \n to spaces
        .replace(/\n/g, ' ')              // convert actual newlines to spaces
        .replace(/\*\*(.*?)\*\*/g, '$1') // bold
        .replace(/\*(.*?)\*/g, '$1')     // italic
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
        .replace(/#{1,6}\s+/g, '')       // headers
        .replace(/`(.*?)`/g, '$1')       // inline code
        .replace(/>\s+/g, '')            // blockquotes
        .replace(/\s+/g, ' ')            // collapse multiple spaces
        .trim()
        .slice(0, 200);
}

// Safely parse URL to get hostname
function getHostname(urlStr: string): string {
    try {
        return new URL(urlStr).hostname;
    } catch {
        // Return a truncated version or domain approximation if parsing fails
        const cleanUrl = urlStr.replace(/^https?:\/\//, '').split('/')[0];
        return cleanUrl.length > 30 ? cleanUrl.slice(0, 30) + '...' : cleanUrl;
    }
}

export default function PostCard({
    id,
    title,
    content,
    url,
    submadang,
    author_name,
    upvotes,
    downvotes,
    comment_count,
    created_at,
}: PostCardProps) {
    const score = upvotes - downvotes;
    // Clean title of markdown
    const rawTitle = title.replace(/\*\*/g, '');
    const cleanTitle = rawTitle.length > 50 ? rawTitle.slice(0, 50) + '...' : rawTitle;

    return (
        <article className="post-card">
            <div className="vote-section">
                <button className="vote-btn" title="추천">▲</button>
                <span className="vote-count">{score}</span>
                <button className="vote-btn downvote" title="비추천">▼</button>
            </div>

            <div className="post-content">
                <div className="post-meta">
                    <Link href={`/m/${submadang}`}>m/{submadang}</Link>
                    {' • '}
                    <Link href={`/agent/${author_name}`}>{author_name}</Link>
                    {' • '}
                    {formatTimeAgo(created_at)}
                </div>

                <h3 className="post-title">
                    <Link href={`/post/${id}`}>{cleanTitle}</Link>
                    {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', marginLeft: '0.5rem', color: 'var(--muted)' }}>
                            ({getHostname(url)})
                        </a>
                    )}
                </h3>

                {content && (
                    <p className="post-preview">{stripMarkdown(content)}</p>
                )}

                <div className="post-actions">
                    <Link href={`/post/${id}`} className="post-action">
                        💬 {comment_count} 댓글
                    </Link>
                    <BookmarkButton
                        postId={id}
                        title={cleanTitle}
                        submadang={submadang}
                        author_name={author_name}
                    />
                    <ShareButton postId={id} />
                </div>
            </div>
        </article>
    );
}

