FROM node:20-alpine

# Install ffmpeg (required for Discord voice) and pnpm
RUN apk add --no-cache ffmpeg python3 make g++
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace-level config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy the bot package
COPY artifacts/discord-bot ./artifacts/discord-bot

# Install only the bot's dependencies
RUN pnpm install --frozen-lockfile --filter @workspace/discord-bot...

CMD ["pnpm", "--filter", "@workspace/discord-bot", "run", "dev"]
