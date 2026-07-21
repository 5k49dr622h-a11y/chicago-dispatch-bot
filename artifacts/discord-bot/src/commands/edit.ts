import {
  ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalSubmitInteraction,
  EmbedBuilder,
  Colors,
} from 'discord.js';
import { getGuildConfig, updateGuildConfig } from '../lib/config.js';

/** Accepts a bare snowflake ID or a full Discord channel URL and returns just the ID. */
function extractId(raw: string): string {
  const trimmed = raw.trim();
  // https://discord.com/channels/GUILD_ID/CHANNEL_ID  →  last segment
  const match = trimmed.match(/(\d{17,20})(?:\/(\d{17,20}))?$/);
  if (match) return match[2] ?? match[1];
  return trimmed;
}

export const editCommand = {
  async handleCommand(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ content: '⚠️ Must be used inside a server.', ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const config = getGuildConfig(guildId);

    if (sub === 'channel') {
      const modal = new ModalBuilder()
        .setCustomId('edit-channel')
        .setTitle('📡 Set Dispatch Channel');

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('channel_id')
            .setLabel('Dispatch Channel ID')
            .setPlaceholder('Right-click your text channel → Copy Channel ID')
            .setValue(config.channelId ?? '')
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ),
      );

      await interaction.showModal(modal);

    } else if (sub === 'vcs') {
      const modal = new ModalBuilder()
        .setCustomId('edit-vcs')
        .setTitle('🎙️ Set Voice Channels');

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('vc_police')
            .setLabel('🚓 Police Voice Channel ID')
            .setPlaceholder('Leave blank to use default')
            .setValue(config.vcs.police ?? '')
            .setStyle(TextInputStyle.Short)
            .setRequired(false),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('vc_fire')
            .setLabel('🔥 Fire Voice Channel ID')
            .setPlaceholder('Leave blank to use default')
            .setValue(config.vcs.fire ?? '')
            .setStyle(TextInputStyle.Short)
            .setRequired(false),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('vc_ems')
            .setLabel('🚑 EMS Voice Channel ID')
            .setPlaceholder('Leave blank to use default')
            .setValue(config.vcs.ems ?? '')
            .setStyle(TextInputStyle.Short)
            .setRequired(false),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('vc_default')
            .setLabel('🚨 Default / Multiple VC ID')
            .setPlaceholder('Fallback for unrecognised services')
            .setValue(config.vcs.default ?? '')
            .setStyle(TextInputStyle.Short)
            .setRequired(false),
        ),
      );

      await interaction.showModal(modal);

    } else if (sub === 'layout') {
      const modal = new ModalBuilder()
        .setCustomId('edit-layout')
        .setTitle('📋 Edit Dispatch Message Layout');

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('title')
            .setLabel('Embed Title')
            .setPlaceholder('e.g. ACTIVE DISPATCH — CHICAGO')
            .setValue(config.layout.title)
            .setStyle(TextInputStyle.Short)
            .setMaxLength(200)
            .setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('footer')
            .setLabel('Embed Footer')
            .setPlaceholder('{user} = dispatcher name  •  {service} = service type')
            .setValue(config.layout.footer)
            .setStyle(TextInputStyle.Short)
            .setMaxLength(200)
            .setRequired(false),
        ),
      );

      await interaction.showModal(modal);
    }
  },

  async handleModal(interaction: ModalSubmitInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ content: '⚠️ Must be used inside a server.', ephemeral: true });
      return;
    }

    const id = interaction.customId;

    if (id === 'edit-channel') {
      const channelId = extractId(interaction.fields.getTextInputValue('channel_id'));
      updateGuildConfig(guildId, { channelId });
      await interaction.reply({
        content: `✅ Dispatch channel set to <#${channelId}>`,
        ephemeral: true,
      });

    } else if (id === 'edit-vcs') {
      const police = interaction.fields.getTextInputValue('vc_police').trim() ? extractId(interaction.fields.getTextInputValue('vc_police')) : undefined;
      const fire = interaction.fields.getTextInputValue('vc_fire').trim() ? extractId(interaction.fields.getTextInputValue('vc_fire')) : undefined;
      const ems = interaction.fields.getTextInputValue('vc_ems').trim() ? extractId(interaction.fields.getTextInputValue('vc_ems')) : undefined;
      const def = interaction.fields.getTextInputValue('vc_default').trim() ? extractId(interaction.fields.getTextInputValue('vc_default')) : undefined;

      updateGuildConfig(guildId, { vcs: { police, fire, ems, default: def } });

      const lines = [
        '✅ **Voice channels updated:**',
        `🚓 Police: ${police ? `\`${police}\`` : '_not set — falls back to default_'}`,
        `🔥 Fire: ${fire ? `\`${fire}\`` : '_not set — falls back to default_'}`,
        `🚑 EMS: ${ems ? `\`${ems}\`` : '_not set — falls back to default_'}`,
        `🚨 Default: ${def ? `\`${def}\`` : '_not set_'}`,
      ];
      await interaction.reply({ content: lines.join('\n'), ephemeral: true });

    } else if (id === 'edit-layout') {
      const title = interaction.fields.getTextInputValue('title').trim();
      const footer = interaction.fields.getTextInputValue('footer').trim() || 'Dispatched by {user}';

      updateGuildConfig(guildId, { layout: { title, footer } });

      const preview = new EmbedBuilder()
        .setTitle(`🚓  ${title}`)
        .setColor(Colors.DarkBlue)
        .addFields(
          { name: '🚓  Emergency Service', value: 'Police', inline: true },
          { name: '📍  Location', value: '123 W Madison St, Chicago IL', inline: true },
          { name: '⏰  Time', value: '14:32 CST', inline: true },
          { name: '📋  Incident Details', value: 'Example dispatch — officer down at location.' },
        )
        .setFooter({
          text: footer
            .replace('{user}', 'Dispatcher#0001')
            .replace('{service}', 'Police'),
        })
        .setTimestamp();

      await interaction.reply({
        content: '✅ Layout saved! Preview:',
        embeds: [preview],
        ephemeral: true,
      });
    }
  },
};
