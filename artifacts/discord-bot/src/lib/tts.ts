import { Readable } from 'stream';

/** Google Translate TTS handles ~180 chars per request. */
const MAX_CHARS = 175;

/**
 * Split text into chunks at sentence/clause boundaries so each chunk
 * fits within Google TTS limits.
 */
function splitText(text: string): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > 0) {
    if (remaining.length <= MAX_CHARS) {
      chunks.push(remaining);
      break;
    }
    // Prefer splitting at '. ' or ', ' or ' '
    let splitAt = remaining.lastIndexOf('. ', MAX_CHARS);
    if (splitAt < 10) splitAt = remaining.lastIndexOf(', ', MAX_CHARS);
    if (splitAt < 10) splitAt = remaining.lastIndexOf(' ', MAX_CHARS);
    if (splitAt < 10) splitAt = MAX_CHARS;

    chunks.push(remaining.substring(0, splitAt + 1).trim());
    remaining = remaining.substring(splitAt + 1).trim();
  }

  return chunks.filter(Boolean);
}

/**
 * Fetch an MP3 audio stream for the given text from Google Translate TTS.
 * No API key required. Returns a single Node.js Readable stream.
 */
export async function ttsToStream(text: string): Promise<Readable> {
  const chunks = splitText(text);

  const responses = await Promise.all(
    chunks.map(async (chunk) => {
      const url = new URL('https://translate.google.com/translate_tts');
      url.searchParams.set('ie', 'UTF-8');
      url.searchParams.set('q', chunk);
      url.searchParams.set('tl', 'en');
      url.searchParams.set('client', 'tw-ob');

      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)',
          Referer: 'https://translate.google.com/',
        },
      });

      if (!res.ok || !res.body) {
        throw new Error(`Google TTS returned ${res.status} for chunk: "${chunk}"`);
      }

      return res.body;
    }),
  );

  if (responses.length === 1) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Readable.fromWeb(responses[0] as any);
  }

  // Concatenate all MP3 chunks into one readable stream
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeStreams = responses.map((r) => Readable.fromWeb(r as any));
  return Readable.from(
    (async function* () {
      for (const stream of nodeStreams) {
        for await (const chunk of stream) {
          yield chunk;
        }
      }
    })(),
  );
}
