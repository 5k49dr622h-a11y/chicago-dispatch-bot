#!/bin/bash
set -e

echo "=== Chicago Dispatch Bot Setup ==="

# Install Node.js 20
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
echo "Installing pnpm..."
npm install -g pnpm

# Install ffmpeg (required for voice)
echo "Installing ffmpeg..."
sudo apt-get install -y ffmpeg

# Install pm2 (keeps the bot running after you close the terminal)
echo "Installing PM2..."
npm install -g pm2

# Install bot dependencies
echo "Installing bot dependencies..."
pnpm install --frozen-lockfile --filter @workspace/discord-bot...

echo ""
echo "=== Almost done! ==="
echo "Now set your environment variables:"
echo ""
echo "  export DISCORD_BOT_TOKEN=your_token_here"
echo "  export DISCORD_CLIENT_ID=1529202952277983232"
echo "  export DISCORD_GUILD_ID=1527845348134092901"
echo ""
echo "Then start the bot with:"
echo "  pm2 start 'pnpm --filter @workspace/discord-bot run dev' --name chicago-dispatch"
echo "  pm2 save"
echo "  pm2 startup   (follow the instruction it prints to auto-start on reboot)"
