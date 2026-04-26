#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "░█▄█░█▀▀░█▀▄░█░█░█▀▀░█▀█"
echo "░█░█░█▀▀░█░█░█░█░▀▀█░█▀█"
echo "░▀░▀░▀▀▀░▀▀░░▀▀▀░▀▀▀░▀░▀"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "    AUTO ORDER BOT INSTALLER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Update packages
echo "📦 Updating packages..."
pkg update -y && pkg upgrade -y

# Install Node.js
echo "📦 Installing Node.js..."
pkg install nodejs -y

# Install git
echo "📦 Installing git..."
pkg install git -y

# Clone repository (ganti dengan repo Anda)
echo "📦 Cloning repository..."
git clone https://github.com/yourusername/auto-order-bot.git
cd auto-order-bot

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file
echo "📝 Creating .env file..."
read -p "Enter your BOT_TOKEN: " BOT_TOKEN
read -p "Enter ADMIN_ID: " ADMIN_ID

cat > .env << EOF
BOT_TOKEN=$BOT_TOKEN
ADMIN_ID=$ADMIN_ID
PORT=3000
CATBOX_IMAGE_URL=https://files.catbox.moe/4j4k1t.jpg
EOF

echo "✅ Installation complete!"
echo "🚀 Run 'npm start' to start the bot"
