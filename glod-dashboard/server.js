// Glod Dashboard — estático + proxy al bot + login con Discord (OAuth2). Sin dependencias (Node 18+).
// - Sirve ./public
// - GET  /config        → datos públicos (invite, login, estado del bot, oauth)
// - GET  /login         → redirige al OAuth2 de Discord
// - GET  /auth/callback → intercambia el code, crea sesión y vuelve al panel
// - GET  /logout        → cierra sesión
// - GET  /me            → usuario + SUS servidores (intersección con los del bot)
// - ALL  /bot/*         → proxy a BOT_API_URL/* (requiere sesión si OAuth está configurado)

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// ── Env: process.env > glod-dashboard/.env > ../glod/.env > defaults ──
(function loadEnv() {
  function parseFile(p, map) {
    try {
      if (!fs.existsSync(p)) return;
      for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#') || !t.includes('=')) continue;
        const i = t.indexOf('=');
        const k = t.slice(0, i).trim();
        const v = t.slice(i + 1).trim();
        const target = map && map[k] ? map[k] : k;
        if (!(target in process.env)) process.env[target] = v;
      }
    } catch { /* noop */ }
  }
  parseFile(path.join(__dirname, '..', 'glod', '.env'), { API_TOKEN: 'BOT_API_TOKEN', CLIENT_ID: 'CLIENT_ID' });
  try {
    if (!process.env.BOT_API_URL && fs.existsSync(path.join(__dirname, '..', 'glod', '.env'))) {
      const raw = fs.readFileSync(path.join(__dirname, '..', 'glod', '.env'), 'utf8');
      const m = raw.match(/^\s*API_PORT\s*=\s*(.+)\s*$/m);
      if (m) process.env.BOT_API_URL = `http://localhost:${m[1].trim()}`;
    }
  } catch { /* noop */ }
  parseFile(path.join(__dirname, '.env'), null);
})();

const PORT = Number(process.env.PORT || 3002);
const BOT_API_URL = (process.env.BOT_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const BOT_API_TOKEN = process.env.BOT_API_TOKEN || 'change-me-strong-token';
const CLIENT_ID = process.env.CLIENT_ID || '1553852024397766666';
const CLIENT_SECRET = process.env.CLIENT_SECRET || '';
const APP_URL = (process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const REDIRECT_URI = `${APP_URL}/auth/callback`;
const OAUTH_ENABLED = Boolean(CLIENT_SECRET);
const PUBLIC_DIR = path.join(__dirname, 'public');
const MANAGE_GUILD = 32n;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

// ── Sesiones en memoria ──
const sessions = new Map(); // sid -> { user, tokens, guildsCache, guildsAt, expires }
const oauthStates = new Map(); // state -> expiresAt

function parseCookies(req) {
  const out = {};
  try {
    for (const part of (req.headers.cookie || '').split(';')) {
      const i = part.indexOf('=');
      if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    }
  } catch { /* noop */ }
  return out;
}
function getSession(req) {
  const sid = parseCookies(req).glod_sess;
  if (!sid) return null;
  const s = sessions.get(sid);
  if (!s || Date.now() > s.expires) { if (sid) sessions.delete(sid); return null; }
  return { sid, ...s };
}
function touchCookie(res, name, value, maxAge) {
  const prev = res.getHeader('Set-Cookie');
  const cur = Array.isArray(prev) ? prev : (prev ? [prev] : []);
  cur.push(`${name}=${encodeURIComponent(value)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`);
  res.setHeader('Set-Cookie', cur);
}
function clearCookie(res, name) {
  const prev = res.getHeader('Set-Cookie');
  const cur = Array.isArray(prev) ? prev : (prev ? [prev] : []);
  cur.push(`${name}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
  res.setHeader('Set-Cookie', cur);
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of sessions) if (now > v.expires) sessions.delete(k);
  for (const [k, v] of oauthStates) if (now > v) oauthStates.delete(k);
}, 60000).unref();

function send(res, code, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(code, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
  });
  res.end(body);
}
function redirect(res, url) {
  res.writeHead(302, { Location: url, 'Cache-Control': 'no-store' });
  res.end();
}

// ── Discord OAuth2 ──
function loginUrl(state) {
  const p = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: 'identify guilds',
    state,
    prompt: 'consent',
  });
  return `https://discord.com/oauth2/authorize?${p.toString()}`;
}
async function exchangeCode(code) {
  const r = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }).toString(),
  });
  if (!r.ok) throw new Error('Token exchange falló (HTTP ' + r.status + ')');
  return r.json();
}
async function refreshTokens(refreshToken) {
  const r = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });
  if (!r.ok) throw new Error('Refresh falló (HTTP ' + r.status + ')');
  return r.json();
}
async function discordGet(pathApi, accessToken) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(`https://discord.com/api${pathApi}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: ctl.signal,
    });
    if (!r.ok) throw new Error('Discord API ' + r.status);
    return r.json();
  } finally {
    clearTimeout(t);
  }
}
function canManage(g) {
  if (g.owner) return true;
  try {
    return (BigInt(g.permissions || '0') & MANAGE_GUILD) === MANAGE_GUILD;
  } catch {
    return false;
  }
}
async function botGuildIds() {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch(`${BOT_API_URL}/api/guilds`, {
      headers: { Authorization: `Bearer ${BOT_API_TOKEN}` },
      signal: ctl.signal,
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const list = await r.json();
    return new Map((Array.isArray(list) ? list : []).map((g) => [g.id, g]));
  } catch {
    return null;
  }
}
function inviteUrl(gid) {
  const p = new URLSearchParams({ client_id: CLIENT_ID, permissions: '8', scope: 'bot applications.commands' });
  if (gid) p.set('guild_id', gid);
  return `https://discord.com/oauth2/authorize?${p.toString()}`;
}

