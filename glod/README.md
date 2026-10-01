# Glod 🤖

Production-ready modular Discord bot built with **Discord.js v14**, **TypeScript** and **MongoDB**.

## Features
- Slash commands only · dynamic loaders (commands / events / buttons / selects / modals) with hot-reload
- Moderation, Security (anti-spam/links/raid/mention), Welcome, Tickets, Leveling, Economy, Utility, Giveaways, Suggestions, Reaction Roles, Music (Lavalink), Dashboard-ready API
- Embed-only UX · consistent color system · cooldowns · permissions validation · anti-crash · Winston logging · i18n (en/es)

## Quick start
```bash
cp .env.example .env   # fill DISCORD_TOKEN, CLIENT_ID, MONGODB_URI
npm install
npm run deploy         # register slash commands (uses GUILD_ID if set, else global)
npm run build
npm start
```

Dev: `npm run dev`

## Structure
```
src/
  client.ts  config.ts  index.ts
  handlers/  events/  commands/  components/  database/  systems/  utils/  api/  locales/  types/
```

## Dashboard
REST API in `src/api/server.ts` (`API_ENABLED=true`). Endpoints under `/api/guilds/:id/...` with `Authorization: Bearer <API_TOKEN>`.

## Lavalink
Configure `LAVALINK_*` in `.env` and run a Lavalink node. Music commands degrade gracefully with an error embed when unconfigured.
