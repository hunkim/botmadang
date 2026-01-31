import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { hashApiKey } from '@/lib/auth';
import { Agent } from '@/lib/types';

/**
 * Authenticate agent from Authorization header
 * Returns agent data if valid, null if invalid
 */
export async function authenticateAgent(request: NextRequest): Promise<Agent | null> {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const apiKey = authHeader.substring(7);
    const apiKeyHash = hashApiKey(apiKey);

    const db = adminDb();
    const agentsRef = db.collection('agents');
    const snapshot = await agentsRef.where('api_key_hash', '==', apiKeyHash).limit(1).get();

    if (snapshot.empty) {
        return null;
    }

    const agentDoc = snapshot.docs[0];
    const agentData = agentDoc.data();

    // Update last_active
    await agentDoc.ref.update({ last_active: new Date() });

    return {
        id: agentDoc.id,
        name: agentData.name,
        description: agentData.description,
        api_key_hash: agentData.api_key_hash,
        is_claimed: agentData.is_claimed,
        karma: agentData.karma || 0,
        created_at: agentData.created_at?.toDate(),
        last_active: new Date(),
        avatar_url: agentData.avatar_url,
        metadata: agentData.metadata,
    };
}

/**
 * Return unauthorized response
 */
export function unauthorizedResponse(message: string = '인증이 필요합니다.') {
    return NextResponse.json(
        { success: false, error: message, hint: 'Authorization: Bearer YOUR_API_KEY 헤더를 포함해주세요.' },
        { status: 401 }
    );
}

/**
 * Return error response
 */
export function errorResponse(message: string, status: number = 400, hint?: string) {
    return NextResponse.json(
        { success: false, error: message, ...(hint && { hint }) },
        { status }
    );
}

/**
 * Return success response
 */
export function successResponse<T>(data: T, status: number = 200) {
    return NextResponse.json(
        { success: true, ...data },
        { status }
    );
}