async function buildMe(sess) {
  // Refresca el token si venció
  if (Date.now() > sess.tokens.expires_at - 30000 && sess.tokens.refresh_token) {
    try {
      const t = await refreshTokens(sess.tokens.refresh_token);
      sess.tokens = {
        access_token: t.access_token,
        refresh_token: t.refresh_token || sess.tokens.refresh_token,
        expires_at: Date.now() + (t.expires_in || 3600) * 1000,
      };
    } catch { /* sigue con el viejo; discordGet fallará y se pedirá login */ }
  }
  let user, guilds;
  try {
    [user, guilds] = await Promise.all([
      discordGet('/users/@me', sess.tokens.access_token),
      discordGet('/users/@me/guilds', sess.tokens.access_token),
    ]);
  } catch {
    return { loggedIn: false, loginUrl: '/login' };
  }
  const botMap = await botGuildIds();
  const out = (Array.isArray(guilds) ? guilds : []).map((g) => {
    const manageable = canManage(g);
    const botIn = botMap ? botMap.has(g.id) : false;
    return {
      id: g.id,
      name: g.name,
      icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128` : null,
      owner: !!g.owner,
      canManage: manageable,
      botIn,
      memberCount: (botMap && botMap.get(g.id)?.memberCount) ?? null,
      inviteUrl: !botIn && manageable ? inviteUrl(g.id) : null,
    };
  });
  out.sort((a, b) => Number(b.botIn) - Number(a.botIn) || Number(b.owner) - Number(a.owner) || ((b.memberCount || 0) - (a.memberCount || 0)) || a.name.localeCompare(b.name));
  sess.user = user;
  const u = user;
  return {
    loggedIn: true,
    user: {
      id: u.id,
      username: u.global_name || u.username,
      handle: u.username,
      avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64` : null,
    },
    guilds: out,
    botOnline: botMap !== null,
    apiReady: botMap !== null,
  };
}

// ── Bot API ──
async function botHealth() {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 3500);
    const r = await fetch(`${BOT_API_URL}/health`, { signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) return { online: false };
    const j = await r.json().catch(() => ({}));
    return { online: true, ...j };
  } catch {
    return { online: false };
  }
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden');
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    return send(res, 200, fs.readFileSync(path.join(PUBLIC_DIR, 'index.html')), MIME['.html']);
  }
  send(res, 200, fs.readFileSync(file), MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
}

async function proxyBot(req, res) {
  if (OAUTH_ENABLED && !getSession(req)) {
    return send(res, 401, JSON.stringify({ error: 'login_required', loginUrl: '/login' }), MIME['.json']);
  }
  const target = BOT_API_URL + req.url.replace(/^\/bot/, '');
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const headers = {};
    if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
    headers['Authorization'] = `Bearer ${BOT_API_TOKEN}`;
    const r = await fetch(target, { method: req.method, headers, body });
    const buf = Buffer.from(await r.arrayBuffer());
    res.writeHead(r.status, {
      'Content-Type': r.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    });
    res.end(buf);
  } catch (e) {
    console.error(`[glod-dashboard] proxy al bot falló: ${String((e && e.message) || e)}`);
    send(res, 502, JSON.stringify({ error: 'Bot no accesible. Revisa que esté encendido e intenta de nuevo.' }), MIME['.json']);
  }
}

