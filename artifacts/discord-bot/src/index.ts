import { Client, GatewayIntentBits, Events } from 'discord.js';
import logger from './lib/logger.js';
import { nineOneOneCommand } from './commands/nine-one-one.js';
import { editCommand } from './commands/edit.js';

const token = process.env['DISCORD_BOT_TOKEN'];
if (!token) {
  logger.error('DISCORD_BOT_TOKEN is not set. Add it as a secret and restart.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.once(Events.ClientReady, (c) => {
  logger.info(`Chicago Dispatch online as ${c.user.tag}`);
  logger.info(`Connected to ${c.guilds.cache.size} guild(s)`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === '911') {
        await nineOneOneCommand.showModal(interaction);
      } else if (interaction.commandName === 'edit') {
        await editCommand.handleCommand(interaction);
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId === 'dispatch-911') {
        await nineOneOneCommand.handleSubmit(interaction);
      } else if (
        interaction.customId === 'edit-channel' ||
        interaction.customId === 'edit-vcs' ||
        interaction.customId === 'edit-layout'
      ) {
        await editCommand.handleModal(interaction);
      }
    }
  } catch (err) {
    logger.error({ err }, 'Unhandled interaction error');
    const reply = { content: '⚠️ An error occurred.', ephemeral: true };
    if (interaction.isRepliable()) {
      try {
        if ('replied' in interaction && (interaction.replied || interaction.deferred)) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      } catch {
        /* ignore */
      }
    }
  }
});

client.login(token);
