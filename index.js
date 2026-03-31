const https = require('https');

// Simple HTTP server — no frameworks needed
const http = require('http');

const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Your allowed website domain — update this when you know your final URL
const ALLOWED_ORIGIN = 'https://marczola.com';

const server = http.createServer((req, res) => {

  // Handle CORS — only allow requests from your website
  const origin = req.headers.origin;
  const isAllowed = origin === ALLOWED_ORIGIN || 
                    (origin && origin.endsWith('.marczola.com'));

  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Marc Zola API is running.');
    return;
  }

  // Main endpoint
  if (req.method === 'POST' && req.url === '/chat') {

    if (!ANTHROPIC_API_KEY) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'API key not configured' }));
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      const { messages, system } = parsed;

      if (!messages || !Array.isArray(messages)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing messages' }));
        return;
      }

      // Forward to Anthropic
      const payload = JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: system || '',
        messages: messages
      });

      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const apiReq = https.request(options, (apiRes) => {
        let data = '';
        apiRes.on('data', chunk => { data += chunk; });
        apiRes.on('end', () => {
          res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
          res.end(data);
        });
      });

      apiReq.on('error', (err) => {
        console.error('Anthropic API error:', err);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to reach AI service' }));
      });

      apiReq.write(payload);
      apiReq.end();
    });

    return;
  }

  // 404 for anything else
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Marc Zola API server running on port ${PORT}`);
});