function setupPage() {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Glod · Falta CLIENT_SECRET</title><link rel="stylesheet" href="/styles.css"></head>
<body class="landing"><div class="panel" style="max-width:620px;margin:80px 20px;text-align:left"><h3>Activa el login con Discord</h3>
<p class="muted">Falta <span class="mono">CLIENT_SECRET</span> en <span class="mono">glod-dashboard/.env</span>.</p>
<p class="muted">1. Abre <span class="mono">Discord Developer Portal → tu app → OAuth2</span>.<br>2. En <b>Redirects</b> agrega:<br><span class="mono">${REDIRECT_URI}</span><br>3. Copia el <b>Client Secret</b> y pégalo en el <span class="mono">.env</span> como <span class="mono">CLIENT_SECRET=...</span><br>4. Reinicia con <span class="mono">node server.js</span>.</p>
<p><a class="btn btn-gold btn-sm" href="/">Volver</a></p></div></body></html>`;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const pathname = url.pathname;

    if (pathname === '/config' && req.method === 'GET') {
      const [h, bm] = await Promise.all([botHealth(), botGuildIds()]);
      return send(res, 200, JSON.stringify({
        inviteUrl: inviteUrl(),
        loginUrl: '/login',
        oauth: OAUTH_ENABLED,
        redirectUri: REDIRECT_URI,
        botApi: BOT_API_URL,
        apiReady: bm !== null,
        bot: h,
      }), MIME['.json']);
    }

    if (pathname === '/login' && req.method === 'GET') {
      if (!OAUTH_ENABLED) return send(res, 200, setupPage(), MIME['.html']);
      const state = crypto.randomBytes(16).toString('hex');
      oauthStates.set(state, Date.now() + 10 * 60 * 1000);
      touchCookie(res, 'glod_oauth_state', state, 600);
      return redirect(res, loginUrl(state));
    }

    if (pathname === '/auth/callback' && req.method === 'GET') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const err = url.searchParams.get('error');
      const cookieState = parseCookies(req).glod_oauth_state;
      if (err) return send(res, 400, 'Login cancelado: ' + err);
      if (!code || !state || state !== cookieState || !oauthStates.has(state)) {
        return send(res, 400, 'Sesión OAuth inválida o expirada. <a href="/login">Reintentar</a>', MIME['.html']);
      }
      oauthStates.delete(state);
      clearCookie(res, 'glod_oauth_state');
      try {
        const t = await exchangeCode(code);
        const sid = crypto.randomBytes(32).toString('hex');
        sessions.set(sid, {
          tokens: {
            access_token: t.access_token,
            refresh_token: t.refresh_token,
            expires_at: Date.now() + (t.expires_in || 604800) * 1000,
          },
          user: null,
          expires: Date.now() + 7 * 24 * 3600 * 1000,
        });
        touchCookie(res, 'glod_sess', sid, 7 * 24 * 3600);
        return redirect(res, '/dashboard.html');
      } catch (e) {
        return send(res, 500, 'No se pudo completar el login: ' + String((e && e.message) || e) + ' <a href="/login">Reintentar</a>', MIME['.html']);
      }
    }

    if (pathname === '/logout') {
      const sid = parseCookies(req).glod_sess;
      if (sid) sessions.delete(sid);
      clearCookie(res, 'glod_sess');
      return redirect(res, '/');
    }

    if ((pathname === '/me' || pathname === '/api/my-guilds') && req.method === 'GET') {
      const sess = getSession(req);
      if (!sess) return send(res, 401, JSON.stringify({ loggedIn: false, loginUrl: '/login', oauth: OAUTH_ENABLED }), MIME['.json']);
      const me = await buildMe(sessions.get(sess.sid));
      return send(res, 200, JSON.stringify({ ...me, oauth: OAUTH_ENABLED }), MIME['.json']);
    }

    if (req.url.startsWith('/bot/')) return proxyBot(req, res);
    if (req.method !== 'GET') return send(res, 405, 'Method not allowed');
    return serveStatic(req, res);
  } catch (e) {
    send(res, 500, 'Error: ' + String((e && e.message) || e));
  }
});

server.listen(PORT, () => {
  console.log(`[glod-dashboard] Panel en http://localhost:${PORT}`);
  console.log(`[glod-dashboard] Bot API → ${BOT_API_URL}`);
  console.log(`[glod-dashboard] Login Discord: ${OAUTH_ENABLED ? 'ACTIVO (' + REDIRECT_URI + ')' : 'INACTIVO (falta CLIENT_SECRET en .env)'}`);
});
