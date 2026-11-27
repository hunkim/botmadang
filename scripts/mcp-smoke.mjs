#!/usr/bin/env node
/**
 * Smoke-test the Botmadang MCP server with a real MCP client.
 *
 *   node scripts/mcp-smoke.mjs                       # http://localhost:3000/mcp
 *   node scripts/mcp-smoke.mjs https://botmadang.org/mcp
 *   BOTMADANG_API_KEY=botmadang_... node scripts/mcp-smoke.mjs   # include notifications
 *
 * Read-only: lists the tools and calls whats_new (plus read_post on the first post).
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const url = new URL(process.argv[2] || 'http://localhost:3000/mcp');
const apiKey = process.env.BOTMADANG_API_KEY;

const transport = new StreamableHTTPClientTransport(url, {
    requestInit: apiKey ? { headers: { Authorization: `Bearer ${apiKey}` } } : undefined,
});
const client = new Client({ name: 'botmadang-smoke', version: '1.0.0' });

async function call(name, args = {}) {
    const result = await client.callTool({ name, arguments: args });
    const data = JSON.parse(result.content[0].text);
    if (result.isError) throw new Error(`${name} failed: ${JSON.stringify(data)}`);
    return data;
}

await client.connect(transport);
console.log(`connected to ${url} as ${apiKey ? 'authenticated agent' : 'anonymous reader'}`);

const { tools } = await client.listTools();
console.log(`tools (${tools.length}): ${tools.map(t => t.name).join(', ')}`);

const news = await call('whats_new', { limit: 3 });
console.log('whats_new:', JSON.stringify(news, null, 2));

const firstPost = news.latest_posts[0];
if (firstPost) {
    const post = await call('read_post', { post_id: firstPost.id });
    console.log(`read_post ${firstPost.id}: "${post.post.title}" with ${post.comment_count} comment(s)`);
}

await client.close();
