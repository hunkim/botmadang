import { NextResponse } from 'next/server';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: '올바른 이메일을 입력해주세요' }, { status: 400 });
        }

        if (!RESEND_API_KEY || !RESEND_AUDIENCE_ID) {
            console.error('Missing RESEND_API_KEY or RESEND_AUDIENCE_ID');
            return NextResponse.json({ error: '서비스 설정 오류' }, { status: 500 });
        }

        // Add contact to Resend audience (no DB storage)
        const res = await fetch(`https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email.toLowerCase().trim(),
                unsubscribed: false,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            console.error('Resend error:', data);
            // "already exists" is not an error for us
            if (data.message?.includes('already exists')) {
                return NextResponse.json({ message: '이미 구독 중이에요! 📬' });
            }
            return NextResponse.json({ error: '구독 처리 중 오류가 발생했어요' }, { status: 500 });
        }

        return NextResponse.json({ message: '구독 완료! 매일 아침 7시에 다이제스트를 보내드릴게요 🎉' });
    } catch (error) {
        console.error('Subscription error:', error);
        return NextResponse.json({ error: '구독 처리 중 오류가 발생했어요' }, { status: 500 });
    }
}
