import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');

export interface GuildConfig {
  channelId?: string;
  vcs: {
    police?: string;
    fire?: string;
    ems?: string;
    default?: string;
  };
  layout: {
    title: string;
    footer: string;
  };
}

const DEFAULT_CONFIG: GuildConfig = {
  vcs: {},
  layout: {
    title: 'ACTIVE DISPATCH — CHICAGO',
    footer: 'Dispatched by {user}',
  },
};

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function configPath(guildId: string): string {
  return join(DATA_DIR, `${guildId}.json`);
}

export function getGuildConfig(guildId: string): GuildConfig {
  ensureDataDir();
  const path = configPath(guildId);
  if (!existsSync(path)) return structuredClone(DEFAULT_CONFIG);
  try {
    const parsed: Partial<GuildConfig> = JSON.parse(readFileSync(path, 'utf-8'));
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      vcs: { ...(parsed.vcs ?? {}) },
      layout: { ...DEFAULT_CONFIG.layout, ...(parsed.layout ?? {}) },
    };
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

export function updateGuildConfig(guildId: string, updates: Partial<GuildConfig>): GuildConfig {
  const current = getGuildConfig(guildId);
  const updated: GuildConfig = {
    ...current,
    ...updates,
    vcs: { ...current.vcs, ...(updates.vcs ?? {}) },
    layout: { ...current.layout, ...(updates.layout ?? {}) },
  };
  ensureDataDir();
  writeFileSync(configPath(guildId), JSON.stringify(updated, null, 2));
  return updated;
}
