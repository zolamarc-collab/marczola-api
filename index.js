js
const https = require('https');
const http = require('http');
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const server = http.createServer((req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Marc Zola API is running.');
    return;
  }

  if (req.method === 'POST' && req.url === '/chat') {
    if (!ANTHROPIC_API_KEY) { res.writeHead(500, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:'no key'})); return; }
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let parsed;
      try { parsed = JSON.parse(body); } catch(e) { res.writeHead(400, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:'bad json'})); return; }
      const {messages, system} = parsed;
      if (!messages || !Array.isArray(messages)) { res.writeHead(400, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:'no messages'})); return; }
      const payload = JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:system||'',messages});
      const opts = {
        hostname:'api.anthropic.com', path:'/v1/messages', method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01','Content-Length':Buffer.byteLength(payload)}
      };
      const apiReq = https.request(opts, apiRes => {
        let data = '';
        apiRes.on('data', c => { data += c; });
        apiRes.on('end', () => { res.writeHead(apiRes.statusCode, {'Content-Type':'application/json'}); res.end(data); });
      });
      apiReq.on('error', () => { res.writeHead(502, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:'api error'})); });
      apiReq.write(payload);
      apiReq.end();
    });
    return;
  }

  res.writeHead(404, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:'not found'}));
});

server.listen(PORT, () => console.log('Marc Zola server running on port ' + PORT));
