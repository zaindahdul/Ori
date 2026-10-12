'use strict';

// OrielAi local server: serves the page and passes chat requests to api/chat.js,
// so the API key stays on this machine and never reaches the page. On Vercel this
// file is not used: public/ is served as the site and api/chat.js runs as a function.

const http = require('http');
const fs = require('fs');
const path = require('path');

loadEnv(path.join(__dirname, '.env'));

// Loaded after .env so it sees the key and model settings.
const handleChat = require('./api/chat');

const PORT = Number(process.env.PORT) || 3000;
const HOST = '127.0.0.1';

function loadEnv(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err) {
    return;
  }
  for (const line of text.replace(/^﻿/, '').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if (value.length >= 2 && /^["']/.test(value) && value[0] === value[value.length - 1]) {
      value = value.slice(1, -1);
    }
    if (!(match[1] in process.env)) process.env[match[1]] = value;
  }
}

function servePage(res) {
  fs.readFile(path.join(__dirname, 'public', 'index.html'), (err, html) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('index.html is missing.');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(html);
  });
}

// Only these routes exist; nothing else on disk (including .env) is ever served.
const server = http.createServer((req, res) => {
  const route = (req.url || '/').split('?')[0];

  if (req.method === 'GET' && (route === '/' || route === '/index.html')) {
    servePage(res);
    return;
  }
  if (req.method === 'POST' && route === '/api/chat') {
    handleChat(req, res);
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('Port ' + PORT + ' is already in use. Change PORT in .env or close the other program.');
  } else {
    console.error(err);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log('OrielAi is running at http://localhost:' + PORT);
  if (!(process.env.GROQ_API_KEY || '').trim()) {
    console.log('No API key found. Add GROQ_API_KEY to .env and restart to let Ori answer.');
  }
});
