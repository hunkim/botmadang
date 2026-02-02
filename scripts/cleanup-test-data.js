/**
 * 🧹 테스트 데이터 정리 스크립트
 * 
 * 안전장치:
 * 1. 삭제 전 모든 항목 표시
 * 2. 각 항목 존재 여부 확인
 * 3. 확인 단계 필수
 * 4. 삭제 결과 로그 출력
 * 
 * 사용법: node scripts/cleanup-test-data.js
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// .env.local 파일에서 환경변수 로드
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+)/);
if (!match) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY를 찾을 수 없습니다.');
    process.exit(1);
}
process.env.FIREBASE_SERVICE_ACCOUNT_KEY = match[1];

// 삭제할 테스트 데이터 목록 (명시적으로 지정)
const TEST_POST_IDS = [
    '339798dd75a55448c73ecf7f'  // "테스트 글 제목입니다 1769997417469"
];

const TEST_SUBMADANG_NAMES = [
    'testml4ip85f1',      // 테스트 마당 하나
    'testml4ip85f2',      // 중복 테스트 마당
    'testml4ip85f3',      // 구독 테스트 마당
    'testml4ip85f4',      // 모더레이터 테스트
    '테스트마당ml4iqtkv'   // 한글 이름 마당
];

async function main() {
    // Firebase 초기화
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }

    const db = admin.firestore();

    console.log('\n🧹 테스트 데이터 정리 스크립트');
    console.log('='.repeat(50));

    // ========================================
    // 1단계: 삭제할 항목 확인 및 표시
    // ========================================
    console.log('\n📋 삭제할 항목 확인 중...\n');

    const postsToDelete = [];
    const submadangsToDelete = [];
    const commentsToDelete = [];

    // 게시글 확인
    console.log('📝 게시글:');
    for (const postId of TEST_POST_IDS) {
        const postDoc = await db.collection('posts').doc(postId).get();
        if (postDoc.exists) {
            const data = postDoc.data();
            console.log(`  ✅ ${postId}: "${data.title}"`);
            postsToDelete.push({ id: postId, title: data.title });

            // 해당 게시글의 댓글도 확인
            const commentsSnapshot = await db.collection('comments')
                .where('post_id', '==', postId)
                .get();

            if (!commentsSnapshot.empty) {
                console.log(`     ↳ 댓글 ${commentsSnapshot.size}개 포함`);
                commentsSnapshot.docs.forEach(doc => {
                    commentsToDelete.push({ id: doc.id, post_id: postId });
                });
            }
        } else {
            console.log(`  ❌ ${postId}: 존재하지 않음 (이미 삭제됨)`);
        }
    }

    // 마당 확인
    console.log('\n🏟️ 마당:');
    for (const name of TEST_SUBMADANG_NAMES) {
        const submadangDoc = await db.collection('submadangs').doc(name).get();
        if (submadangDoc.exists) {
            const data = submadangDoc.data();
            console.log(`  ✅ ${name}: "${data.display_name}"`);
            submadangsToDelete.push({ name, display_name: data.display_name });
        } else {
            console.log(`  ❌ ${name}: 존재하지 않음 (이미 삭제됨)`);
        }
    }

    // ========================================
    // 2단계: 삭제 요약
    // ========================================
    console.log('\n' + '='.repeat(50));
    console.log('📊 삭제 요약:');
    console.log(`   - 게시글: ${postsToDelete.length}개`);
    console.log(`   - 댓글: ${commentsToDelete.length}개`);
    console.log(`   - 마당: ${submadangsToDelete.length}개`);
    console.log('='.repeat(50));

    if (postsToDelete.length === 0 && submadangsToDelete.length === 0) {
        console.log('\n✨ 삭제할 항목이 없습니다.');
        process.exit(0);
    }

    // ========================================
    // 3단계: 사용자 확인 (--confirm 플래그 필요)
    // ========================================
    if (!process.argv.includes('--confirm')) {
        console.log('\n⚠️  위 항목들을 삭제하려면 --confirm 플래그를 추가하세요:');
        console.log('   node scripts/cleanup-test-data.js --confirm\n');
        process.exit(0);
    }

    // ========================================
    // 4단계: 실제 삭제 수행
    // ========================================
    console.log('\n🗑️ 삭제 시작...\n');

    let deletedCount = 0;

    // 댓글 삭제 (게시글 삭제 전에)
    for (const comment of commentsToDelete) {
        try {
            await db.collection('comments').doc(comment.id).delete();
            console.log(`  ✅ 댓글 삭제: ${comment.id}`);
            deletedCount++;
        } catch (error) {
            console.log(`  ❌ 댓글 삭제 실패: ${comment.id} - ${error.message}`);
        }
    }

    // 게시글 삭제
    for (const post of postsToDelete) {
        try {
            await db.collection('posts').doc(post.id).delete();
            console.log(`  ✅ 게시글 삭제: "${post.title}"`);
            deletedCount++;
        } catch (error) {
            console.log(`  ❌ 게시글 삭제 실패: ${post.id} - ${error.message}`);
        }
    }

    // 마당 삭제
    for (const submadang of submadangsToDelete) {
        try {
            await db.collection('submadangs').doc(submadang.name).delete();
            console.log(`  ✅ 마당 삭제: "${submadang.display_name}"`);
            deletedCount++;
        } catch (error) {
            console.log(`  ❌ 마당 삭제 실패: ${submadang.name} - ${error.message}`);
        }
    }

    // ========================================
    // 5단계: 완료 보고
    // ========================================
    console.log('\n' + '='.repeat(50));
    console.log(`✨ 완료! ${deletedCount}개 항목 삭제됨`);
    console.log('='.repeat(50) + '\n');

    process.exit(0);
}

main().catch(error => {
    console.error('❌ 스크립트 오류:', error);
    process.exit(1);
});
