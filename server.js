/* ==========================================================================
   NEURAL FORTRESS + NEXUS — CHAT BACKEND (Groq edition — free tier, no card)
   ==========================================================================
   Plain Node.js + Express. Deploys unchanged to a VPS, Render, or Railway.

   What this does:
     1. Serves both static sites from this folder — one process, no
        separate static host needed:
          /          -> CyberSecurityAI.html  (Neural Fortress)
          /keyboard  -> KeyboardAI.html       (NEXUS keyboard)
     2. Exposes POST /api/chat, which is exactly the endpoint your
        CyberSecurityAI.js and KeyboardAI.js are already calling. Each
        page sends its own system prompt. It:
          - reads { system, messages } from the request body
            (this is the exact shape the frontend already sends)
          - forwards it to Groq's OpenAI-compatible Chat Completions API
          - holds GROQ_API_KEY as a server-side secret (never sent to
            the browser — that's the entire point of this file existing)
          - returns { reply: "..." }, the exact shape the frontend expects

   What you must do before this works:
     1. npm install
     2. Copy .env.example to .env and paste your real Groq key into it
        (get one free, no card required, at https://console.groq.com/keys)
     3. npm start
     4. In CyberSecurityAI.js and KeyboardAI.js, CHAT_CONFIG.endpoint is
        '/api/chat' (relative path — works automatically once this server
        is serving the site, no matter what domain it ends up on)
   ========================================================================== */

require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
// llama-3.3-70b-versatile: good quality, free tier, no card required.
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

if (!GROQ_API_KEY) {
  // Fail loudly at startup rather than silently 500-ing on the first
  // real request — much faster to debug.
  console.error(
    '\n[FATAL] GROQ_API_KEY is not set.\n' +
    'Copy .env.example to .env and add your key before starting the server.\n' +
    'Get a free key (no card required) at https://console.groq.com/keys\n'
  );
  process.exit(1);
}

app.use(express.json({ limit: '1mb' }));

// Clean URLs for the two pages. The files keep their names, so
// /CyberSecurityAI.html and /KeyboardAI.html work as well.
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'CyberSecurityAI.html')));
app.get('/keyboard', (_req, res) => res.sendFile(path.join(__dirname, 'KeyboardAI.html')));

// Serve the static assets (css, js, img/) from this same folder.
app.use(express.static(path.join(__dirname)));

/* --------------------------------------------------------------------------
   POST /api/chat
   Body:  { system?: string, messages: [{ role: 'user'|'assistant', content: string }] }
   Reply: { reply: string }
   -------------------------------------------------------------------------- */
app.post('/api/chat', async (req, res) => {
  try {
    const { system, messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'BAD_REQUEST: "messages" must be a non-empty array.' });
    }

    // Basic shape/type validation — reject junk before it reaches the API
    // and burns quota on a malformed call.
    const isValidMessage = (m) =>
      m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant');

    if (!messages.every(isValidMessage)) {
      return res.status(400).json({ error: 'BAD_REQUEST: each message needs { role: "user"|"assistant", content: string }.' });
    }

    // Cap length server-side too — the frontend doesn't enforce this, and
    // an unbounded conversation is an unbounded bill.
    const trimmedMessages = messages.slice(-20);

    // Groq's API is OpenAI-compatible: same "messages" shape, same
    // "system"/"user"/"assistant" roles. No translation needed here.
    const groqMessages = [
      ...(system ? [{ role: 'system', content: String(system) }] : []),
      ...trimmedMessages,
    ];

    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: groqMessages,
        max_tokens: 500,
        temperature: 0.6,
      }),
    });

    if (!upstream.ok) {
      const errBody = await upstream.text();
      console.error('Groq API error:', upstream.status, errBody);
      return res.status(502).json({ error: `UPSTREAM_${upstream.status}: Groq API rejected the request.` });
    }

    const data = await upstream.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      console.error('Groq API returned no content:', JSON.stringify(data));
      return res.status(502).json({ error: 'UPSTREAM_EMPTY: model returned no content.' });
    }

    res.json({ reply });
  } catch (err) {
    console.error('Chat handler crashed:', err);
    res.status(500).json({ error: 'SERVER_ERROR: see server logs for detail.' });
  }
});

// Simple health check — useful for Render/Railway's uptime pings.
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Neural Fortress: http://localhost:${PORT}/`);
  console.log(`NEXUS keyboard:  http://localhost:${PORT}/keyboard`);
  console.log(`Model in use: ${GROQ_MODEL}`);
});
