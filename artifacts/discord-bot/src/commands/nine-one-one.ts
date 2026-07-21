import {
  ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalSubmitInteraction,
  EmbedBuilder,
  Colors,
  TextChannel,
} from 'discord.js';
import { getGuildConfig } from '../lib/config.js';
import { joinVoiceAndAnnounce } from '../lib/announce.js';
import logger from '../lib/logger.js';

function resolveVcId(service: string, guildId: string): string | undefined {
  const config = getGuildConfig(guildId);
  const s = service.toLowerCase();

  if (s.includes('police') || s.includes('law') || s.includes('cop')) {
    return config.vcs.police ?? config.vcs.default;
  }
  if (s.includes('fire') || s.includes('arson') || s.includes('blaze')) {
    return config.vcs.fire ?? config.vcs.default;
  }
  if (
    s.includes('ems') ||
    s.includes('ambulance') ||
    s.includes('medical') ||
    s.includes('paramedic') ||
    s.includes('medic')
  ) {
    return config.vcs.ems ?? config.vcs.default;
  }

  return config.vcs.default;
}

function serviceEmoji(service: string): string {
  const s = service.toLowerCase();
  if (s.includes('fire')) return '🔥';
  if (s.includes('ems') || s.includes('ambulance') || s.includes('medic')) return '🚑';
  if (s.includes('police') || s.includes('law')) return '🚓';
  return '🚨';
}

function serviceColor(service: string): number {
  const s = service.toLowerCase();
  if (s.includes('fire')) return Colors.Orange;
  if (s.includes('ems') || s.includes('ambulance') || s.includes('medic')) return Colors.Blue;
  if (s.includes('police') || s.includes('law')) return Colors.DarkBlue;
  return Colors.Red;
}

export const nineOneOneCommand = {
  async showModal(interaction: ChatInputCommandInteraction) {
    const modal = new ModalBuilder()
      .setCustomId('dispatch-911')
      .setTitle('🚨 911 Emergency Dispatch');

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('service')
          .setLabel('Emergency Service')
          .setPlaceholder('Police / Fire / EMS / Multiple')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(100)
          .setRequired(true),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('location')
          .setLabel('Location')
          .setPlaceholder('e.g. 123 W Madison St, Chicago IL')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(200)
          .setRequired(true),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('time')
          .setLabel('Time')
          .setPlaceholder('e.g. 14:32 CST')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(50)
          .setRequired(true),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('details')
          .setLabel('Details')
          .setPlaceholder('Describe the nature of the emergency...')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(1000)
          .setRequired(true),
      ),
    );

    await interaction.showModal(modal);
  },

  async handleSubmit(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    if (!guild) {
      await interaction.editReply('⚠️ Cannot dispatch outside of a server.');
      return;
    }

    const service = interaction.fields.getTextInputValue('service');
    const location = interaction.fields.getTextInputValue('location');
    const time = interaction.fields.getTextInputValue('time');
    const details = interaction.fields.getTextInputValue('details');

    const config = getGuildConfig(guild.id);
    const vcId = resolveVcId(service, guild.id);
    const emoji = serviceEmoji(service);

    const footerText = (config.layout.footer ?? 'Dispatched by {user}')
      .replace('{user}', interaction.user.tag)
      .replace('{service}', service);

    const embed = new EmbedBuilder()
      .setTitle(`${emoji}  ${config.layout.title ?? 'ACTIVE DISPATCH — CHICAGO'}`)
      .setColor(serviceColor(service))
      .addFields(
        { name: `${emoji}  Emergency Service`, value: service, inline: true },
        { name: '📍  Location', value: location, inline: true },
        { name: '⏰  Time', value: time, inline: true },
        { name: '📋  Incident Details', value: details },
      )
      .setFooter({ text: footerText })
      .setTimestamp();

    // Send to dispatch channel
    let dispatchSent = false;
    if (config.channelId) {
      try {
        const channel = await guild.channels.fetch(config.channelId);
        if (channel instanceof TextChannel) {
          await channel.send({ embeds: [embed] });
          dispatchSent = true;
        } else {
          logger.warn({ channelId: config.channelId }, 'Configured channel is not a text channel');
        }
      } catch (err) {
        logger.error({ err }, 'Failed to send dispatch embed');
      }
    }

    // Announce in the service-specific voice channel
    let voiceAnnounced = false;
    if (vcId) {
      const announcementText =
        `Attention all units. Active dispatch. ` +
        `Emergency service: ${service}. ` +
        `Location: ${location}. ` +
        `Time: ${time}. ` +
        `Details: ${details}. ` +
        `All available units, please respond.`;

      try {
        await joinVoiceAndAnnounce(guild, vcId, announcementText);
        voiceAnnounced = true;
      } catch (err) {
        logger.error({ err, vcId }, 'Voice announcement failed');
      }
    }

    const statusLines: string[] = [];
    if (!config.channelId) {
      statusLines.push('⚠️ No dispatch channel set — use `/edit channel` to configure one.');
    } else {
      statusLines.push(dispatchSent ? '✅ Dispatch posted to channel.' : '⚠️ Failed to post — check the configured channel ID.');
    }
    if (!vcId) {
      statusLines.push('⚠️ No voice channel for this service — use `/edit vcs` to configure one.');
    } else {
      statusLines.push(voiceAnnounced ? '✅ Voice announcement complete.' : '⚠️ Voice announcement failed — check bot permissions.');
    }

    await interaction.editReply(statusLines.join('\n'));
  },
};
