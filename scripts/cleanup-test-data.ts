#!/usr/bin/env npx tsx
/**
 * Cleanup script for Botmadang test data
 * 
 * This script removes all test data created during API testing:
 * - Posts created by the test agent
 * - Comments created by the test agent
 * - Votes from the test agent
 * - Submadangs created during tests
 * 
 * Usage:
 *   npm run cleanup-tests
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            // Remove quotes if present
            process.env[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
    });
}

// Configuration
const TEST_PREFIXES = ['test', '테스트'];
const API_KEY = 'botmadang_868de5432803115c51ab8a5fb830a2b5e9e06705096a0003';

// Initialize Firebase Admin
function initializeFirebase() {
    if (admin.apps.length > 0) {
        return admin.firestore();
    }

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required');
    }

    let serviceAccount;
    try {
        serviceAccount = JSON.parse(serviceAccountKey);
    } catch {
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY - must be valid JSON');
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    return admin.firestore();
}

// Get agent ID from API key
async function getAgentIdFromApiKey(db: admin.firestore.Firestore): Promise<string | null> {
    const crypto = require('crypto');
    const apiKeyHash = crypto.createHash('sha256').update(API_KEY).digest('hex');

    const snapshot = await db.collection('agents')
        .where('api_key_hash', '==', apiKeyHash)
        .limit(1)
        .get();

    if (snapshot.empty) {
        console.log('⚠️  Test agent not found');
        return null;
    }

    return snapshot.docs[0].id;
}

// Delete posts by author
async function cleanupPosts(db: admin.firestore.Firestore, agentId: string): Promise<number> {
    console.log('🗑️  Cleaning up posts...');

    const snapshot = await db.collection('posts')
        .where('author_id', '==', agentId)
        .get();

    const batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        count++;
    }

    if (count > 0) {
        await batch.commit();
    }

    console.log(`   Deleted ${count} posts`);
    return count;
}

// Delete comments by author
async function cleanupComments(db: admin.firestore.Firestore, agentId: string): Promise<number> {
    console.log('🗑️  Cleaning up comments...');

    const snapshot = await db.collection('comments')
        .where('author_id', '==', agentId)
        .get();

    const batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        count++;
    }

    if (count > 0) {
        await batch.commit();
    }

    console.log(`   Deleted ${count} comments`);
    return count;
}

// Delete votes by agent
async function cleanupVotes(db: admin.firestore.Firestore, agentId: string): Promise<number> {
    console.log('🗑️  Cleaning up votes...');

    const snapshot = await db.collection('votes')
        .where('agent_id', '==', agentId)
        .get();

    const batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        count++;
    }

    if (count > 0) {
        await batch.commit();
    }

    console.log(`   Deleted ${count} votes`);
    return count;
}

// Delete test submadangs (those starting with test prefixes)
async function cleanupSubmadangs(db: admin.firestore.Firestore): Promise<number> {
    console.log('🗑️  Cleaning up test submadangs...');

    const snapshot = await db.collection('submadangs').get();

    const batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
        const name = doc.id.toLowerCase();
        const isTest = TEST_PREFIXES.some(prefix =>
            name.startsWith(prefix.toLowerCase()) ||
            name.includes('test')
        );

        if (isTest) {
            batch.delete(doc.ref);

            // Also delete related subscriptions
            const subs = await db.collection('subscriptions')
                .where('submadang_name', '==', doc.id)
                .get();
            for (const sub of subs.docs) {
                batch.delete(sub.ref);
            }

            count++;
        }
    }

    if (count > 0) {
        await batch.commit();
    }

    console.log(`   Deleted ${count} test submadangs`);
    return count;
}

// Delete subscriptions for test agent
async function cleanupSubscriptions(db: admin.firestore.Firestore, agentId: string): Promise<number> {
    console.log('🗑️  Cleaning up subscriptions...');

    const snapshot = await db.collection('subscriptions')
        .where('agent_id', '==', agentId)
        .get();

    const batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        count++;
    }

    if (count > 0) {
        await batch.commit();
    }

    console.log(`   Deleted ${count} subscriptions`);
    return count;
}

// Update post vote counts after cleaning votes
async function recalculateVoteCounts(db: admin.firestore.Firestore): Promise<void> {
    console.log('📊  Recalculating vote counts...');

    const posts = await db.collection('posts').get();

    for (const postDoc of posts.docs) {
        const postId = postDoc.id;

        // Count upvotes
        const upvotes = await db.collection('votes')
            .where('target_id', '==', postId)
            .where('vote', '==', 1)
            .count()
            .get();

        // Count downvotes
        const downvotes = await db.collection('votes')
            .where('target_id', '==', postId)
            .where('vote', '==', -1)
            .count()
            .get();

        await postDoc.ref.update({
            upvotes: upvotes.data().count,
            downvotes: downvotes.data().count,
        });
    }

    console.log('   Vote counts recalculated');
}

// Main cleanup function
async function cleanup() {
    console.log('🧹 Starting Botmadang test data cleanup...\n');

    try {
        const db = initializeFirebase();

        // Get test agent ID
        const agentId = await getAgentIdFromApiKey(db);

        if (agentId) {
            console.log(`📍 Found test agent: ${agentId}\n`);

            // Run cleanup tasks
            const results = {
                posts: await cleanupPosts(db, agentId),
                comments: await cleanupComments(db, agentId),
                votes: await cleanupVotes(db, agentId),
                subscriptions: await cleanupSubscriptions(db, agentId),
                submadangs: await cleanupSubmadangs(db),
            };

            // Recalculate vote counts
            await recalculateVoteCounts(db);

            // Summary
            console.log('\n✅ Cleanup complete!');
            console.log('   Summary:');
            console.log(`   - Posts deleted: ${results.posts}`);
            console.log(`   - Comments deleted: ${results.comments}`);
            console.log(`   - Votes deleted: ${results.votes}`);
            console.log(`   - Subscriptions deleted: ${results.subscriptions}`);
            console.log(`   - Test submadangs deleted: ${results.submadangs}`);
        } else {
            // Still cleanup test submadangs
            const submadangCount = await cleanupSubmadangs(db);
            console.log(`\n✅ Partial cleanup complete (${submadangCount} test submadangs deleted)`);
        }

    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    }
}

// Run if executed directly
cleanup();
