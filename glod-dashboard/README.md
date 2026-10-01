# Glod Dashboard — panel dorado para tu bot

Landing estilo referencia (negro minimalista, pill-nav) + panel funcional conectado a tu bot **glod**. Sin emojis: iconos SVG + tu logo.

## Tu logo
Guarda la imagen que pasaste como **`public/logo.png`** (la G dorada con corona y texto GLOD).
El panel la usa en la web, el sidebar, el favicon y las vistas previas.
Si no existe, usa `public/logo.svg` automáticamente.

## Credenciales (ya conectadas)
El `server.js` lee solo, en este orden: variables de entorno > `glod-dashboard/.env` > `../glod/.env`.
Toma del bot: `API_TOKEN` -> token, `CLIENT_ID`, `API_PORT` -> URL del bot.
Solo copia lo necesario al servidor (nunca se expone al navegador):
- `BOT_API_TOKEN` (igual a `API_TOKEN` del bot)
- `CLIENT_ID` (igual al del bot)
- `BOT_API_URL` (por defecto `http://localhost:3001`)
- `PORT` (por defecto `3002`)

El `.env` del dashboard ya viene rellenado con los valores de tu `glod/.env`.
No se copia `DISCORD_TOKEN` ni `MONGODB_URI` al panel.

## Qué incluye
- **Resumen / analíticas**: miembros, canales, niveles, economía, tickets, avisos, sorteos + gráficas 7 días.
- **Bienvenida**: activar, canal, mensaje con `{user} {username} {server} {count}`, embed dorado, despedida, roles automáticos, vista previa, guardar + probar.
- **Anuncios**: constructor de embeds con vista previa en vivo y envío a cualquier canal.
- **Canales y roles**, **Niveles**, **Economía**, **Moderación**, **Tickets**, **Sorteos**, **Sugerencias**, **Ajustes**.
- Sin el bot encendido entra en **modo demo** con datos de ejemplo.

## Inicio de sesión con Discord (tus servidores)
1. Abre **Discord Developer Portal → tu aplicación → OAuth2**.
2. En **Redirects** agrega: `http://localhost:3002/auth/callback` (o tu `APP_URL` + `/auth/callback`) y guarda.
3. Copia el **Client Secret** y ponlo en `glod-dashboard/.env` como `CLIENT_SECRET=...`.
4. Reinicia el panel (`node server.js`). Verás `Login Discord: ACTIVO`.
5. Entra a `http://localhost:3002` y toca **Login / Entrar con Discord**: el desplegable mostrará solo
   los servidores donde tienes permiso de gestionar, con el bot dentro; si el bot falta en alguno,
   verás una tarjeta para **invitarlo** directo a ese servidor.
6. Sin `CLIENT_SECRET`, el panel sigue abierto en modo simple (como antes).
   Si el login de Discord te da error, toca **Sin login** arriba a la derecha:
   entras en modo local y gestionas tus servidores igual.

## Correr en CMD (2 ventanas)
Ventana 1 — bot (activa los endpoints nuevos):
```cmd
cd /d "C:\Users\58825420\Documents\Default Project\glod"
npm install
npm run build
npm start
```
Tienes que ver: `[api] Dashboard API on :3001`.

Ventana 2 — panel:
```cmd
cd /d "C:\Users\58825420\Documents\Default Project\glod-dashboard"
node server.js
```
Abre `http://localhost:3002` y elige tu servidor.
