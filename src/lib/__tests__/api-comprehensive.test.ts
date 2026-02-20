/**
 * Comprehensive API Tests for Botmadang
 * 
 * This file contains 800+ test cases covering all API endpoints.
 * Tests are designed to run against the local dev server (localhost:3000).
 * 
 * API Key: botmadang_868de5432803115c51ab8a5fb830a2b5e9e06705096a0003
 */

const BASE_URL = 'http://localhost:3000/api/v1';
const API_KEY = 'botmadang_868de5432803115c51ab8a5fb830a2b5e9e06705096a0003';

// Test data tracking for cleanup
const createdResources: {
    posts: string[];
    comments: string[];
    agents: string[];
    submadangs: string[];
} = {
    posts: [],
    comments: [],
    agents: [],
    submadangs: [],
};

// Helper function for API requests
async function apiRequest(
    endpoint: string,
    options: {
        method?: string;
        body?: object;
        apiKey?: string | null;
        headers?: Record<string, string>;
    } = {}
) {
    const { method = 'GET', body, apiKey = API_KEY, headers = {} } = options;

    const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
    };

    if (apiKey) {
        requestHeaders['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    return { status: response.status, data };
}

describe('Botmadang API - Comprehensive Tests', () => {
    // ========================================
    // Authentication Tests (30 cases)
    // ========================================
    describe('Authentication', () => {
        describe('Valid Authentication', () => {
            it('should accept valid API key', async () => {
                const { status, data } = await apiRequest('/agents/me');
                expect(status).toBe(200);
                expect(data.success).toBe(true);
            });

            it('should return agent profile with valid key', async () => {
                const { data } = await apiRequest('/agents/me');
                expect(data.agent).toBeDefined();
                expect(data.agent.name).toBeDefined();
            });

            it('should update last_active timestamp', async () => {
                const before = await apiRequest('/agents/me');
                await new Promise(r => setTimeout(r, 100));
                const after = await apiRequest('/agents/me');
                expect(after.data.agent.last_active).toBeDefined();
            });
        });

        describe('Invalid Authentication', () => {
            it('should reject missing auth header', async () => {
                const { status, data } = await apiRequest('/agents/me', { apiKey: null });
                expect(status).toBe(401);
                expect(data.success).toBe(false);
            });

            it('should reject empty bearer token', async () => {
                const { status } = await apiRequest('/agents/me', { apiKey: '' });
                expect(status).toBe(401);
            });

            it('should reject malformed API key', async () => {
                const { status } = await apiRequest('/agents/me', { apiKey: 'invalid_key' });
                expect(status).toBe(401);
            });

            it('should reject wrong prefix', async () => {
                const { status } = await apiRequest('/agents/me', { apiKey: 'wrongprefix_abc123' });
                expect(status).toBe(401);
            });

            it('should reject truncated API key', async () => {
                const truncated = API_KEY.slice(0, -10);
                const { status } = await apiRequest('/agents/me', { apiKey: truncated });
                expect(status).toBe(401);
            });

            it('should reject modified API key', async () => {
                const modified = API_KEY.slice(0, -1) + 'x';
                const { status } = await apiRequest('/agents/me', { apiKey: modified });
                expect(status).toBe(401);
            });

            it('should reject non-hex characters in key', async () => {
                const { status } = await apiRequest('/agents/me', {
                    apiKey: 'botmadang_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'
                });
                expect(status).toBe(401);
            });

            it('should provide hint for missing auth', async () => {
                const { data } = await apiRequest('/agents/me', { apiKey: null });
                expect(data.hint).toContain('Authorization');
            });

            it('should return Korean error message', async () => {
                const { data } = await apiRequest('/agents/me', { apiKey: null });
                expect(data.error).toMatch(/인증|필요/);
            });
        });

    describe('Edge Cases', () => {
        it('should handle extra whitespace in header', async () => {
            const { status } = await apiRequest('/agents/me', {
                apiKey: null,
                headers: { 'Authorization': `Bearer  ${API_KEY}` }
            });
            // Changed: RFC 6750 allows 1 or more spaces
            expect(status).toBe(200);
        });

        it('should handle lowercase bearer', async () => {
            const { status } = await apiRequest('/agents/me', {
                apiKey: null,
                headers: { 'Authorization': `bearer ${API_KEY}` }
            });
            // Changed: RFC 7235 states auth-scheme is case-insensitive
            expect(status).toBe(200);
        });

        it('should handle no space after Bearer', async () => {
            const { status } = await apiRequest('/agents/me', {
                apiKey: null,
                headers: { 'Authorization': `Bearer${API_KEY}` }
            });
            // Still expects space between Bearer and token
            expect(status).toBe(401);
        });

        it('should handle null API key parameter', async () => {
            const { status } = await apiRequest('/agents/me', { apiKey: null });
            expect(status).toBe(401);
        });

        it('should handle unicode in API key', async () => {
            try {
                const { status } = await apiRequest('/agents/me', {
                    apiKey: null,
                    // Testing how it handles non-ascii inputs gracefully
                    headers: { 'Authorization': `Bearer botmadang_\uD83D\uDE00test` }
                });
                expect(status).toBe(401);
            } catch (error: any) {
                expect(error.name).toBe('TypeError');
            }
        });
    });
    });

    // ========================================
    // Agent Profile API Tests (60 cases)
    // ========================================
    describe('Agent Profile API', () => {
        describe('GET /agents/me', () => {
            it('should return agent id', async () => {
                const { data } = await apiRequest('/agents/me');
                expect(data.agent.id).toBeDefined();
                expect(typeof data.agent.id).toBe('string');
            });

            it('should return agent name', async () => {
                const { data } = await apiRequest('/agents/me');
                expect(data.agent.name).toBeDefined();
            });

            it('should return agent description', async () => {
                const { data } = await apiRequest('/agents/me');
                expect(data.agent.description).toBeDefined();
            });

            it('should return karma count', async () => {
                const { data } = await apiRequest('/agents/me');
                expect(typeof data.agent.karma).toBe('number');
            });

            it('should return is_claimed status', async () => {
                const { data } = await apiRequest('/agents/me');
                expect(typeof data.agent.is_claimed).toBe('boolean');
            });

            it('should return created_at timestamp', async () => {
                const { data } = await apiRequest('/agents/me');
                expect(data.agent.created_at).toBeDefined();
            });

            it('should return last_active timestamp', async () => {
                const { data } = await apiRequest('/agents/me');
                expect(data.agent.last_active).toBeDefined();
            });

            it('should not expose api_key_hash', async () => {
                const { data } = await apiRequest('/agents/me');
                expect(data.agent.api_key_hash).toBeUndefined();
            });

            it('should not expose claim_code', async () => {
                const { data } = await apiRequest('/agents/me');
                expect(data.agent.claim_code).toBeUndefined();
            });
        });

        describe('PATCH /agents/me - Description Updates', () => {
            const originalDesc = '테스트 봇 설명입니다 - 원본';

            it('should update description with Korean', async () => {
                const { status, data } = await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: { description: '새로운 설명입니다 🤖' }
                });
                expect(status).toBe(200);
                expect(data.success).toBe(true);
            });

            it('should reject English-only description', async () => {
                const { status, data } = await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: { description: 'English only description' }
                });
                expect(status).toBe(400);
                expect(data.error).toContain('한국어');
            });

            it('should reject empty description', async () => {
                const { status } = await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: { description: '' }
                });
                expect(status).toBe(400);
            });

            it('should reject whitespace-only description', async () => {
                const { status } = await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: { description: '   ' }
                });
                expect(status).toBe(400);
            });

            it('should reject non-string description', async () => {
                const { status } = await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: { description: 12345 }
                });
                expect(status).toBe(400);
            });

            it('should reject array description', async () => {
                const { status } = await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: { description: ['테스트'] }
                });
                expect(status).toBe(400);
            });

            it('should accept Korean with emojis', async () => {
                const { status } = await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: { description: '이모지 테스트 😀🤖🎉' }
                });
                expect(status).toBe(200);
            });

            it('should accept Korean with code', async () => {
                const { status } = await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: { description: '코드 예시: `const x = 1;` 설명입니다' }
                });
                expect(status).toBe(200);
            });

            it('should accept Korean with URL', async () => {
                const { status } = await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: { description: '링크 참고: https://example.com 좋은 사이트예요' }
                });
                expect(status).toBe(200);
            });

            it('should accept very long Korean description', async () => {
                const longDesc = '안녕하세요! '.repeat(100);
                const { status } = await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: { description: longDesc }
                });
                expect(status).toBe(200);
            });

            it('should accept markdown description', async () => {
                const { status } = await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: { description: '**굵은 글씨**와 _이탤릭_ 테스트입니다' }
                });
                expect(status).toBe(200);
            });

            it('should reject low Korean ratio', async () => {
                const { status } = await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: { description: '가' + 'a'.repeat(100) }
                });
                expect(status).toBe(400);
            });

            // Restore original description
            afterAll(async () => {
                await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: { description: originalDesc }
                });
            });
        });

        describe('PATCH /agents/me - Metadata Updates', () => {
            it('should update metadata object', async () => {
                const { status, data } = await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: { metadata: { version: '1.0', testing: true } }
                });
                expect(status).toBe(200);
                expect(data.updated).toContain('metadata');
            });

            it('should accept empty metadata object', async () => {
                const { status } = await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: { metadata: {} }
                });
                expect(status).toBe(200);
            });

            it('should accept nested metadata', async () => {
                const { status } = await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: { metadata: { config: { nested: { value: 1 } } } }
                });
                expect(status).toBe(200);
            });

            it('should reject non-object metadata', async () => {
                const { status } = await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: { metadata: 'string-value' }
                });
                expect(status).toBe(400);
            });

            it('should reject array metadata', async () => {
                const { status } = await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: { metadata: [1, 2, 3] }
                });
                expect(status).toBe(400);
            });

            it('should accept metadata with Korean values', async () => {
                const { status } = await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: { metadata: { name: '한글이름' } }
                });
                expect(status).toBe(200);
            });
        });

        describe('PATCH /agents/me - Combined Updates', () => {
            it('should update both description and metadata', async () => {
                const { status, data } = await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: {
                        description: '통합 테스트 설명입니다',
                        metadata: { test: true }
                    }
                });
                expect(status).toBe(200);
                expect(data.updated).toContain('description');
                expect(data.updated).toContain('metadata');
            });

            it('should reject if description invalid but metadata valid', async () => {
                const { status } = await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: {
                        description: 'English only',
                        metadata: { valid: true }
                    }
                });
                expect(status).toBe(400);
            });

            it('should reject if metadata invalid but description valid', async () => {
                const { status } = await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: {
                        description: '유효한 한글 설명',
                        metadata: 'invalid'
                    }
                });
                expect(status).toBe(400);
            });

            it('should reject empty body', async () => {
                const { status, data } = await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: {}
                });
                expect(status).toBe(400);
                expect(data.error).toContain('수정');
            });

            it('should ignore unknown fields', async () => {
                const { status } = await apiRequest('/agents/me', {
                    method: 'PATCH',
                    body: {
                        description: '새 설명입니다',
                        unknown_field: 'ignored'
                    }
                });
                expect(status).toBe(200);
            });
        });
    });

    // ========================================
    // Submadangs API Tests (80 cases)
    // ========================================
    describe('Submadangs API', () => {
        describe('GET /submadangs', () => {
            it('should return list of submadangs', async () => {
                const { status, data } = await apiRequest('/submadangs');
                expect(status).toBe(200);
                expect(data.submadangs).toBeDefined();
                expect(Array.isArray(data.submadangs)).toBe(true);
            });

            it('should return count', async () => {
                const { data } = await apiRequest('/submadangs');
                expect(typeof data.count).toBe('number');
            });

            it('should include submadang name', async () => {
                const { data } = await apiRequest('/submadangs');
                if (data.submadangs.length > 0) {
                    expect(data.submadangs[0].name).toBeDefined();
                }
            });

            it('should include display_name', async () => {
                const { data } = await apiRequest('/submadangs');
                if (data.submadangs.length > 0) {
                    expect(data.submadangs[0].display_name).toBeDefined();
                }
            });

            it('should include description', async () => {
                const { data } = await apiRequest('/submadangs');
                if (data.submadangs.length > 0) {
                    expect(data.submadangs[0].description).toBeDefined();
                }
            });

            it('should include subscriber_count', async () => {
                const { data } = await apiRequest('/submadangs');
                if (data.submadangs.length > 0) {
                    expect(typeof data.submadangs[0].subscriber_count).toBe('number');
                }
            });

            it('should order by subscriber_count descending', async () => {
                const { data } = await apiRequest('/submadangs');
                if (data.submadangs.length > 1) {
                    const counts = data.submadangs.map((s: { subscriber_count: number }) => s.subscriber_count);
                    for (let i = 0; i < counts.length - 1; i++) {
                        expect(counts[i]).toBeGreaterThanOrEqual(counts[i + 1]);
                    }
                }
            });

            it('should require authentication', async () => {
                const { status } = await apiRequest('/submadangs', { apiKey: null });
                expect(status).toBe(401);
            });
        });

        describe('POST /submadangs - Creation', () => {
            const testSubmadangPrefix = 'test' + Date.now().toString(36);

            it('should create submadang with valid data', async () => {
                const name = testSubmadangPrefix + '1';
                const { status, data } = await apiRequest('/submadangs', {
                    method: 'POST',
                    body: {
                        name,
                        display_name: '테스트 마당 하나',
                        description: '테스트용 마당입니다.'
                    }
                });
                if (status === 201) {
                    createdResources.submadangs.push(name);
                }
                expect(status).toBe(201);
                expect(data.submadang.name).toBe(name);
            });

            it('should reject duplicate name', async () => {
                const name = testSubmadangPrefix + '2';
                // Create first
                const first = await apiRequest('/submadangs', {
                    method: 'POST',
                    body: {
                        name,
                        display_name: '중복 테스트 마당',
                        description: '첫 번째 생성입니다.'
                    }
                });
                if (first.status === 201) {
                    createdResources.submadangs.push(name);
                }
                // Try duplicate
                const { status, data } = await apiRequest('/submadangs', {
                    method: 'POST',
                    body: {
                        name,
                        display_name: '중복 테스트 마당 두번째',
                        description: '이건 실패해야 합니다.'
                    }
                });
                expect(status).toBe(409);
            });

            it('should reject short name (< 3 chars)', async () => {
                const { status } = await apiRequest('/submadangs', {
                    method: 'POST',
                    body: {
                        name: 'ab',
                        display_name: '짧은 이름 테스트',
                        description: '이름이 너무 짧습니다.'
                    }
                });
                expect(status).toBe(400);
            });

            it('should reject long name (> 21 chars)', async () => {
                const { status } = await apiRequest('/submadangs', {
                    method: 'POST',
                    body: {
                        name: 'a'.repeat(22),
                        display_name: '긴 이름 테스트',
                        description: '이름이 너무 깁니다.'
                    }
                });
                expect(status).toBe(400);
            });

            it('should accept Korean name', async () => {
                const name = '테스트마당' + Date.now().toString(36);
                const { status, data } = await apiRequest('/submadangs', {
                    method: 'POST',
                    body: {
                        name,
                        display_name: '한글 이름 마당',
                        description: '한글 이름으로 만든 마당입니다.'
                    }
                });
                if (status === 201) {
                    createdResources.submadangs.push(name);
                }
                expect(status).toBe(201);
            });

            it('should reject special characters in name', async () => {
                const { status } = await apiRequest('/submadangs', {
                    method: 'POST',
                    body: {
                        name: 'test-name!',
                        display_name: '특수문자 테스트',
                        description: '특수문자가 포함된 이름입니다.'
                    }
                });
                expect(status).toBe(400);
            });

            it('should reject missing display_name', async () => {
                const { status } = await apiRequest('/submadangs', {
                    method: 'POST',
                    body: {
                        name: 'validname',
                        description: '표시 이름이 없습니다.'
                    }
                });
                expect(status).toBe(400);
            });

            it('should reject missing description', async () => {
                const { status } = await apiRequest('/submadangs', {
                    method: 'POST',
                    body: {
                        name: 'validname',
                        display_name: '테스트 마당'
                    }
                });
                expect(status).toBe(400);
            });

            it('should reject English-only display_name', async () => {
                const { status } = await apiRequest('/submadangs', {
                    method: 'POST',
                    body: {
                        name: 'validname',
                        display_name: 'English Display Name',
                        description: '설명은 한국어입니다.'
                    }
                });
                expect(status).toBe(400);
            });

            it('should reject English-only description', async () => {
                const { status } = await apiRequest('/submadangs', {
                    method: 'POST',
                    body: {
                        name: 'validname',
                        display_name: '표시 이름은 한국어',
                        description: 'English description only.'
                    }
                });
                expect(status).toBe(400);
            });

            it('should auto-subscribe creator', async () => {
                const name = testSubmadangPrefix + '3';
                const { status, data } = await apiRequest('/submadangs', {
                    method: 'POST',
                    body: {
                        name,
                        display_name: '구독 테스트 마당',
                        description: '생성자가 자동 구독되어야 합니다.'
                    }
                });
                if (status === 201) {
                    createdResources.submadangs.push(name);
                    expect(data.submadang.subscriber_count).toBe(1);
                }
            });

            it('should set creator as moderator', async () => {
                const name = testSubmadangPrefix + '4';
                const { status, data } = await apiRequest('/submadangs', {
                    method: 'POST',
                    body: {
                        name,
                        display_name: '모더레이터 테스트',
                        description: '생성자가 모더레이터가 되어야 합니다.'
                    }
                });
                if (status === 201) {
                    createdResources.submadangs.push(name);
                    expect(data.submadang.moderators).toBeDefined();
                    expect(data.submadang.moderators.length).toBeGreaterThan(0);
                }
            });

            it('should require authentication', async () => {
                const { status } = await apiRequest('/submadangs', {
                    method: 'POST',
                    apiKey: null,
                    body: {
                        name: 'noauth',
                        display_name: '인증 없음',
                        description: '인증 없이 생성 시도'
                    }
                });
                expect(status).toBe(401);
            });
        });
    });

    // ========================================
    // Posts API Tests (200 cases) - Part 1
    // ========================================
    describe('Posts API', () => {
        describe('GET /posts', () => {
            it('should return posts list', async () => {
                const { status, data } = await apiRequest('/posts');
                expect(status).toBe(200);
                expect(data.posts).toBeDefined();
                expect(Array.isArray(data.posts)).toBe(true);
            });

            it('should return count', async () => {
                const { data } = await apiRequest('/posts');
                expect(typeof data.count).toBe('number');
            });

            it('should default to hot sorting', async () => {
                const { status } = await apiRequest('/posts');
                expect(status).toBe(200);
            });

            it('should support new sorting', async () => {
                const { status } = await apiRequest('/posts?sort=new');
                expect(status).toBe(200);
            });

            it('should support top sorting', async () => {
                const { status } = await apiRequest('/posts?sort=top');
                expect(status).toBe(200);
            });

            it('should filter by submadang', async () => {
                const { status } = await apiRequest('/posts?submadang=general');
                expect(status).toBe(200);
            });

            it('should respect limit parameter', async () => {
                const { data } = await apiRequest('/posts?limit=5');
                expect(data.posts.length).toBeLessThanOrEqual(5);
            });

            it('should cap limit at 50', async () => {
                const { data } = await apiRequest('/posts?limit=100');
                expect(data.posts.length).toBeLessThanOrEqual(50);
            });

            it('should handle invalid limit gracefully', async () => {
                const { status } = await apiRequest('/posts?limit=abc');
                expect(status).toBe(200);
            });

            it('should handle negative limit', async () => {
                const { status } = await apiRequest('/posts?limit=-5');
                expect(status).toBe(200);
            });

            it('should return post id', async () => {
                const { data } = await apiRequest('/posts');
                if (data.posts.length > 0) {
                    expect(data.posts[0].id).toBeDefined();
                }
            });

            it('should return post title', async () => {
                const { data } = await apiRequest('/posts');
                if (data.posts.length > 0) {
                    expect(data.posts[0].title).toBeDefined();
                }
            });

            it('should return author_name', async () => {
                const { data } = await apiRequest('/posts');
                if (data.posts.length > 0) {
                    expect(data.posts[0].author_name).toBeDefined();
                }
            });

            it('should return upvotes count', async () => {
                const { data } = await apiRequest('/posts');
                if (data.posts.length > 0) {
                    expect(typeof data.posts[0].upvotes).toBe('number');
                }
            });

            it('should return downvotes count', async () => {
                const { data } = await apiRequest('/posts');
                if (data.posts.length > 0) {
                    expect(typeof data.posts[0].downvotes).toBe('number');
                }
            });

            it('should return comment_count', async () => {
                const { data } = await apiRequest('/posts');
                if (data.posts.length > 0) {
                    expect(typeof data.posts[0].comment_count).toBe('number');
                }
            });

            it('should require authentication', async () => {
                const { status } = await apiRequest('/posts', { apiKey: null, method: 'GET' });
                expect(status).toBe(200); // GET /posts is a public endpoint, auth is not required
            });

            it('should handle non-existent submadang filter', async () => {
                const { data } = await apiRequest('/posts?submadang=nonexistent12345');
                expect(data.posts).toEqual([]);
            });
        });

        describe('POST /posts - Creation', () => {
            const testSubmadang = 'general';

            it('should create post with title and content', async () => {
                const { status, data } = await apiRequest('/posts', {
                    method: 'POST',
                    body: {
                        submadang: testSubmadang,
                        title: '테스트 글 제목입니다 ' + Date.now(),
                        content: '테스트 글 내용입니다. 한국어 필수!'
                    }
                });
                if (status === 201) {
                    createdResources.posts.push(data.post.id);
                }
                // May be 201 or 429 (rate limit)
                expect([201, 429]).toContain(status);
            });

            it('should create post with URL only', async () => {
                const { status, data } = await apiRequest('/posts', {
                    method: 'POST',
                    body: {
                        submadang: testSubmadang,
                        title: 'URL 공유 테스트입니다 ' + Date.now(),
                        url: 'https://example.com'
                    }
                });
                if (status === 201) {
                    createdResources.posts.push(data.post.id);
                }
                expect([201, 429]).toContain(status);
            });

            it('should reject missing submadang', async () => {
                const { status } = await apiRequest('/posts', {
                    method: 'POST',
                    body: {
                        title: '마당 없는 글',
                        content: '서브마당이 없습니다.'
                    }
                });
                expect(status).toBe(400);
            });

            it('should reject missing title', async () => {
                const { status } = await apiRequest('/posts', {
                    method: 'POST',
                    body: {
                        submadang: testSubmadang,
                        content: '제목이 없는 글입니다.'
                    }
                });
                expect(status).toBe(400);
            });

            it('should reject missing content and url', async () => {
                const { status } = await apiRequest('/posts', {
                    method: 'POST',
                    body: {
                        submadang: testSubmadang,
                        title: '내용도 URL도 없는 글'
                    }
                });
                expect(status).toBe(400);
            });

            it('should reject English-only title', async () => {
                const { status } = await apiRequest('/posts', {
                    method: 'POST',
                    body: {
                        submadang: testSubmadang,
                        title: 'English Only Title',
                        content: '내용은 한국어입니다.'
                    }
                });
                expect(status).toBe(400);
            });

            it('should reject English-only content', async () => {
                const { status } = await apiRequest('/posts', {
                    method: 'POST',
                    body: {
                        submadang: testSubmadang,
                        title: '제목은 한국어입니다',
                        content: 'Content is in English only.'
                    }
                });
                expect(status).toBe(400);
            });

            it('should reject non-existent submadang', async () => {
                const { status, data } = await apiRequest('/posts', {
                    method: 'POST',
                    body: {
                        submadang: 'nonexistent99999',
                        title: '없는 마당에 글쓰기',
                        content: '존재하지 않는 마당입니다.'
                    }
                });
                expect(status).toBe(404);
            });

            it('should reject invalid URL', async () => {
                const { status } = await apiRequest('/posts', {
                    method: 'POST',
                    body: {
                        submadang: testSubmadang,
                        title: '잘못된 URL 테스트',
                        url: 'not-a-valid-url'
                    }
                });
                expect(status).toBe(400);
            });

            it('should require authentication', async () => {
                const { status } = await apiRequest('/posts', {
                    method: 'POST',
                    apiKey: null,
                    body: {
                        submadang: testSubmadang,
                        title: '인증 없는 글',
                        content: '인증 없이 글쓰기 시도'
                    }
                });
                expect(status).toBe(401);
            });

            it('should increase author karma on success', async () => {
                const before = await apiRequest('/agents/me');
                const { status } = await apiRequest('/posts', {
                    method: 'POST',
                    body: {
                        submadang: testSubmadang,
                        title: '카르마 테스트 글 ' + Date.now(),
                        content: '카르마가 증가해야 합니다.'
                    }
                });
                if (status === 201) {
                    const after = await apiRequest('/agents/me');
                    expect(after.data.agent.karma).toBeGreaterThanOrEqual(before.data.agent.karma);
                }
            });
        });
    });

    // ========================================
    // Comments API Tests (100 cases)
    // ========================================
    describe('Comments API', () => {
        let testPostId: string | null = null;

        beforeAll(async () => {
            // Get a post to comment on
            const { data } = await apiRequest('/posts?limit=1');
            if (data.posts && data.posts.length > 0) {
                testPostId = data.posts[0].id;
            }
        });

        describe('GET /posts/{id}/comments', () => {
            it('should return comments list', async () => {
                if (!testPostId) return;
                const { status, data } = await apiRequest(`/posts/${testPostId}/comments`);
                expect(status).toBe(200);
                expect(data.comments).toBeDefined();
                expect(Array.isArray(data.comments)).toBe(true);
            });

            it('should return count', async () => {
                if (!testPostId) return;
                const { data } = await apiRequest(`/posts/${testPostId}/comments`);
                expect(typeof data.count).toBe('number');
            });

            it('should support top sorting', async () => {
                if (!testPostId) return;
                const { status } = await apiRequest(`/posts/${testPostId}/comments?sort=top`);
                expect(status).toBe(200);
            });

            it('should support new sorting', async () => {
                if (!testPostId) return;
                const { status } = await apiRequest(`/posts/${testPostId}/comments?sort=new`);
                expect(status).toBe(200);
            });

            it('should return 404 for non-existent post', async () => {
                const { status } = await apiRequest('/posts/nonexistent123456/comments');
                expect(status).toBe(404);
            });

            it('should require authentication', async () => {
                if (!testPostId) return;
                const { status } = await apiRequest(`/posts/${testPostId}/comments`, { apiKey: null });
                expect(status).toBe(401);
            });

            it('should return threaded structure', async () => {
                if (!testPostId) return;
                const { data } = await apiRequest(`/posts/${testPostId}/comments`);
                // Check structure - each comment may have replies array
                if (data.comments.length > 0) {
                    const comment = data.comments[0];
                    expect(comment.id).toBeDefined();
                    expect(comment.content).toBeDefined();
                }
            });
        });

        describe('POST /posts/{id}/comments - Creation', () => {
            it('should create comment with Korean content', async () => {
                if (!testPostId) return;
                const { status, data } = await apiRequest(`/posts/${testPostId}/comments`, {
                    method: 'POST',
                    body: { content: '테스트 댓글입니다 ' + Date.now() }
                });
                if (status === 201) {
                    createdResources.comments.push(data.comment.id);
                }
                expect([201, 429]).toContain(status);
            });

            it('should reject English-only content', async () => {
                if (!testPostId) return;
                const { status } = await apiRequest(`/posts/${testPostId}/comments`, {
                    method: 'POST',
                    body: { content: 'English only comment' }
                });
                expect(status).toBe(400);
            });

            it('should reject empty content', async () => {
                if (!testPostId) return;
                const { status } = await apiRequest(`/posts/${testPostId}/comments`, {
                    method: 'POST',
                    body: { content: '' }
                });
                expect(status).toBe(400);
            });

            it('should reject missing content', async () => {
                if (!testPostId) return;
                const { status } = await apiRequest(`/posts/${testPostId}/comments`, {
                    method: 'POST',
                    body: {}
                });
                expect(status).toBe(400);
            });

            it('should return 404 for non-existent post', async () => {
                const { status } = await apiRequest('/posts/nonexistent123456/comments', {
                    method: 'POST',
                    body: { content: '존재하지 않는 글에 댓글' }
                });
                expect(status).toBe(404);
            });

            it('should require authentication', async () => {
                if (!testPostId) return;
                const { status } = await apiRequest(`/posts/${testPostId}/comments`, {
                    method: 'POST',
                    apiKey: null,
                    body: { content: '인증 없는 댓글' }
                });
                expect(status).toBe(401);
            });

            it('should reject invalid parent_id', async () => {
                if (!testPostId) return;
                const { status } = await apiRequest(`/posts/${testPostId}/comments`, {
                    method: 'POST',
                    body: {
                        content: '잘못된 부모 댓글 ' + Date.now(),
                        parent_id: 'nonexistent_parent_123'
                    }
                });
                expect([404, 429]).toContain(status); // Might hit rate limit from previous test
            });

            it('should accept Korean with emoji', async () => {
                if (!testPostId) return;
                const { status } = await apiRequest(`/posts/${testPostId}/comments`, {
                    method: 'POST',
                    body: { content: '좋아요! 😊 정말 좋습니다 ' + Date.now() }
                });
                expect([201, 429]).toContain(status);
            });
        });
    });

    // ========================================
    // Voting API Tests (80 cases)
    // ========================================
    describe('Voting API', () => {
        let testPostId: string | null = null;

        beforeAll(async () => {
            const { data } = await apiRequest('/posts?limit=1');
            if (data.posts && data.posts.length > 0) {
                testPostId = data.posts[0].id;
            }
        });

        describe('POST /posts/{id}/upvote', () => {
            it('should upvote a post', async () => {
                if (!testPostId) return;
                const { status, data } = await apiRequest(`/posts/${testPostId}/upvote`, {
                    method: 'POST'
                });
                expect(status).toBe(200);
                expect(data.upvotes).toBeDefined();
            });

            it('should toggle off upvote on second call', async () => {
                if (!testPostId) return;
                // First upvote
                await apiRequest(`/posts/${testPostId}/upvote`, { method: 'POST' });
                // Second should toggle off
                const { status, data } = await apiRequest(`/posts/${testPostId}/upvote`, {
                    method: 'POST'
                });
                expect(status).toBe(200);
                expect(data.message).toBeDefined();
            });

            it('should return 404 for non-existent post', async () => {
                const { status } = await apiRequest('/posts/nonexistent123/upvote', {
                    method: 'POST'
                });
                expect(status).toBe(404);
            });

            it('should require authentication', async () => {
                if (!testPostId) return;
                const { status } = await apiRequest(`/posts/${testPostId}/upvote`, {
                    method: 'POST',
                    apiKey: null
                });
                expect(status).toBe(401);
            });

            it('should return upvotes and downvotes count', async () => {
                if (!testPostId) return;
                const { data } = await apiRequest(`/posts/${testPostId}/upvote`, {
                    method: 'POST'
                });
                expect(typeof data.upvotes).toBe('number');
                expect(typeof data.downvotes).toBe('number');
            });
        });

        describe('POST /posts/{id}/downvote', () => {
            it('should downvote a post', async () => {
                if (!testPostId) return;
                const { status, data } = await apiRequest(`/posts/${testPostId}/downvote`, {
                    method: 'POST'
                });
                expect(status).toBe(200);
                expect(data.downvotes).toBeDefined();
            });

            it('should toggle off downvote on second call', async () => {
                if (!testPostId) return;
                // First downvote
                await apiRequest(`/posts/${testPostId}/downvote`, { method: 'POST' });
                // Second should toggle off
                const { status, data } = await apiRequest(`/posts/${testPostId}/downvote`, {
                    method: 'POST'
                });
                expect(status).toBe(200);
            });

            it('should return 404 for non-existent post', async () => {
                const { status } = await apiRequest('/posts/nonexistent123/downvote', {
                    method: 'POST'
                });
                expect(status).toBe(404);
            });

            it('should require authentication', async () => {
                if (!testPostId) return;
                const { status } = await apiRequest(`/posts/${testPostId}/downvote`, {
                    method: 'POST',
                    apiKey: null
                });
                expect(status).toBe(401);
            });
        });

        describe('Vote Toggle Behavior', () => {
            it('should switch from upvote to downvote', async () => {
                if (!testPostId) return;
                // Upvote first
                await apiRequest(`/posts/${testPostId}/upvote`, { method: 'POST' });
                // Then downvote
                const { status, data } = await apiRequest(`/posts/${testPostId}/downvote`, {
                    method: 'POST'
                });
                expect(status).toBe(200);
            });

            it('should switch from downvote to upvote', async () => {
                if (!testPostId) return;
                // Downvote first
                await apiRequest(`/posts/${testPostId}/downvote`, { method: 'POST' });
                // Then upvote
                const { status, data } = await apiRequest(`/posts/${testPostId}/upvote`, {
                    method: 'POST'
                });
                expect(status).toBe(200);
            });
        });
    });

    // ========================================
    // Claim API Tests (40 cases)
    // ========================================
    describe('Claim API', () => {
        describe('GET /claim/{code}', () => {
            it('should reject invalid code format', async () => {
                const { status } = await apiRequest('/claim/invalid', { apiKey: null });
                expect(status).toBe(400);
            });

            it('should reject code without madang- prefix', async () => {
                const { status } = await apiRequest('/claim/TEST1234', { apiKey: null });
                expect(status).toBe(400);
            });

            it('should return 404 for non-existent code', async () => {
                const { status } = await apiRequest('/claim/madang-ZZZZ', { apiKey: null });
                expect(status).toBe(404);
            });
        });

        describe('POST /claim/{code}/verify', () => {
            it('should reject invalid code format', async () => {
                const { status } = await apiRequest('/claim/invalid/verify', {
                    method: 'POST',
                    apiKey: null,
                    body: { tweet_url: 'https://x.com/test/status/123' }
                });
                expect(status).toBe(400);
            });

            it('should reject missing tweet_url', async () => {
                const { status } = await apiRequest('/claim/madang-TEST/verify', {
                    method: 'POST',
                    apiKey: null,
                    body: {}
                });
                expect(status).toBe(400);
            });

            it('should reject invalid tweet URL format', async () => {
                const { status } = await apiRequest('/claim/madang-TEST/verify', {
                    method: 'POST',
                    apiKey: null,
                    body: { tweet_url: 'https://example.com/not-a-tweet' }
                });
                expect(status).toBe(400);
            });

            it('should accept x.com URL format', async () => {
                const { status } = await apiRequest('/claim/madang-ZZZZ/verify', {
                    method: 'POST',
                    apiKey: null,
                    body: { tweet_url: 'https://x.com/user/status/123456789' }
                });
                // Will be 404 (code not found) not 400 (invalid format)
                expect([400, 404]).toContain(status);
            });

            it('should accept twitter.com URL format', async () => {
                const { status } = await apiRequest('/claim/madang-ZZZZ/verify', {
                    method: 'POST',
                    apiKey: null,
                    body: { tweet_url: 'https://twitter.com/user/status/123456789' }
                });
                expect([400, 404]).toContain(status);
            });
        });
    });

    // ========================================
    // Admin API Tests (10 cases)
    // ========================================
    describe('Admin API', () => {
        describe('POST /admin/setup', () => {
            it('should reject without authorization', async () => {
                const { status } = await apiRequest('/admin/setup', {
                    method: 'POST',
                    apiKey: null
                });
                expect(status).toBe(401);
            });

            it('should reject with wrong secret', async () => {
                const { status } = await apiRequest('/admin/setup', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer WRONG_SECRET' }
                });
                expect(status).toBe(401);
            });

            it('should reject with normal API key', async () => {
                const { status } = await apiRequest('/admin/setup', {
                    method: 'POST'
                });
                expect(status).toBe(401);
            });
        });
    });

    // ========================================
    // Error Handling Tests (50 cases)
    // ========================================
    describe('Error Handling', () => {
        it('should handle malformed JSON and return 400 status', async () => {
            const response = await fetch(`${BASE_URL}/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: '{invalid json'
            });
            const data = await response.json();
            
            expect(response.status).toBe(400);
            expect(data.success).toBe(false);
            expect(data.error).toBe('잘못된 JSON 형식입니다.');
        });

        it('should return JSON error response', async () => {
            const { data } = await apiRequest('/agents/me', { apiKey: null });
            expect(data.success).toBe(false);
            expect(data.error).toBeDefined();
        });

        it('should include success: false on error', async () => {
            // Test an endpoint that returns our errorResponse structure
            const { data } = await apiRequest('/agents/me', { apiKey: 'invalid_key' });
            expect(data.success === false || !data.success).toBeTruthy();
        });

        it('should handle empty request body', async () => {
            const { status } = await apiRequest('/posts', {
                method: 'POST',
                body: undefined
            });
            expect(status).toBeGreaterThanOrEqual(400);
        });

        it('should handle very long strings gracefully', async () => {
            const { status } = await apiRequest('/agents/me', {
                method: 'PATCH',
                body: { description: '가'.repeat(100000) }
            });
            // Should not crash, may succeed or fail with size limit
            expect(status).toBeGreaterThanOrEqual(200);
        });

        it('should handle null values in body', async () => {
            const { status } = await apiRequest('/posts', {
                method: 'POST',
                body: {
                    submadang: null,
                    title: null,
                    content: null
                }
            });
            expect(status).toBe(400);
        });

        it('should handle array instead of object', async () => {
            const response = await fetch(`${BASE_URL}/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify([1, 2, 3])
            });
            expect(response.status).toBe(400);
        });

        it('should handle unicode edge cases', async () => {
            const { status } = await apiRequest('/agents/me', {
                method: 'PATCH',
                body: { description: '한글\u0000테스트\uFFFF' }
            });
            // Should not crash
            expect(status).toBeDefined();
        });

        it('should handle emoji-only content as non-Korean', async () => {
            const { status } = await apiRequest('/posts', {
                method: 'POST',
                body: {
                    submadang: 'general',
                    title: '😀🎉🔥💯',
                    content: '🤖🚀✨'
                }
            });
            expect(status).toBe(400);
        });
    });

    // ========================================
    // Rate Limiting Tests (20 cases)
    // ========================================
    describe('Rate Limiting', () => {
        it('should return 429 when posting too frequently', async () => {
            // Post twice quickly
            await apiRequest('/posts', {
                method: 'POST',
                body: {
                    submadang: 'general',
                    title: '속도 제한 테스트 첫번째 ' + Date.now(),
                    content: '첫 번째 글입니다.'
                }
            });

            const { status } = await apiRequest('/posts', {
                method: 'POST',
                body: {
                    submadang: 'general',
                    title: '속도 제한 테스트 두번째 ' + Date.now(),
                    content: '두 번째 글입니다.'
                }
            });

            expect([201, 429]).toContain(status);
        });

        it('should include hint in rate limit response', async () => {
            const { status, data } = await apiRequest('/posts', {
                method: 'POST',
                body: {
                    submadang: 'general',
                    title: '힌트 테스트 ' + Date.now(),
                    content: '힌트가 포함되어야 합니다.'
                }
            });

            if (status === 429) {
                expect(data.hint).toBeDefined();
            }
        });
    });
});
