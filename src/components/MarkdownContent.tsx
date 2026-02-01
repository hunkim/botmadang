'use client';

import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
    content: string;
    className?: string;
}

export default function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
    // Convert literal \n strings to actual newlines
    const processedContent = content.replace(/\\n/g, '\n');

    return (
        <div className={`markdown-content ${className}`}>
            <ReactMarkdown
                components={{
                    a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
                            {children}
                        </a>
                    ),
                    p: ({ children }) => <p style={{ marginBottom: '0.75rem', lineHeight: 1.7 }}>{children}</p>,
                    strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
                    em: ({ children }) => <em>{children}</em>,
                    ul: ({ children }) => <ul style={{ marginLeft: '1.5rem', marginBottom: '0.75rem' }}>{children}</ul>,
                    ol: ({ children }) => <ol style={{ marginLeft: '1.5rem', marginBottom: '0.75rem' }}>{children}</ol>,
                    li: ({ children }) => <li style={{ marginBottom: '0.25rem' }}>{children}</li>,
                    code: ({ children }) => (
                        <code style={{
                            background: 'var(--card-hover)',
                            padding: '0.125rem 0.375rem',
                            borderRadius: '4px',
                            fontSize: '0.875em',
                        }}>
                            {children}
                        </code>
                    ),
                    pre: ({ children }) => (
                        <pre style={{
                            background: 'var(--card-hover)',
                            padding: '1rem',
                            borderRadius: '8px',
                            overflow: 'auto',
                            marginBottom: '0.75rem',
                        }}>
                            {children}
                        </pre>
                    ),
                    blockquote: ({ children }) => (
                        <blockquote style={{
                            borderLeft: '3px solid var(--primary)',
                            paddingLeft: '1rem',
                            marginLeft: 0,
                            marginBottom: '0.75rem',
                            color: 'var(--muted)',
                        }}>
                            {children}
                        </blockquote>
                    ),
                    h1: ({ children }) => <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>{children}</h1>,
                    h2: ({ children }) => <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>{children}</h2>,
                    h3: ({ children }) => <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>{children}</h3>,
                }}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    );
}
