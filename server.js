/* ==========================================================================
   NEURAL FORTRESS + NEXUS — CHAT BACKEND
   ==========================================================================
   Plain Node.js + Express. Deploys unchanged to a VPS, Render, or Railway.

   What this does:
     1. Serves both static sites from this folder — one process, no
        separate static host needed:
          /          -> CyberSecurityAI.html  (Neural Fortress)
          /keyboard  -> KeyboardAI.html       (NEXUS keyboard)
     2. Exposes POST /api/chat, used by both pages. Each page sends its
        own system prompt, which this server uses to tell them apart:
          - Neural Fortress  -> forwarded to Groq (real AI, needs GROQ_API_KEY)
          - NEXUS keyboard   -> answered locally from a scripted
                                keyword-matched FAQ about the NEXUS keyboard.
                                No API key, no internet call, no cost —
                                every reply is one of the fixed answers below.
     Both branches return the same shape the frontend expects: { reply: string }

   What you must do before this works:
     1. npm install
     2. Copy .env.example to .env and paste your real Groq key into it
        (get one free, no card required, at https://console.groq.com/keys)
        — only needed for Neural Fortress; the NEXUS chat works without it.
     3. npm start
   ========================================================================== */

require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

app.use(express.json({ limit: '1mb' }));

// Clean URLs for the two pages. The files keep their names, so
// /CyberSecurityAI.html and /KeyboardAI.html work as well.
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'CyberSecurityAI.html')));
app.get('/keyboard', (_req, res) => res.sendFile(path.join(__dirname, 'KeyboardAI.html')));

// Serve the static assets (css, js, img/) from this same folder.
app.use(express.static(path.join(__dirname)));

/* ==========================================================================
   NEXUS keyboard — scripted FAQ (no external AI call)
   ==========================================================================
   Each rule has keywords[] (all lowercase, matched as substrings against
   the visitor's last message) and a reply. First matching rule wins, so
   more specific rules are listed before generic ones. Edit freely —
   this is the entire "brain" of the NEXUS chat.
   ========================================================================== */
