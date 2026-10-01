/**
 * Professional embed templates. ALL user-facing responses must use these.
 * Guarantees consistent colors, footers, timestamps.
 * @module utils/embeds
 */
import { EmbedBuilder } from 'discord.js';
import { Colors } from '../config.js';

function base(color: number): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(color)
    .setTimestamp()
    .setFooter({ text: 'Glod • Production-ready bot' });
}

export const Embeds = {
  success(title: string, description: string): EmbedBuilder {
    return base(Colors.success).setTitle(`✅ ${title}`).setDescription(description);
  },
  error(title: string, description: string): EmbedBuilder {
    return base(Colors.error).setTitle(`❌ ${title}`).setDescription(description);
  },
  warning(title: string, description: string): EmbedBuilder {
    return base(Colors.warning).setTitle(`⚠️ ${title}`).setDescription(description);
  },
  info(title: string, description: string): EmbedBuilder {
    return base(Colors.info).setTitle(`ℹ️ ${title}`).setDescription(description);
  },
  primary(title: string, description = ''): EmbedBuilder {
    return base(Colors.primary).setTitle(title).setDescription(description);
  },
};
