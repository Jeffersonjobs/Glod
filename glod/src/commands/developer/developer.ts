/**
 * Desarrollador: /recargar (recarga en caliente) + /estadisticas (rendimiento).
 */
import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { config } from '../../config.js';
import { reloadCommands } from '../../handlers/commandHandler.js';
import { loadComponents } from '../../handlers/componentHandler.js';
import { Embeds } from '../../utils/embeds.js';
import path from 'node:path';

function srcRoot(): string {
  return (globalThis as { __srcRoot?: string }).__srcRoot ?? path.join(process.cwd(), 'src');
}

export const reload: Command = {
  data: new SlashCommandBuilder().setName('recargar').setDescription('Recarga comandos + componentes en caliente (owner)'),
  cooldown: 5,
  ownerOnly: true,
  async execute(interaction, client) {
    if (!config.owners.includes(interaction.user.id)) {
      await interaction.reply({ embeds: [Embeds.error('Solo owner', 'No eres owner del bot.')], ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    const root = srcRoot();
    const n = await reloadCommands(client, root).catch(() => client.commands.size);
    client.buttons.clear();
    client.selects.clear();
    client.modals.clear();
    await loadComponents(client, root).catch(() => undefined);
    await interaction.editReply({ embeds: [Embeds.success('Recargado', `Comandos: **${n}** · Botones: **${client.buttons.size}** · Selects: **${client.selects.size}** · Modales: **${client.modals.size}**`)] });
  },
};

export const stats: Command = {
  data: new SlashCommandBuilder().setName('estadisticas').setDescription('Resumen de rendimiento y registros').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  cooldown: 10,
  userPermissions: [PermissionFlagsBits.ManageGuild],
  async execute(interaction, client) {
    const mem = process.memoryUsage();
    const uptime = Math.floor((Date.now() - client.startTime) / 1000);
    await interaction.reply({
      embeds: [
        Embeds.primary('📊 Estadísticas de Glod', `Actividad: **${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m**\nMemoria: **${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB**\nComandos: **${client.commands.size}**\nServidores: **${client.guilds.cache.size}**\nPing WS: **${client.ws.ping}ms**`).setFooter({ text: `Node ${process.version} · ${config.env}` }),
      ],
      ephemeral: true,
    });
  },
};

/** Categorías del /ayuda: emoji, etiqueta y comandos miembros. */
interface HelpCategory {
  key: string;
  emoji: string;
  label: string;
  commands: string[];
}

const HELP_CATEGORIES: HelpCategory[] = [
  { key: 'fiesta', emoji: '🎉', label: 'Fiesta', commands: ['fiesta', 'diversion', 'refran', 'trabalenguas', 'frase-anime', 'dino', 'nombre-epico', 'mision', 'hechizo'] },
  { key: 'juegos', emoji: '🎮', label: 'Juegos', commands: ['juegos', 'minijuego', 'casino', 'mascota', 'poker-dados', 'rolear-dados', 'domino', 'apertura'] },
  { key: 'texto', emoji: '✍️', label: 'Texto', commands: ['texto', 'herramientas', 'binario', 'morse', 'cesar'] },
  { key: 'utilidad', emoji: '🧰', label: 'Utilidad', commands: ['utilidades', 'avatar', 'usuario', 'servidor', 'ver-rol', 'canal', 'bot', 'ping', 'calculadora', 'recordatorio', 'info', 'hora', 'saludo'] },
  { key: 'moderacion', emoji: '🛡️', label: 'Moderación', commands: ['banear', 'expulsar', 'aislar', 'desbanear', 'advertir', 'advertencias', 'limpiar', 'bloquear', 'desbloquear', 'modo-lento', 'apodo', 'rol', 'moderacion', 'panel-mod', 'automod', 'seguridad-config'] },
  { key: 'social', emoji: '💬', label: 'Social', commands: ['social', 'juego-rol', 'abrazar', 'besar', 'acariciar', 'cachetada', 'mimar'] },
  { key: 'economia', emoji: '💰', label: 'Economía', commands: ['saldo', 'diario', 'trabajar', 'tienda', 'comprar', 'inventario', 'transferir', 'ingresos', 'tienda-agregar'] },
  { key: 'niveles', emoji: '⭐', label: 'Niveles', commands: ['top', 'rango', 'niveles-admin', 'niveles-config'] },
  { key: 'musica', emoji: '🎵', label: 'Música', commands: ['reproducir', 'cola', 'saltar', 'detener', 'pausa', 'volumen', 'sonando', 'repetir', 'dj'] },
  { key: 'sorteos', emoji: '🎁', label: 'Sorteos', commands: ['sorteo', 'sorteos-admin', 'votacion'] },
  { key: 'comunidad', emoji: '🤝', label: 'Comunidad', commands: ['ticket', 'tickets-config', 'sugerir', 'sugerencias-config', 'roles-config', 'bienvenida-config', 'confesion'] },
  { key: 'conocimiento', emoji: '🧠', label: 'Quiz y astro', commands: ['quiz', 'astro', 'zodiaco-chino'] },
  { key: 'vida', emoji: '🌱', label: 'Estilo de vida', commands: ['cocina', 'deporte'] },
  { key: 'imagen', emoji: '🎨', label: 'Imagen', commands: ['lienzo'] },
  { key: 'sistema', emoji: '⚙️', label: 'Sistema', commands: ['recargar', 'estadisticas', 'ayuda'] },
];

function helpCategoryOf(name: string): HelpCategory | null {
  for (const cat of HELP_CATEGORIES) {
    if (cat.commands.includes(name)) return cat;
  }
  return null;
}

interface HelpOptionJSON {
  type?: number;
  name?: string;
  description?: string;
  required?: boolean;
}

interface HelpCommandJSON {
  description?: string;
  options?: HelpOptionJSON[];
}

/** Descripción + opciones de un comando a partir de su builder (type 1 = subcomando). */
function describeHelpCommand(cmd: Command): HelpCommandJSON {
  try {
    return cmd.data.toJSON() as unknown as HelpCommandJSON;
  } catch {
    return {};
  }
}

function countHelpSubs(cmd: Command): number {
  const json = describeHelpCommand(cmd);
  if (!json.options) return 0;
  return json.options.filter((o) => o.type === 1).length;
}

/** Divide líneas en bloques de ≤1024 caracteres (límite por field de embed). */
function chunkHelpLines(lines: string[], max = 1024): string[] {
  const out: string[] = [];
  let cur = '';
  for (const line of lines) {
    const next = cur ? `${cur}\n${line}` : line;
    if (next.length > max) {
      if (cur) out.push(cur);
      cur = line.length > max ? `${line.slice(0, max - 1)}…` : line;
    } else {
      cur = next;
    }
  }
  if (cur) out.push(cur);
  return out;
}

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName('ayuda')
    .setDescription('Ayuda: lista por categorías, detalle, filtro y búsqueda')
    .addStringOption((o) => o.setName('comando').setDescription('Detalle de un comando (sin /), p. ej. banear').setMaxLength(32))
    .addStringOption((o) =>
      o
        .setName('categoria')
        .setDescription('Filtrar por categoría')
        .addChoices(
          { name: 'Fiesta', value: 'fiesta' },
          { name: 'Juegos', value: 'juegos' },
          { name: 'Texto', value: 'texto' },
          { name: 'Utilidad', value: 'utilidad' },
          { name: 'Moderación', value: 'moderacion' },
          { name: 'Social', value: 'social' },
          { name: 'Economía', value: 'economia' },
          { name: 'Niveles', value: 'niveles' },
          { name: 'Música', value: 'musica' },
          { name: 'Sorteos', value: 'sorteos' },
          { name: 'Comunidad', value: 'comunidad' },
          { name: 'Quiz y astro', value: 'conocimiento' },
          { name: 'Estilo de vida', value: 'vida' },
          { name: 'Imagen', value: 'imagen' },
          { name: 'Sistema', value: 'sistema' },
        ),
    )
    .addStringOption((o) => o.setName('buscar').setDescription('Buscar por nombre o descripción').setMaxLength(100)),
  cooldown: 5,
  async execute(interaction, client) {
    // ── 1. Detalle de un comando ──
    const rawName = (interaction.options.getString('comando') ?? '').trim().toLowerCase().replace(/^\//, '');
    if (rawName) {
      const cmd = client.commands.get(rawName);
      if (!cmd) {
        const suggestions = [...client.commands.keys()]
          .filter((n) => n.includes(rawName) || rawName.includes(n))
          .slice(0, 5)
          .map((n) => `\`/${n}\``)
          .join(' ');
        await interaction.reply({
          embeds: [Embeds.error('Comando no encontrado', `No existe \`/${rawName}\`.${suggestions ? `\n¿Quisiste decir? ${suggestions}` : '\nUsa `/ayuda` para ver la lista completa.'}`)],
          ephemeral: true,
        });
        return;
      }
      const json = describeHelpCommand(cmd);
      const cat = helpCategoryOf(rawName);
      const perms = cmd.ownerOnly
        ? 'Solo owner'
        : cmd.userPermissions?.length
          ? cmd.userPermissions.map((p) => `\`${String(p)}\``).join(', ')
          : 'Ninguno especial';
      const subLines = (json.options ?? [])
        .filter((o) => o.type === 1)
        .map((o) => `\`/${rawName} ${o.name ?? '?'}\` — ${o.description ?? 'Sin descripción'}`);
      const optLines = (json.options ?? [])
        .filter((o) => o.type !== 1 && o.type !== 2)
        .map((o) => `\`${o.name ?? '?'}\`${o.required ? ' (requerido)' : ''} — ${o.description ?? ''}`);
      const embed = Embeds.primary(
        `/${rawName}`,
        `${json.description ?? 'Sin descripción.'}\n\n📁 Categoría: **${cat ? `${cat.emoji} ${cat.label}` : '📦 Otros'}**\n⏱️ Cooldown: **${cmd.cooldown ?? 3}s**\n🔑 Permisos: **${perms}**`,
      );
      if (subLines.length > 0) {
        chunkHelpLines(subLines).forEach((c, i) => {
          embed.addFields({ name: i === 0 ? `Subcomandos (${subLines.length})` : 'Subcomandos (cont.)', value: c });
        });
      } else if (optLines.length > 0) {
        chunkHelpLines(optLines).forEach((c, i) => {
          embed.addFields({ name: i === 0 ? 'Opciones' : 'Opciones (cont.)', value: c });
        });
      }
      embed.setFooter({ text: 'Glod • /ayuda categoria:<nombre> para descubrir más' });
      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── 2. Filtro por categoría ──
    const catKey = interaction.options.getString('categoria');
    if (catKey) {
      const cat = HELP_CATEGORIES.find((c) => c.key === catKey);
      if (!cat) {
        await interaction.reply({ embeds: [Embeds.error('Categoría inválida', 'Usa una de las categorías sugeridas.')], ephemeral: true });
        return;
      }
      const lines: string[] = [];
      for (const name of [...cat.commands].sort()) {
        const cmd = client.commands.get(name);
        if (!cmd) continue;
        const json = describeHelpCommand(cmd);
        const subs = countHelpSubs(cmd);
        lines.push(`\`/${name}\` — ${json.description ?? ''}${subs > 0 ? ` (${subs} sub)` : ''}`);
      }
      if (lines.length === 0) {
        await interaction.reply({ embeds: [Embeds.error('Vacía', `No hay comandos cargados en **${cat.label}**.`)], ephemeral: true });
        return;
      }
      const embed = Embeds.primary(`${cat.emoji} ${cat.label} (${lines.length})`, `Usa \`/ayuda comando:<nombre>\` para ver el detalle.`);
      chunkHelpLines(lines).forEach((c, i) => {
        embed.addFields({ name: i === 0 ? 'Comandos' : 'Comandos (cont.)', value: c });
      });
      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── 3. Búsqueda libre ──
    const query = (interaction.options.getString('buscar') ?? '').trim().toLowerCase();
    if (query) {
      const hits: string[] = [];
      const sorted = [...client.commands.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      for (const [name, cmd] of sorted) {
        const json = describeHelpCommand(cmd);
        const haystack = `${name} ${json.description ?? ''} ${(json.options ?? []).map((o) => `${o.name ?? ''} ${o.description ?? ''}`).join(' ')}`.toLowerCase();
        if (haystack.includes(query)) {
          hits.push(`\`/${name}\` — ${json.description ?? ''}`);
          if (hits.length >= 12) break;
        }
      }
      if (hits.length === 0) {
        await interaction.reply({ embeds: [Embeds.error('Sin resultados', `Nada coincide con **${query}**. Prueba con \`/ayuda\` para ver todo.`)], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [Embeds.primary(`🔎 Búsqueda: "${query}" (${hits.length})`, hits.join('\n'))] });
      return;
    }

    // ── 4. Vista general por categorías ──
    const totalSubs = [...client.commands.values()].reduce((acc, c) => acc + countHelpSubs(c), 0);
    const embed = Embeds.primary(
      '📖 Ayuda de Glod',
      `**${client.commands.size} comandos** · **${totalSubs} subcomandos**\n\nUsa \`/ayuda comando:<nombre>\` para el detalle, \`/ayuda categoria:<nombre>\` para filtrar o \`/ayuda buscar:<texto>\` para buscar.`,
    );
    for (const cat of HELP_CATEGORIES) {
      const present = cat.commands.filter((n) => client.commands.has(n)).sort();
      if (present.length === 0) continue;
      embed.addFields({ name: `${cat.emoji} ${cat.label} (${present.length})`, value: present.map((n) => `\`/${n}\``).join(' ') });
    }
    const orphans = [...client.commands.keys()].filter((n) => !helpCategoryOf(n)).sort();
    if (orphans.length > 0) {
      embed.addFields({ name: `📦 Otros (${orphans.length})`, value: orphans.map((n) => `\`/${n}\``).join(' ') });
    }
    await interaction.reply({ embeds: [embed] });
  },
};
