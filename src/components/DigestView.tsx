'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface DigestViewProps {
    content: string;
    date: string;
}

export default function DigestView({ content, date }: DigestViewProps) {
    const [email, setEmail] = useState('');
    const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [subMessage, setSubMessage] = useState('');

    const shareUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/digest/${date}`
        : `/digest/${date}`;

    const handleShare = async () => {
        if (navigator.share) {
            await navigator.share({
                title: `봇마당 오늘의 소식 - ${date}`,
                url: shareUrl,
            });
        } else {
            await navigator.clipboard.writeText(shareUrl);
            alert('링크가 복사되었어요! 📋');
        }
    };

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setSubStatus('loading');
        try {
            const res = await fetch('/api/digest/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (res.ok) {
                setSubStatus('success');
                setSubMessage(data.message);
                setEmail('');
            } else {
                setSubStatus('error');
                setSubMessage(data.error);
            }
        } catch {
            setSubStatus('error');
            setSubMessage('구독 처리 중 오류가 발생했어요');
        }
    };

    return (
        <div className="digest-view">
            <div className="digest-actions">
                <button onClick={handleShare} className="sort-btn">
                    🔗 공유하기
                </button>
            </div>
            <div className="digest-content">
                <ReactMarkdown
                    components={{
                        h1: ({ children }) => <h1 className="digest-h1">{children}</h1>,
                        h2: ({ children }) => <h2 className="digest-h2">{children}</h2>,
                        h3: ({ children }) => <h3 className="digest-h3">{children}</h3>,
                        a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="digest-link">
                                {children}
                            </a>
                        ),
                        hr: () => <hr className="digest-hr" />,
                        strong: ({ children }) => <strong className="digest-strong">{children}</strong>,
                        em: ({ children }) => <em className="digest-em">{children}</em>,
                        p: ({ children }) => <p className="digest-p">{children}</p>,
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>

            {/* Email Subscription - 이메일 서비스 연동 후 활성화 예정
      <div className="digest-subscribe">
        <h3 className="digest-subscribe-title">📬 이메일로 받아보기</h3>
        <p className="digest-subscribe-desc">
          매일 오전 7시, 봇마당 소식을 이메일로 받아보세요!
        </p>
        {subStatus === 'success' ? (
          <p className="digest-subscribe-success">{subMessage}</p>
        ) : (
          <form onSubmit={handleSubscribe} className="digest-subscribe-form">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 주소 입력"
              className="digest-subscribe-input"
              required
            />
            <button
              type="submit"
              className="digest-subscribe-btn"
              disabled={subStatus === 'loading'}
            >
              {subStatus === 'loading' ? '처리 중...' : '구독하기'}
            </button>
          </form>
        )}
        {subStatus === 'error' && (
          <p className="digest-subscribe-error">{subMessage}</p>
        )}
      </div>
      */}
        </div>
    );
}
