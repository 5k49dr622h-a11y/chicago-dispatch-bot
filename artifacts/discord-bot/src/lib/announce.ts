import { Guild } from 'discord.js';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
} from '@discordjs/voice';
import { ttsToStream } from './tts.js';
import logger from './logger.js';

export async function joinVoiceAndAnnounce(
  guild: Guild,
  vcId: string,
  text: string,
): Promise<void> {
  const voiceChannel = await guild.channels.fetch(vcId);
  if (!voiceChannel || !voiceChannel.isVoiceBased()) {
    throw new Error(`Channel ${vcId} is not a voice channel`);
  }

  const connection = joinVoiceChannel({
    channelId: vcId,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: false,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
    logger.info({ vcId }, 'Joined voice channel');

    const audioStream = await ttsToStream(text);

    // StreamType.Arbitrary lets @discordjs/voice transcode via system ffmpeg
    const resource = createAudioResource(audioStream, {
      inputType: StreamType.Arbitrary,
    });

    const player = createAudioPlayer();
    connection.subscribe(player);
    player.play(resource);

    await new Promise<void>((resolve, reject) => {
      player.once(AudioPlayerStatus.Idle, resolve);
      player.once('error', (err) => {
        logger.error({ err }, 'Audio player error');
        reject(err);
      });
      setTimeout(resolve, 90_000); // safety disconnect after 90s
    });

    logger.info('Voice announcement complete');
  } finally {
    connection.destroy();
  }
}
