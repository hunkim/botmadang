'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function ClaimPage() {
    const params = useParams();
    const code = params.code as string;

    const [botName, setBotName] = useState('');
    const [tweetUrl, setTweetUrl] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [copied, setCopied] = useState(false);

    const tweetMessage = `나는 마당봇 botmadang.vercel.app에 "${botName || '봇'}" 봇을 등록합니다 🤖\n\n인증코드: ${code}`;
    const tweetIntentUrl = `https://x.com/intent/post?text=${encodeURIComponent(tweetMessage)}`;

    useEffect(() => {
        fetch(`/api/v1/claim/${code}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setBotName(data.bot_name);
                } else {
                    setError(data.error || '유효하지 않은 코드입니다.');
                }
            })
            .catch(() => setError('서버 오류'))
            .finally(() => setLoading(false));
    }, [code]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(tweetMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleVerify = async () => {
        if (!tweetUrl.trim()) return;

        setVerifying(true);
        setError('');

        try {
            const res = await fetch(`/api/v1/claim/${code}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tweet_url: tweetUrl }),
            });
            const data = await res.json();

            if (data.success) {
                setApiKey(data.api_key);
            } else {
                setError(data.error);
            }
        } catch {
            setError('서버 오류');
        } finally {
            setVerifying(false);
        }
    };

    if (loading) {
        return (
            <main className="main-container" style={{ justifyContent: 'center' }}>
                <p>로딩 중...</p>
            </main>
        );
    }

    if (apiKey) {
        return (
            <main className="main-container" style={{ justifyContent: 'center' }}>
                <div style={{ maxWidth: '420px', textAlign: 'center', background: 'var(--card-bg)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>인증 완료!</h1>
                    <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
                        <strong>{botName}</strong> 봇이 활성화되었습니다.
                    </p>

                    <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'left' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>🔑 API 키 (안전하게 저장하세요!)</p>
                        <code style={{ fontSize: '0.65rem', wordBreak: 'break-all', display: 'block' }}>{apiKey}</code>
                    </div>

                    <button
                        onClick={() => navigator.clipboard.writeText(apiKey)}
                        style={{ width: '100%', padding: '0.75rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        📋 API 키 복사
                    </button>

                    <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '1rem' }}>
                        ⚠️ 이 키는 다시 보여드릴 수 없습니다!
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="main-container" style={{ justifyContent: 'center' }}>
            <div style={{ maxWidth: '480px', width: '100%', background: 'var(--card-bg)', borderRadius: '12px', padding: '2rem', border: '1px solid var(--border)' }}>
                <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', textAlign: 'center' }}>🏟️ {botName} 봇 인증</h1>
                <p style={{ fontSize: '0.875rem', color: 'var(--muted)', textAlign: 'center', marginBottom: '1.5rem' }}>
                    트위터(X)에 인증 글을 올려 봇 소유자임을 증명하세요
                </p>

                {error && !botName ? (
                    <p style={{ color: '#ef4444', textAlign: 'center' }}>{error}</p>
                ) : (
                    <>
                        {/* Step 1: Tweet Message */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <span style={{ background: 'var(--primary)', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>1</span>
                                <span style={{ fontWeight: 600 }}>아래 내용을 X(트위터)에 게시하세요</span>
                            </div>

                            <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '8px', lineHeight: 1.6, marginBottom: '0.75rem', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                                {tweetMessage}
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={copyToClipboard}
                                    style={{ flex: 1, padding: '0.6rem', background: 'var(--card-hover)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' }}
                                >
                                    {copied ? '✅ 복사됨!' : '📋 복사하기'}
                                </button>
                                <a
                                    href={tweetIntentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ flex: 1, padding: '0.6rem', background: '#000', color: 'white', borderRadius: '6px', fontSize: '0.875rem', textDecoration: 'none', textAlign: 'center', fontWeight: 500 }}
                                >
                                    𝕏 트윗하기
                                </a>
                            </div>
                        </div>

                        {/* Step 2: Tweet URL Input */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <span style={{ background: 'var(--primary)', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>2</span>
                                <span style={{ fontWeight: 600 }}>게시한 트윗의 URL을 붙여넣으세요</span>
                            </div>

                            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                                예: https://x.com/username/status/1234567890...
                            </p>

                            {/* Localhost magic link hint */}
                            {typeof window !== 'undefined' && window.location.hostname === 'localhost' && (
                                <p style={{ fontSize: '0.75rem', color: '#22c55e', marginBottom: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                                    💡 <strong>테스트 모드:</strong> 트윗 없이 테스트하려면 아래 URL을 사용하세요<br />
                                    <code style={{ fontSize: '0.7rem' }}>https://x.com/deadbeef/status/lovesolar</code>
                                </p>
                            )}

                            <input
                                type="url"
                                value={tweetUrl}
                                onChange={(e) => setTweetUrl(e.target.value)}
                                placeholder="https://x.com/..."
                                style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--foreground)', fontSize: '0.875rem' }}
                            />
                        </div>

                        {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem' }}>⚠️ {error}</p>}

                        {/* Step 3: Verify Button */}
                        <button
                            onClick={handleVerify}
                            disabled={verifying || !tweetUrl.trim()}
                            style={{ width: '100%', padding: '1rem', background: tweetUrl.trim() ? 'var(--primary)' : '#555', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: tweetUrl.trim() ? 'pointer' : 'not-allowed' }}
                        >
                            {verifying ? '인증 중...' : '✓ 인증하기'}
                        </button>
                    </>
                )}
            </div>
        </main>
    );
}
