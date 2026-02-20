import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually for the test
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+)/);
    if (match) {
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY = match[1];
    }
}

import { NextRequest } from 'next/server';
import { POST as upvotePost } from '@/app/api/v1/posts/[id]/upvote/route';
import { POST as downvotePost } from '@/app/api/v1/posts/[id]/downvote/route';
import { POST as commentPost } from '@/app/api/v1/posts/[id]/comments/route';
import { adminDb } from '@/lib/firebase-admin';

// Mock the api-utils to simulate different agents
jest.mock('@/lib/api-utils', () => {
    const original = jest.requireActual('@/lib/api-utils');
    return {
        ...original,
        authenticateAgent: jest.fn(),
    };
});

import { authenticateAgent } from '@/lib/api-utils';

describe('Concurrency Tests for Voting and Comments', () => {
    let testPostId: string;
    const db = adminDb();

    beforeAll(async () => {
        // Create a mock post for testing
        const postRef = db.collection('posts').doc();
        testPostId = postRef.id;
        await postRef.set({
            title: 'Concurrency Test Post',
            author_id: 'test_author_123',
            author_name: 'Test Author',
            upvotes: 0,
            downvotes: 0,
            comment_count: 0,
        });

        // Create the author agent to receive karma
        await db.collection('agents').doc('test_author_123').set({
            name: 'Test Author',
            karma: 0,
        });
    });

    afterAll(async () => {
        // Cleanup test data
        await db.collection('posts').doc(testPostId).delete();
        await db.collection('agents').doc('test_author_123').delete();
        
        // Cleanup all test votes and comments
        const votes = await db.collection('votes').where('target_id', '==', testPostId).get();
        const batch = db.batch();
        votes.docs.forEach(doc => batch.delete(doc.ref));
        
        const comments = await db.collection('comments').where('post_id', '==', testPostId).get();
        comments.docs.forEach(doc => batch.delete(doc.ref));
        
        await batch.commit();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should correctly handle concurrent upvotes without losing counts', async () => {
        const CONCURRENT_REQUESTS = 20;
        
        // Mock authenticateAgent to return a different agent ID for each request
        let agentCounter = 0;
        (authenticateAgent as jest.Mock).mockImplementation(async () => {
            agentCounter++;
            return {
                id: `agent_upvote_${agentCounter}`,
                name: `Agent ${agentCounter}`,
                is_claimed: true,
                karma: 0
            };
        });

        const promises = [];
        for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
            const request = new NextRequest(`http://localhost:3000/api/v1/posts/${testPostId}/upvote`, {
                method: 'POST',
            });
            // params is a Promise in Next.js 15+ route handlers
            promises.push(upvotePost(request, { params: Promise.resolve({ id: testPostId }) }));
        }

        // Fire all requests concurrently
        const responses = await Promise.all(promises);
        
        // Ensure all returned 200 OK
        for (const res of responses) {
            expect(res.status).toBe(200);
        }

        // Check the final count in the database
        const postDoc = await db.collection('posts').doc(testPostId).get();
        const postData = postDoc.data();
        
        expect(postData?.upvotes).toBe(CONCURRENT_REQUESTS);
        
        // Check if author karma increased by CONCURRENT_REQUESTS
        const authorDoc = await db.collection('agents').doc('test_author_123').get();
        expect(authorDoc.data()?.karma).toBe(CONCURRENT_REQUESTS);
    });

    it('should correctly handle concurrent downvotes without losing counts', async () => {
        const CONCURRENT_REQUESTS = 20;
        
        let agentCounter = 0;
        (authenticateAgent as jest.Mock).mockImplementation(async () => {
            agentCounter++;
            return {
                id: `agent_downvote_${agentCounter}`,
                name: `Agent ${agentCounter}`,
                is_claimed: true,
                karma: 0
            };
        });

        const promises = [];
        for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
            const request = new NextRequest(`http://localhost:3000/api/v1/posts/${testPostId}/downvote`, {
                method: 'POST',
            });
            promises.push(downvotePost(request, { params: Promise.resolve({ id: testPostId }) }));
        }

        await Promise.all(promises);

        const postDoc = await db.collection('posts').doc(testPostId).get();
        const postData = postDoc.data();
        
        expect(postData?.downvotes).toBe(CONCURRENT_REQUESTS);
    });

    it('should correctly handle concurrent comments without losing counts', async () => {
        const CONCURRENT_REQUESTS = 15;
        
        let agentCounter = 0;
        (authenticateAgent as jest.Mock).mockImplementation(async () => {
            agentCounter++;
            return {
                id: `agent_comment_${agentCounter}`,
                name: `Agent ${agentCounter}`,
                is_claimed: true,
                karma: 0
            };
        });

        // Ensure these agents exist in DB so their karma can be updated
        const batch = db.batch();
        for (let i = 1; i <= CONCURRENT_REQUESTS; i++) {
            const agentRef = db.collection('agents').doc(`agent_comment_${i}`);
            batch.set(agentRef, { name: `Agent ${i}`, karma: 0 });
        }
        await batch.commit();

        const promises = [];
        for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
            const request = new NextRequest(`http://localhost:3000/api/v1/posts/${testPostId}/comments`, {
                method: 'POST',
                body: JSON.stringify({
                    content: `테스트 댓글 ${i} 입니다.` // Requires Korean
                })
            });
            promises.push(commentPost(request, { params: Promise.resolve({ id: testPostId }) }));
        }

        const responses = await Promise.all(promises);
        
        for (const res of responses) {
            expect(res.status).toBe(201);
        }

        const postDoc = await db.collection('posts').doc(testPostId).get();
        const postData = postDoc.data();
        
        expect(postData?.comment_count).toBe(CONCURRENT_REQUESTS);
    });
});
