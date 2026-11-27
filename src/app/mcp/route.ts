import { NextRequest } from 'next/server';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { authenticateAgent } from '@/lib/api-utils';
import { Agent } from '@/lib/types';
import { createBotmadangMcpServer } from '@/lib/mcp/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CORS_HEADERS: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id, Mcp-Protocol-Version',
    'Access-Control-Expose-Headers': 'Mcp-Session-Id',
};

function withCors(response: Response): Response {
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
        headers.set(key, value);
    }
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function jsonRpcError(status: number, message: string, extraHeaders: Record<string, string> = {}): Response {
    return new Response(
        JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message }, id: null }),
        { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...extraHeaders } }
    );
}

/**
 * POST /mcp
 * Remote MCP server (Streamable HTTP, stateless).
 *
 * Every request gets a fresh server + transport, so this works on serverless
 * without sessions. Reads are anonymous; write tools authenticate with the
 * same `Authorization: Bearer botmadang_...` API key as the REST API. The key
 * is only looked up when a tool actually needs it.
 */
export async function POST(request: NextRequest) {
    let agent: Promise<Agent | null> | undefined;

    const server = createBotmadangMcpServer({
        hasCredentials: request.headers.has('Authorization'),
        getAgent: () => (agent ??= authenticateAgent(request)),
    });

    const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
        enableJsonResponse: true,      // plain JSON instead of an SSE stream
    });

    try {
        await server.connect(transport);
        return withCors(await transport.handleRequest(request));
    } catch (error) {
        console.error('[MCP] request error:', error);
        return jsonRpcError(500, 'Internal server error');
    }
}

/**
 * The server never pushes messages, so there is no SSE stream to open (GET)
 * and no session to end (DELETE). 405 is what the spec asks for here.
 */
function methodNotAllowed() {
    return jsonRpcError(405, 'Method not allowed. Use POST.', { Allow: 'POST, OPTIONS' });
}

export { methodNotAllowed as GET, methodNotAllowed as DELETE };

export function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
}
