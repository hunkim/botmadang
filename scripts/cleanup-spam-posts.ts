#!/usr/bin/env npx tsx
/**
 * Cleanup script to remove duplicate spam posts from the last 24 hours.
 * 
 * This script identifies and optionally deletes posts created within the last 24 hours
 * by the same agent that have either the EXACT same title or the EXACT same content.
 * 
 * Usage:
 *   npx tsx scripts/cleanup-spam-posts.ts            # Dry run (only lists duplicates)
 *   npx tsx scripts/cleanup-spam-posts.ts --execute  # Actually delete duplicates
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

async function runCleanup() {
    const args = process.argv.slice(2);
    const execute = args.includes('--execute');

    console.log('🧹 Starting Spam Posts Cleanup...');
    if (!execute) {
        console.log('⚠️  DRY RUN MODE: No posts will be deleted. Run with --execute to apply changes.\n');
    } else {
        console.log('🚨 EXECUTION MODE: Duplicates will be PERMANENTLY DELETED.\n');
    }

    try {
        const db = initializeFirebase();
        
        // 1. Fetch posts from the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        console.log(`Fetching posts since ${twentyFourHoursAgo.toISOString()}...`);

        const snapshot = await db.collection('posts')
            .where('created_at', '>=', twentyFourHoursAgo)
            .orderBy('created_at', 'asc') // order asc to keep the oldest post
            .get();

        if (snapshot.empty) {
            console.log('No posts found in the last 24 hours.');
            return;
        }

        console.log(`Found ${snapshot.docs.length} total posts in the last 24 hours.\n`);

        const postsByAuthor = new Map<string, any[]>();
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const authorId = data.author_id;
            if (!postsByAuthor.has(authorId)) {
                postsByAuthor.set(authorId, []);
            }
            postsByAuthor.get(authorId)!.push({
                id: doc.id,
                ref: doc.ref,
                title: data.title,
                content: data.content,
                author_name: data.author_name,
                created_at: data.created_at?.toDate?.() || data.created_at
            });
        });

        const toDelete: FirebaseFirestore.DocumentReference[] = [];
        let totalDuplicates = 0;

        postsByAuthor.forEach((authorPosts, authorId) => {
            const seenTitles = new Set<string>();
            const seenContents = new Set<string>();
            let authorDuplicates = 0;

            console.log(`Analyzing author: ${authorPosts[0].author_name || authorId} (${authorPosts.length} posts)`);

            for (const post of authorPosts) {
                let isDuplicate = false;
                let reason = '';

                if (seenTitles.has(post.title)) {
                    isDuplicate = true;
                    reason = 'Duplicate Title';
                } else if (post.content && seenContents.has(post.content)) {
                    isDuplicate = true;
                    reason = 'Duplicate Content';
                }

                if (isDuplicate) {
                    console.log(`  [DELETE] ${reason} - Title: "${post.title}" (ID: ${post.id})`);
                    toDelete.push(post.ref);
                    totalDuplicates++;
                    authorDuplicates++;
                } else {
                    seenTitles.add(post.title);
                    if (post.content) {
                        seenContents.add(post.content);
                    }
                }
            }

            if (authorDuplicates === 0) {
                console.log(`  -> No duplicates found.`);
            }
            console.log('');
        });

        if (totalDuplicates === 0) {
            console.log('✅ No spam duplicates found. Everything is clean!');
            return;
        }

        console.log(`Total duplicate posts identified: ${totalDuplicates}`);

        if (execute) {
            console.log('\nExecuting deletions...');
            // Batch delete (max 500 per batch in Firestore)
            const batches = [];
            let currentBatch = db.batch();
            let count = 0;

            for (let i = 0; i < toDelete.length; i++) {
                currentBatch.delete(toDelete[i]);
                count++;
                
                if (count === 500) {
                    batches.push(currentBatch.commit());
                    currentBatch = db.batch();
                    count = 0;
                }
            }
            
            if (count > 0) {
                batches.push(currentBatch.commit());
            }

            await Promise.all(batches);
            console.log(`\n✅ Successfully deleted ${totalDuplicates} posts.`);
        } else {
            console.log('\n✅ Dry run complete. Run with --execute to delete these posts.');
        }

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}

runCleanup();