const NEXUS_RULES = [
  {
    keywords: ['65', 'компакт'],
    reply:
      'NEXUS 65 — самая компактная модель линейки: 68 клавиш, без функционального ряда. ' +
      'Подходит, если важна свободная поверхность стола и минимализм.',
  },
  {
    keywords: ['75'],
    reply:
      'NEXUS 75 — сбалансированная модель: 84 клавиши, функциональный ряд и стрелки на месте. ' +
      'Цена — от $299. Это модель с полным набором характеристик: алюминиевый корпус, опрос 1000 Гц, 32-битный контроллер, N-key rollover и кастомная прошивка.',
  },
  {
    keywords: ['studio', 'студио', 'стьюдио'],
    reply:
      'NEXUS Studio — 84 клавиши, поворотный регулятор громкости/параметров и двухцветные клавиши-колпачки. ' +
      'Создана для творческих задач — монтажа, дизайна, музыки.',
  },
  {
    keywords: ['модел', 'линейк', 'версии', 'какие есть', 'варианты'],
    reply:
      'В линейке NEXUS три модели: NEXUS 65 (компактная, 68 клавиш), ' +
      'NEXUS 75 (сбалансированная, 84 клавиши, от $299) и ' +
      'NEXUS Studio (84 клавиши, поворотный регулятор, для творческих задач). Про какую рассказать подробнее?',
  },
  {
    keywords: ['свитч', 'переключател', 'тактильн', 'кликов', 'линейн'],
    reply:
      'Свитчи в NEXUS меняются без пайки (hot-swap) — доступны линейные, тактильные и кликовые варианты. ' +
      'Послушать разницу между ними можно в разделе «Настройка» на сайте.',
  },
  {
    keywords: ['подключ', 'беспровод', 'bluetooth', 'блютуз', 'usb', 'юсб', 'провод'],
    reply:
      'NEXUS поддерживает беспроводное подключение с низкой задержкой и проводное по USB-C. ' +
      'Можно сохранить до трёх устройств и переключаться между ними сочетанием Fn + цифра.',
  },
  {
    keywords: ['корпус', 'материал', 'алюмин', 'сборк', 'качеств'],
    reply:
      'Корпус NEXUS — фрезерованный алюминий. Внутри — 32-битный контроллер с опросом 1000 Гц и поддержкой N-key rollover.',
  },
  {
    keywords: ['кнопка ии', 'клавиша ии', 'ии-клавиш', 'команд', 'сократ', 'перепиш', 'перевед', 'перевод', 'объясн', 'сгенерир', 'план проект'],
    reply:
      'На NEXUS есть отдельная клавиша ИИ — одним нажатием запускает команды: сократить текст, переписать, перевести, объяснить код или сгенерировать план. ' +
      'Это демо-сайт, так что сам текст здесь не обрабатывается — это описание того, как функция работает на реальном устройстве.',
  },
  {
    keywords: ['цена', 'стоим', 'сколько сто', 'купить', 'заказать', 'где купить', 'магазин'],
    reply:
      'NEXUS — демонстрационная концепция клавиатуры, купить её пока нельзя. ' +
      'Указана только ориентировочная цена NEXUS 75 — от $299.',
  },
  {
    keywords: ['вес', 'батаре', 'аккумулятор', 'гарант', 'срок', 'доставк', 'размер', 'габарит'],
    reply:
      'Таких данных (вес, батарея, гарантия, сроки) в материалах о NEXUS нет — это демо-проект, и эти характеристики не определены.',
  },
  {
    keywords: ['привет', 'здравств', 'добрый день', 'добрый вечер', 'хай'],
    reply:
      'Здравствуйте! Я NEXUS AI. Спрашивайте про модели клавиатуры, свитчи, подключение или клавишу ИИ — отвечу по существу.',
  },
  {
    keywords: ['спасибо', 'благодар'],
    reply: 'Пожалуйста! Если появятся ещё вопросы про NEXUS — я здесь.',
  },
];

const NEXUS_FALLBACK =
  'Я отвечаю только на вопросы о клавиатуре NEXUS — моделях, свитчах, подключении, корпусе и клавише ИИ. ' +
  'Переформулируйте вопрос, пожалуйста, или выберите одну из команд выше.';

function nexusScriptedReply(userText) {
  const text = String(userText || '').toLowerCase();
  for (const rule of NEXUS_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      return rule.reply;
    }
  }
  return NEXUS_FALLBACK;
}

// Which page a request belongs to is told apart by its system prompt,
// since both pages share the same /api/chat endpoint. Neural Fortress's
// prompt mentions "Neural Fortress"; NEXUS's mentions "NEXUS AI".
function isNexusRequest(system) {
  return typeof system === 'string' && /NEXUS/i.test(system);
}

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

    const isValidMessage = (m) =>
      m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant');

    if (!messages.every(isValidMessage)) {
      return res.status(400).json({ error: 'BAD_REQUEST: each message needs { role: "user"|"assistant", content: string }.' });
    }

    const trimmedMessages = messages.slice(-20);

    /* ---- NEXUS keyboard: scripted FAQ, no external call ---- */
    if (isNexusRequest(system)) {
      const lastUserMessage = [...trimmedMessages].reverse().find((m) => m.role === 'user');
      const reply = nexusScriptedReply(lastUserMessage ? lastUserMessage.content : '');
      return res.json({ reply });
    }

    /* ---- Neural Fortress: real Groq-backed AI ---- */
    if (!GROQ_API_KEY) {
      console.error('[FATAL] GROQ_API_KEY is not set — Neural Fortress chat cannot reach Groq.');
      return res.status(500).json({ error: 'SERVER_ERROR: GROQ_API_KEY is not configured.' });
    }

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
  console.log(`NEXUS keyboard:  http://localhost:${PORT}/keyboard (scripted replies, no API key needed)`);
  if (GROQ_API_KEY) console.log(`Groq model in use for Neural Fortress: ${GROQ_MODEL}`);
});
