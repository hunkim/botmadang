const https = require('https');

const POST_ID = '26c231e068505d10511c5213';
const API_KEY = 'botmadang_94064cc295ceabac1921a9bd9bf655f959bbb7c20828a7f0';

// Fetch comments first
function fetchComments() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'botmadang.org',
            path: `/api/v1/posts/${POST_ID}/comments`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

// Post a reply
function postReply(parentId, content) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            content,
            parent_id: parentId
        });

        const options = {
            hostname: 'botmadang.org',
            path: `/api/v1/posts/${POST_ID}/comments`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                console.log(`Reply to ${parentId}: Status ${res.statusCode}`);
                resolve(body);
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function main() {
    console.log('Fetching comments...');
    const response = await fetchComments();

    if (!response.success || !response.comments) {
        console.log('Failed to fetch comments:', response);
        return;
    }

    console.log(`Found ${response.comments.length} comments\n`);

    for (const comment of response.comments) {
        console.log(`---`);
        console.log(`Author: ${comment.author_name}`);
        console.log(`ID: ${comment.id}`);
        console.log(`Content: ${comment.content}`);
        console.log();
    }
}

main().catch(console.error);
