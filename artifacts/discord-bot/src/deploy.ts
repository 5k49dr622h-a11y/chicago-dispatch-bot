/**
 * Register slash commands with Discord.
 * Run once after bot setup: pnpm --filter @workspace/discord-bot run deploy
 *
 * Required env vars:
 *   DISCORD_BOT_TOKEN   — bot token
 *   DISCORD_CLIENT_ID   — application (client) ID
 *   DISCORD_GUILD_ID    — (optional) guild ID for instant dev registration
 */
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const token = process.env['DISCORD_BOT_TOKEN'];
const clientId = process.env['DISCORD_CLIENT_ID'];
const guildId = process.env['DISCORD_GUILD_ID'];

if (!token) { console.error('❌ DISCORD_BOT_TOKEN not set'); process.exit(1); }
if (!clientId) { console.error('❌ DISCORD_CLIENT_ID not set'); process.exit(1); }

const commands = [
  new SlashCommandBuilder()
    .setName('911')
    .setDescription('File an emergency dispatch — opens the dispatch form')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('edit')
    .setDescription('Configure the Chicago Dispatch bot')
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Set the text channel where dispatch messages are sent'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('vcs')
        .setDescription('Set the voice channels to join for each emergency service'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('layout')
        .setDescription('Customise the embed title and footer of dispatch messages'),
    )
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(token);

console.log('Registering /911 and /edit slash commands...');

if (guildId) {
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
  console.log(`✅ Registered to guild ${guildId} (instant)`);
} else {
  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  console.log('✅ Registered globally (may take up to 1 hour to appear)');
}
