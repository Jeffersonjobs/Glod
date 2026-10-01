/* Glod Dashboard — lógica del panel. Habla con el bot vía /bot/* (proxy). Modo demo si el bot está offline. */
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const state = { guilds: [], gid: localStorage.getItem('glod_gid') || '', detail: null, settings: null, stats: null, demo: false, color: '#d4af37', oauth: false, me: null };
let chActivity = null, chPie = null;

const DEMO = {
  guilds: [{ id: 'demo1', name: 'Servidor Demo', memberCount: 1284, channels: 24, roles: 18, icon: null }],
  detail: { id: 'demo1', name: 'Servidor Demo', memberCount: 1284, boosts: 7, channels: [
    { id: '111', name: 'bienvenidas', type: 0 }, { id: '222', name: 'anuncios', type: 0 }, { id: '333', name: 'general', type: 0 }],
    roles: [{ id: '1', name: '@everyone', color: '#000000', position: 0 }, { id: '2', name: 'Miembro', color: '#d4af37', position: 3 }, { id: '3', name: 'VIP Dorado', color: '#e8c97a', position: 8 }] },
  settings: { locale: 'es', welcome: { enabled: true, channelId: '111', message: 'Bienvenido/a {user} a **{server}**. Eres el miembro #{count}.', embed: true, leaveEnabled: true, leaveChannelId: '333', leaveMessage: '{username} salió de **{server}**.', autoRoles: ['2'] }, leveling: { enabled: true, channelId: null }, muteRoleId: '', suggestionChannelId: '333' },
  stats: { members: 1284, channels: 24, roles: 18, boosts: 7, levels: { users: 342, totalXp: 89120 }, economy: { users: 210, totalCoins: 540300 }, tickets: { open: 3, closed: 41, total: 44 }, warnings: 12, giveaways: { active: 2, total: 9 }, suggestions: { pending: 5, total: 23 }, uptime: 86400000, commands: 87, series: { labels: ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'], joins: [4, 9, 6, 12, 18, 22, 11], messages: [120, 200, 160, 310, 420, 510, 300] } },
};

function toast(msg, ok = true) {
  const d = document.createElement('div');
  d.className = 'msg'; d.style.borderColor = ok ? 'var(--border)' : 'rgba(231,76,60,.5)'; d.textContent = msg;
  $('#toast').appendChild(d); setTimeout(() => d.remove(), 3800);
}
async function api(path, opts = {}) {
  const r = await fetch('bot' + path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const t = await r.text();
  let j = null; try { j = JSON.parse(t); } catch { j = { raw: t }; }
  if (!r.ok) throw new Error((j && j.error) || ('HTTP ' + r.status));
  return j;
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ago = (d) => { try { return new Date(d).toLocaleString('es'); } catch { return '—'; } };

// ── Navegación ──
$$('.navbtn').forEach((b) => b.addEventListener('click', () => {
  $$('.navbtn').forEach((x) => x.classList.remove('active')); b.classList.add('active');
  $$('.view').forEach((v) => v.classList.remove('on'));
  $('#v-' + b.dataset.view).classList.add('on');
}));

// ── Arranque (la llamada va al final del archivo, cuando ya existen todas las constantes) ──
async function init() {
  buildColorPicker();
  bindWelcome(); bindAnnounce(); bindSettings();
  $('#reloadBtn').addEventListener('click', () => loadGuilds(true));
  $('#authArea').addEventListener('click', (e) => {
    const t = e.target.closest('a'); if (!t) return;
    if (t.id === 'simpleLink') { e.preventDefault(); localStorage.setItem('glod_simple', '1'); location.reload(); }
    if (t.id === 'exitSimple') { e.preventDefault(); localStorage.removeItem('glod_simple'); location.reload(); }
  });
  $('#guildSelect').addEventListener('change', (e) => { state.gid = e.target.value; localStorage.setItem('glod_gid', state.gid); if (state.gid) loadGuild(state.gid); });
  await loadConfig(); await loadGuilds();
}
async function loadConfig() {
  try {
    const c = await (await fetch('config')).json();
    state.oauth = !!c.oauth;
    const on = c.bot && c.bot.online;
    $('#botStatus').innerHTML = `<span class="statusdot ${on ? '' : 'off'}"></span>${on ? `En línea · ${c.bot.guilds} servidores` : 'Offline · modo demo'}`;
    $('#connBox').textContent = `botApi=${c.botApi} online=${on} guilds=${c.bot?.guilds ?? 0} uptime=${Math.round((c.bot?.uptime ?? 0) / 60000)}min cmds=${c.bot?.commands ?? 0} apiReady=${c.apiReady} redirect=${c.redirectUri || ''}`;
    $('#healthBox').textContent = JSON.stringify(c.bot, null, 2);
  } catch { /* noop */ }
}
function renderAuth(user) {
  const box = $('#authArea');
  if (user === 'local') { box.innerHTML = '<span class="muted">Modo local</span><a class="logout" id="exitSimple" href="#">Usar login</a>'; return; }
  if (!user) { box.innerHTML = '<a class="btn btn-gold btn-sm" href="login">Entrar con Discord</a> <a href="#" id="simpleLink" class="muted" style="font-size:12px">Sin login</a>'; return; }
  box.innerHTML = `${user.avatar ? `<img src="${esc(user.avatar)}" alt="">` : ''}<span>${esc(user.username)}</span><a class="logout" href="logout">Salir</a>`;
}
function showLoginBanner() {
  const b = $('#modeBanner');
  b.style.display = 'flex'; b.className = 'banner';
  b.innerHTML = 'Inicia sesión con Discord para ver tus servidores. <a class="btn btn-gold btn-sm" href="login" style="margin-left:8px">Entrar con Discord</a>';
}
function renderInvites(missing) {
  const box = $('#inviteBox');
  if (!missing || !missing.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
  box.style.display = 'block';
  box.innerHTML = `<h3>El bot aún no está en estos servidores tuyos</h3><div class="hint">Toca Invitar, autoriza y recarga.</div>` +
    missing.map((g) => `<div class="inviteRow">${g.icon ? `<img src="${esc(g.icon)}" alt="">` : ''}<span style="flex:1"><b>${esc(g.name)}</b><br><span class="muted mono">${g.id}</span></span><a class="btn btn-gold btn-sm" href="${esc(g.inviteUrl)}" target="_blank" rel="noopener">Invitar bot</a></div>`).join('');
}
function fillGuildSelect() {
  const sel = $('#guildSelect'); sel.innerHTML = '';
  state.guilds.forEach((g) => { const o = document.createElement('option'); o.value = g.id; o.textContent = `${g.name} (${g.memberCount ?? '?'} miembros)`; sel.appendChild(o); });
  if (!state.gid || !state.guilds.find((g) => g.id === state.gid)) state.gid = state.guilds[0]?.id || '';
  sel.value = state.gid;
}
async function loadGuilds() {
  const simple = localStorage.getItem('glod_simple') === '1';
  // 1) Intenta sesión Discord: muestra SOLO los servidores del usuario
  if (!simple) {
    try {
      const me = await (await fetch('me')).json();
      if (me && me.loggedIn) {
      state.me = me; state.demo = false; banner(false);
      renderAuth(me.user);
      const manageable = (me.guilds || []).filter((g) => g.canManage);
      renderInvites(manageable.filter((g) => !g.botIn));
      state.guilds = manageable.filter((g) => g.botIn);
      if (me.apiReady === false) {
        banner('info', 'Tu bot tiene la API vieja. En CMD ve a la carpeta glod y corre "npm run build", reinicia con "npm start" y recarga el panel.');
      } else if (!me.botOnline) {
        banner('info', 'El bot está apagado. Enciéndelo (npm start en glod/) para ver datos en vivo.');
      }
      if (!manageable.length) {
        $('#guildSelect').innerHTML = '<option value="">Sin servidores gestionables</option>';
        banner('info', 'No gestionas ningún servidor de Discord con esta cuenta.');
        hideBoot();
        return;
      }
      if (!state.guilds.length) {
        $('#guildSelect').innerHTML = '<option value="">El bot no está en tus servidores</option>';
        hideBoot();
        return;
      }
      fillGuildSelect();
      if (state.gid) loadGuild(state.gid);
      hideBoot();
      return;
    }
  } catch { /* sin sesión: sigue abajo */ }
  }
  renderAuth(simple && state.oauth ? 'local' : null);
  if (!simple && state.oauth) {
    // Login obligatorio: entra directo al login y de ahí a tu panel
    location.href = 'login';
    return;
  }
  // 2) Modo abierto (sin OAuth configurado): como antes + demo si el bot está off
  try {
    const g = await api('/api/guilds');
    state.guilds = g; state.demo = false;
    banner(false);
  } catch (e) {
    state.guilds = DEMO.guilds; state.demo = true;
    banner('demo', 'Modo demo — el bot está offline. Inicia el bot (`npm run dev` en glod/) y recarga para datos reales.');
  }
  renderInvites([]);
  fillGuildSelect();
  if (state.gid) loadGuild(state.gid);
  hideBoot();
}
function hideBoot() { const b = document.getElementById('boot'); if (b) b.classList.add('off'); }
function banner(kind, msg = '') {
  const b = $('#modeBanner');
  if (!kind) { b.style.display = 'none'; return; }
  b.style.display = 'flex'; b.className = kind === 'demo' ? 'banner demo' : 'banner'; b.textContent = msg;
}

// ── Carga de un servidor ──
async function loadGuild(gid) {
  if (state.demo) {
    state.detail = DEMO.detail; state.settings = JSON.parse(JSON.stringify(DEMO.settings)); state.stats = DEMO.stats;
    renderAll({ leaderboard: [], economyTop: [], warnings: [], tickets: [], giveaways: [], suggestions: [] });
    toast('Modo demo: explora libremente, nada se envía a Discord');
    hideBoot();
    return;
  }
  try {
    const [detail, settings, stats] = await Promise.all([
      api(`/api/guilds/${gid}`), api(`/api/guilds/${gid}/settings`), api(`/api/guilds/${gid}/stats`),
    ]);
    state.detail = detail; state.settings = settings; state.stats = stats;
    const [leaderboard, economyTop, warnings, tickets, giveaways, suggestions] = await Promise.all([
      api(`/api/guilds/${gid}/leaderboard`).catch(() => []),
      api(`/api/guilds/${gid}/economy-top`).catch(() => []),
      api(`/api/guilds/${gid}/warnings`).catch(() => []),
      api(`/api/guilds/${gid}/tickets`).catch(() => []),
      api(`/api/guilds/${gid}/giveaways`).catch(() => []),
      api(`/api/guilds/${gid}/suggestions`).catch(() => []),
    ]);
    renderAll({ leaderboard, economyTop, warnings, tickets, giveaways, suggestions });
  } catch (e) {
    if (String((e && e.message) || e).includes('login_required')) { location.href = 'login'; return; }
    toast('Error cargando servidor: ' + e.message, false);
  }
  hideBoot();
}

function renderAll(extra) {
  const d = state.detail, s = state.stats;
  $('#guildName').textContent = d.name || 'Servidor';
  $('#guildSub').textContent = `${s?.members ?? d.memberCount ?? '?'} miembros · ${d.channelsCount ?? d.channels?.length ?? '?'} canales · ID ${d.id}`;
  renderStats(); renderCharts(); renderChannels(); renderWelcome(); renderSettings(); renderTables(extra);
}

function renderStats() {
  const s = state.stats; if (!s) return;
  const cards = [
    ['MIEMBROS', `<em>${s.members}</em>`, `boosts: ${s.boosts} · roles: ${s.roles}`],
    ['CANALES', s.channels, `${state.detail.channels?.length ?? s.channels} texto`],
    ['NIVELES', s.levels.users, `${s.levels.totalXp.toLocaleString('es')} XP total`],
    ['ECONOMÍA', s.economy.users, `${s.economy.totalCoins.toLocaleString('es')} monedas`],
    ['TICKETS ABIERTOS', `<em>${s.tickets.open}</em>`, `${s.tickets.total} totales`],
    ['AVISOS', s.warnings, `${s.suggestions.pending} sugerencias pendientes`],
    ['SORTEOS ACTIVOS', s.giveaways.active, `${s.giveaways.total} totales`],
    ['COMANDOS', s.commands, `uptime ${Math.round(s.uptime / 3600000)}h`],
  ];
  $('#statCards').innerHTML = cards.map(([k, v, dsc]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${dsc}</div></div>`).join('');
  $('#sysInfo').innerHTML = `XP total <b>${s.levels.totalXp.toLocaleString('es')}</b> · Monedas <b>${s.economy.totalCoins.toLocaleString('es')}</b> · Tickets cerrados <b>${s.tickets.closed}</b>`;
}

function renderCharts() {
  if (typeof Chart === 'undefined') return;
  const s = state.stats; if (!s?.series) return;
  if (chActivity) chActivity.destroy(); if (chPie) chPie.destroy();
  const gold = '#d4af37', soft = '#e8c97a';
  Chart.defaults.color = '#a7a5a0'; Chart.defaults.borderColor = 'rgba(255,255,255,.07)';
  chActivity = new Chart($('#chActivity'), { type: 'line', data: { labels: s.series.labels, datasets: [
    { label: 'Nuevos', data: s.series.joins, borderColor: gold, backgroundColor: 'rgba(212,175,55,.15)', fill: true, tension: .45 },
    { label: 'Mensajes', data: s.series.messages, borderColor: soft, borderDash: [6, 5], tension: .45 }] },
    options: { plugins: { legend: { labels: { boxWidth: 12 } } }, scales: { y: { beginAtZero: true } } } });
  chPie = new Chart($('#chPie'), { type: 'doughnut', data: { labels: ['Niveles', 'Economía', 'Tickets', 'Sugerencias'], datasets: [{ data: [s.levels.users, s.economy.users, s.tickets.total, s.suggestions.total], backgroundColor: ['#d4af37', '#e8c97a', '#5865f2', '#2ecc71'], borderWidth: 0 }] }, options: { cutout: '68%' } });
}

// ── Canales / roles ──
function textChannels() { return (state.detail?.channels || []).filter((c) => c.type === 0 || c.type === 5); }
function renderChannels() {
  const chs = textChannels(), roles = state.detail?.roles || [];
  $('#chList').innerHTML = chs.length ? `<table class="tbl"><tr><th>Canal</th><th>ID</th><th></th></tr>${chs.map((c) => `<tr><td># ${esc(c.name)}</td><td class="mono">${c.id}</td><td><button class="btn btn-ghost btn-sm" data-use="${c.id}">Usar</button></td></tr>`).join('')}</table>` : '<p class="muted">Sin canales (¿bot offline?).</p>';
  $('#roleList').innerHTML = roles.length ? roles.slice(0, 40).map((r) => `<div class="switchrow"><span class="rolebadge"><span class="roledot" style="background:${esc(r.color === '#000000' ? '#888' : r.color)}"></span>${esc(r.name)}</span><span class="mono muted">${r.id}</span></div>`).join('') : '<p class="muted">Sin roles.</p>';
  $$('#chList [data-use]').forEach((b) => b.addEventListener('click', () => { $('#aChannel').value = b.dataset.use; updateAnnouncePreview(); toast('Canal destino actualizado'); }));
  // selects de canales
  const opts = chs.map((c) => `<option value="${c.id}"># ${esc(c.name)}</option>`).join('');
  for (const id of ['#wChannel', '#wLeaveChannel', '#aChannel', '#sLvlChannel']) { const el = $(id); const cur = el.value; el.innerHTML = `<option value="">— ninguno —</option>` + opts; if (cur) el.value = cur; }
  const men = $('#aMention'); const curM = men.value;
  men.innerHTML = `<option value="">Sin mención</option><option value="everyone">@everyone</option><option value="here">@here</option>` + roles.filter((r) => r.name !== '@everyone').slice(0, 20).map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
  if (curM) men.value = curM;
}

// ── Bienvenida ──
function bindWelcome() {
  $$('#v-welcome [data-ins]').forEach((b) => b.addEventListener('click', () => {
    const t = $('#wMessage'); const s = t.selectionStart ?? t.value.length;
    t.value = t.value.slice(0, s) + b.dataset.ins + t.value.slice(t.selectionEnd ?? s); t.focus(); updateWelcomePreview();
  }));
  ['wMessage', 'wLeaveMessage'].forEach((id) => $('#' + id).addEventListener('input', updateWelcomePreview));
  ['wEnabled', 'wEmbed', 'wLeaveEnabled'].forEach((id) => $('#' + id).addEventListener('change', updateWelcomePreview));
  $('#wSave').addEventListener('click', saveWelcome);
  $('#wTest').addEventListener('click', testWelcome);
}
function renderWelcome() {
  const w = state.settings?.welcome; if (!w) return;
  $('#wEnabled').checked = !!w.enabled; $('#wChannel').value = w.channelId || '';
  $('#wMessage').value = w.message || ''; $('#wEmbed').checked = w.embed !== false;
  $('#wLeaveEnabled').checked = !!w.leaveEnabled; $('#wLeaveChannel').value = w.leaveChannelId || '';
  $('#wLeaveMessage').value = w.leaveMessage || '';
  const roles = state.detail?.roles || [];
  $('#wRoles').innerHTML = roles.filter((r) => r.name !== '@everyone').slice(0, 24).map((r) =>
    `<label class="switchrow" style="cursor:pointer"><span class="rolebadge"><span class="roledot" style="background:${esc(r.color === '#000000' ? '#888' : r.color)}"></span>${esc(r.name)}</span><span class="switch"><input type="checkbox" data-role="${r.id}" ${w.autoRoles?.includes(r.id) ? 'checked' : ''}><span class="tr"></span><span class="th"></span></span></label>`).join('') || 'Sin roles';
  updateWelcomePreview();
}
function welcomePreviewText() {
  return ($('#wMessage').value || '…').replaceAll('{user}', '@NuevoMiembro').replaceAll('{username}', 'NuevoMiembro').replaceAll('{server}', state.detail?.name || 'tu servidor').replaceAll('{count}', String(state.stats?.members ?? '?'));
}
function updateWelcomePreview() {
  const isEmbed = $('#wEmbed').checked;
  $('#wPreview').style.display = isEmbed ? 'block' : 'none';
  $('#wPreviewText').style.display = isEmbed ? 'none' : 'block';
  if (isEmbed) $('#wPreview .d').textContent = welcomePreviewText();
  else $('#wPreviewText').textContent = welcomePreviewText();
}
async function saveWelcome() {
  if (state.demo) return toast('Modo demo: conecta el bot para guardar de verdad', false);
  const autoRoles = $$('#wRoles [data-role]:checked').map((i) => i.dataset.role);
  const body = { ...state.settings, welcome: { ...state.settings.welcome, enabled: $('#wEnabled').checked, channelId: $('#wChannel').value || null, message: $('#wMessage').value, embed: $('#wEmbed').checked, leaveEnabled: $('#wLeaveEnabled').checked, leaveChannelId: $('#wLeaveChannel').value || null, leaveMessage: $('#wLeaveMessage').value, autoRoles } };
  try { state.settings = await api(`/api/guilds/${state.gid}/settings`, { method: 'PUT', body: JSON.stringify(body) }); toast('Bienvenida guardada'); }
  catch (e) { toast('Error: ' + e.message, false); }
}
async function testWelcome() {
  if (state.demo) return toast('Modo demo: nada que probar aún', false);
  try { await api(`/api/guilds/${state.gid}/welcome/test`, { method: 'POST', body: JSON.stringify({ channelId: $('#wChannel').value || undefined }) }); toast('Mensaje de prueba enviado'); }
  catch (e) { toast('Error: ' + e.message, false); }
}

// ── Anuncios ──
const COLORS = [['Dorado', '#d4af37'], ['Champagne', '#e8c97a'], ['Blurple', '#5865f2'], ['Verde', '#2ecc71'], ['Rojo', '#e74c3c'], ['Azul', '#3498db'], ['Rosa', '#eb459e'], ['Oscuro', '#2b2d31']];
const TPLS = {
  evento: ['Nuevo evento', 'Hola a todos.\n\nEste viernes 20:00 tenemos evento especial.\n\nConfirma tu asistencia. Habrá premios.'],
  normas: ['Normas del servidor', '1. Respeta a todos\n2. Nada de spam\n3. Usa los canales correctos\n\nGracias por hacer de este un gran lugar.'],
  mantenimiento: ['Mantenimiento programado', 'El bot estará en mantenimiento esta noche.\n\nVolveremos más dorados que nunca.'],
  sorteo: ['Nuevo sorteo', 'Reacciona para participar.\n\nPremio: Rol VIP Dorado\nTermina en 24h'],
};
function buildColorPicker() {
  $('#aColors').innerHTML = COLORS.map(([n, c], i) => `<div class="swatch ${i === 0 ? 'sel' : ''}" title="${n}" data-c="${c}" style="background:${c}"></div>`).join('');
  $$('#aColors .swatch').forEach((s) => s.addEventListener('click', () => { $$('#aColors .swatch').forEach((x) => x.classList.remove('sel')); s.classList.add('sel'); state.color = s.dataset.c; $('#aPreview').style.borderLeftColor = state.color; }));
}
function bindAnnounce() {
  ['aTitle', 'aDesc', 'aFooter', 'aImage', 'aMention'].forEach((id) => $('#' + id).addEventListener('input', updateAnnouncePreview));
  $('#aChannel').addEventListener('change', updateAnnouncePreview);
  $$('#v-announce [data-tpl]').forEach((b) => b.addEventListener('click', () => { const [t, d] = TPLS[b.dataset.tpl]; $('#aTitle').value = t; $('#aDesc').value = d; updateAnnouncePreview(); }));
  $('#aSend').addEventListener('click', sendAnnounce);
  updateAnnouncePreview();
}
function updateAnnouncePreview() {
  $('#aPreview .t').textContent = $('#aTitle').value || 'Título del anuncio';
  $('#aPreview .d').textContent = $('#aDesc').value || 'Descripción…';
  $('#aPreview .f').textContent = $('#aFooter').value || 'Glod • Anuncio oficial';
  const m = $('#aMention'); const label = m.selectedOptions[0]?.textContent || '';
  $('#aPing').textContent = m.value ? label + ' ' : '';
  const img = $('#aImage').value.trim();
  let im = $('#aPreview img'); if (img) { if (!im) { im = document.createElement('img'); $('#aPreview').appendChild(im); } im.src = img; } else if (im) im.remove();
}
async function sendAnnounce() {
  const payload = { channelId: $('#aChannel').value, title: $('#aTitle').value, description: $('#aDesc').value, color: state.color, image: $('#aImage').value || undefined, thumbnail: $('#aThumb').value || undefined, footer: $('#aFooter').value, mention: $('#aMention').value || undefined };
  if (!payload.channelId) return toast('Elige un canal destino', false);
  if (!payload.title && !payload.description) return toast('Escribe título o descripción', false);
  if (state.demo) return toast('Modo demo: anuncio simulado (conecta el bot para enviarlo)', false);
  try { const r = await api(`/api/guilds/${state.gid}/announce`, { method: 'POST', body: JSON.stringify(payload) }); toast('Anuncio enviado'); console.log(r); }
  catch (e) { toast('Error: ' + e.message, false); }
}

// ── Tablas ──
function renderTables(x) {
  $('#lvlTable').innerHTML = x.leaderboard?.length ? `<table class="tbl"><tr><th>#</th><th>User</th><th>Nivel</th><th>XP</th></tr>${x.leaderboard.map((l, i) => `<tr><td>${i + 1}</td><td class="mono">${esc(l.userId)}</td><td><span class="pill warn">${l.level}</span></td><td>${l.xp}</td></tr>`).join('')}</table>` : '<p class="muted">Sin datos de niveles todavía. Habla en el servidor para generar XP.</p>';
  $('#lvlEnabled').checked = state.settings?.leveling?.enabled !== false;
  $('#ecoTable').innerHTML = x.economyTop?.length ? `<table class="tbl"><tr><th>#</th><th>User</th><th>Total</th><th>Banco</th></tr>${x.economyTop.map((e, i) => `<tr><td>${i + 1}</td><td class="mono">${esc(e.userId)}</td><td>Coins: ${e.total}</td><td>${e.bank}</td></tr>`).join('')}</table>` : '<p class="muted">Sin datos de economía.</p>';
  $('#warnTable').innerHTML = x.warnings?.length ? `<table class="tbl"><tr><th>Usuario</th><th>Motivo</th><th>Fecha</th></tr>${x.warnings.slice(0, 30).map((w) => `<tr><td class="mono">${esc(w.userId)}</td><td>${esc(w.reason)}</td><td class="muted">${ago(w.createdAt)}</td></tr>`).join('')}</table>` : '<p class="muted">Sin avisos. Todo en orden.</p>';
  $('#ticketTable').innerHTML = x.tickets?.length ? `<table class="tbl"><tr><th>ID</th><th>Dueño</th><th>Estado</th><th>Creado</th></tr>${x.tickets.slice(0, 30).map((t) => `<tr><td class="mono">${esc(String(t._id || t.id).slice(0, 8))}</td><td class="mono">${esc(t.ownerId)}</td><td><span class="pill ${t.status === 'open' ? 'ok' : 'bad'}">${esc(t.status)}</span></td><td class="muted">${ago(t.createdAt)}</td></tr>`).join('')}</table>` : '<p class="muted">Sin tickets.</p>';
  $('#gwTable').innerHTML = x.giveaways?.length ? `<table class="tbl"><tr><th>Premio</th><th>Ganadores</th><th>Termina</th><th>Estado</th></tr>${x.giveaways.slice(0, 20).map((g) => `<tr><td>${esc(g.prize)}</td><td>${g.winnerCount}</td><td class="muted">${ago(g.endsAt)}</td><td><span class="pill ${g.ended ? 'bad' : 'ok'}">${g.ended ? 'terminado' : 'activo'}</span></td></tr>`).join('')}</table>` : '<p class="muted">Sin sorteos. Créalos con <span class="mono">/sorteo</span> en Discord.</p>';
  $('#sugTable').innerHTML = x.suggestions?.length ? `<table class="tbl"><tr><th>Texto</th><th>Votos</th><th>Estado</th></tr>${x.suggestions.slice(0, 20).map((s) => `<tr><td>${esc(s.text).slice(0, 90)}</td><td>Up ${s.upvotes?.length ?? 0} · Down ${s.downvotes?.length ?? 0}</td><td><span class="pill ${s.status === 'pending' ? 'warn' : 'info'}">${esc(s.status)}</span></td></tr>`).join('')}</table>` : '<p class="muted">Sin sugerencias.</p>';
  $('#lvlEnabled').onchange = saveLevelToggle;
  $('#ecoFind').onclick = async () => {
    const id = $('#ecoId').value.trim(); if (!id) return;
    if (state.demo) return $('#ecoOne').textContent = `Demo: @${id} -> 1.250 + banco 500`;
    try { const u = await api(`/api/guilds/${state.gid}/economy/${id}`); $('#ecoOne').textContent = u ? `Balance ${u.balance} · Banco ${u.bank}` : 'Sin datos para ese usuario.'; }
    catch (e) { $('#ecoOne').textContent = 'Error: ' + e.message; }
  };
}
async function saveLevelToggle(e) {
  if (state.demo) return;
  const body = { ...state.settings, leveling: { ...state.settings.leveling, enabled: e.target.checked, channelId: $('#sLvlChannel').value || null } };
  try { state.settings = await api(`/api/guilds/${state.gid}/settings`, { method: 'PUT', body: JSON.stringify(body) }); toast('Niveles ' + (e.target.checked ? 'activados' : 'pausados')); }
  catch (err) { toast('Error: ' + err.message, false); }
}

// ── Ajustes ──
function bindSettings() {
  $('#sSave').addEventListener('click', async () => {
    if (state.demo) return toast('Modo demo: conecta el bot para guardar', false);
    const body = { ...state.settings, locale: $('#sLocale').value, muteRoleId: $('#sMute').value || null, suggestionChannelId: $('#sSug').value || null, leveling: { ...state.settings.leveling, channelId: $('#sLvlChannel').value || null } };
    try { state.settings = await api(`/api/guilds/${state.gid}/settings`, { method: 'PUT', body: JSON.stringify(body) }); toast('Ajustes guardados'); }
    catch (e) { toast('Error: ' + e.message, false); }
  });
  $('#sExport').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state.settings, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `glod-${state.gid}-settings.json`; a.click();
  });
}
function renderSettings() {
  $('#sLocale').value = state.settings?.locale || 'es';
  $('#sMute').value = state.settings?.muteRoleId || '';
  $('#sSug').value = state.settings?.suggestionChannelId || '';
  $('#sLvlChannel').value = state.settings?.leveling?.channelId || '';
}

// Arranque real: aquí ya existen COLORS, TPLS y todo lo demás.
init();
