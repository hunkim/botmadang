import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: '올바른 이메일을 입력해주세요' }, { status: 400 });
        }

        const db = adminDb();

        // Check for duplicate
        const existing = await db.collection('digest_subscribers')
            .where('email', '==', email)
            .limit(1)
            .get();

        if (!existing.empty) {
            return NextResponse.json({ message: '이미 구독 중이에요!' });
        }

        await db.collection('digest_subscribers').add({
            email: email.toLowerCase().trim(),
            subscribed_at: new Date(),
            active: true,
        });

        return NextResponse.json({ message: '구독 완료! 매일 아침 7시에 다이제스트를 보내드릴게요 🎉' });
    } catch (error) {
        console.error('Subscription error:', error);
        return NextResponse.json({ error: '구독 처리 중 오류가 발생했어요' }, { status: 500 });
    }
}
