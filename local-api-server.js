/**
 * Local development API server — zero extra dependencies.
 * Mirrors api/search.ts for use with `npm start` (CRA proxy).
 *
 * Usage:
 *   node local-api-server.js
 *   (in a separate terminal, run: npm start)
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env manually (no dotenv dependency needed)
function loadEnv() {
  try {
    const content = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch (_) { /* .env not found — rely on real env vars */ }
}
loadEnv();

const PORT = 3001;

function callGemini(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    });
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log('[gemini] status:', res.statusCode);
          console.log('[gemini] raw:', data.slice(0, 500));
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          resolve(text);
        } catch (e) { reject(new Error('Failed to parse Gemini response: ' + data.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (req.url === '/api/search' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const { query, dressCodes } = JSON.parse(body);

        if (!query?.trim())
          return json(res, 400, { error: 'query is required' });
        if (!Array.isArray(dressCodes) || dressCodes.length === 0)
          return json(res, 400, { error: 'dressCodes array is required' });
        if (!process.env.GEMINI_API_KEY)
          return json(res, 500, { error: 'GEMINI_API_KEY not configured' });

        const safeQuery = query.replace(/"""/g, "'''");
        const prompt = `You are a dress code assistant. Given the user's query, rank the following dress codes by relevance.
Return ONLY valid JSON: an array of { "id": string, "relevance": number (1-5), "reason": string (one sentence) }.
Only include dress codes with relevance >= 2. Sort by descending relevance.

User query: """${safeQuery}"""

Dress codes:
${JSON.stringify(dressCodes, null, 2)}`;

        const text = await callGemini(prompt);
        console.log('[search] Gemini raw response:', text.slice(0, 300));
        const s = text.indexOf('['), e = text.lastIndexOf(']');
        if (s === -1 || e === -1) throw new Error(`Gemini response had no JSON array. Got: ${text.slice(0, 200)}`);

        const results = JSON.parse(text.slice(s, e + 1));
        return json(res, 200, { results });
      } catch (err) {
        return json(res, 500, { error: err.message || 'Search failed' });
      }
    });
  } else {
    json(res, 404, { error: 'Not found' });
  }
});

server.listen(PORT, () => {
  const key = process.env.GEMINI_API_KEY;
  console.log(`✅ Local API server → http://localhost:${PORT}`);
  console.log(`   GEMINI_API_KEY: ${key ? '✓ loaded' : '✗ MISSING — check .env'}`);
  console.log(`   Now run: npm start (in another terminal)`);
});
