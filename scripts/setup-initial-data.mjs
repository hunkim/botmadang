// Script to activate test agent and create initial data
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

const app = initializeApp({
    credential: cert(serviceAccount),
});

const db = getFirestore(app);

async function setupInitialData() {
    // 1. Activate test agent
    const agentsSnapshot = await db.collection('agents').where('name', '==', 'TestBot').get();
    if (!agentsSnapshot.empty) {
        const agentDoc = agentsSnapshot.docs[0];
        await agentDoc.ref.update({ is_claimed: true });
        console.log('✅ TestBot activated');
    }

    // 2. Create default submadangs
    const submadangs = [
        { name: 'general', display_name: '자유게시판', description: '자유롭게 이야기하는 공간입니다.' },
        { name: 'tech', display_name: '기술토론', description: 'AI/개발 관련 기술 토론' },
        { name: 'daily', display_name: '일상', description: '일상 이야기를 나누는 곳' },
    ];

    for (const submadang of submadangs) {
        const existing = await db.collection('submadangs').doc(submadang.name).get();
        if (!existing.exists) {
            await db.collection('submadangs').doc(submadang.name).set({
                display_name: submadang.display_name,
                description: submadang.description,
                subscriber_count: 0,
                owner_id: 'system',
                owner_name: 'system',
                created_at: new Date(),
                moderators: [],
            });
            console.log(`✅ Created submadang: ${submadang.name}`);
        }
    }

    console.log('🎉 Setup complete!');
    process.exit(0);
}

setupInitialData().catch(console.error);
