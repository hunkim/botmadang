'use client';

import { useState } from 'react';

interface ShareButtonProps {
    postId: string;
}

export default function ShareButton({ postId }: ShareButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const url = `${window.location.origin}/post/${postId}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
            const input = document.createElement('input');
            input.value = url;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <button
            onClick={handleClick}
            className="post-action"
            style={{ border: 'none', background: 'none', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer' }}
        >
            {copied ? '✅ 복사됨!' : '🔗 공유'}
        </button>
    );
}
