#!/bin/bash

# LOKAL Token Metadata Upload Script
# This script uses modern Metaplex CLI (mplx) to update token metadata
# 
# IMPORTANT: This script updates existing token metadata, not creates new tokens.
# For creating new tokens with metadata, use: mplx toolbox token create --wizard

set -e

echo "🚀 Creating Lokal Token Metadata with Metaplex CLI..."

# Check if jq is installed (needed for parsing JSON)
if ! command -v jq &> /dev/null; then
    echo "❌ jq is not installed. Please install it first:"
    echo "   Ubuntu/Debian: sudo apt-get install jq"
    echo "   macOS: brew install jq"
    echo "   Arch Linux: sudo pacman -S jq"
    exit 1
fi

# Check if mplx CLI is installed
if ! command -v mplx &> /dev/null; then
    echo "❌ Metaplex CLI (mplx) is not installed. Installing..."
    npm install -g @metaplex-foundation/cli
    echo "✅ Metaplex CLI (mplx) installed"
fi

# Extract metadata from JSON file for update command
METADATA_FILE="./lokal-token-metadata-complete.json"
TOKEN_NAME=$(jq -r '.name' "$METADATA_FILE")
TOKEN_SYMBOL=$(jq -r '.symbol' "$METADATA_FILE") 
TOKEN_DESCRIPTION=$(jq -r '.description' "$METADATA_FILE")
TOKEN_IMAGE=$(jq -r '.image' "$METADATA_FILE")

# Upload and update token metadata using modern mplx CLI
echo "📤 Uploading metadata and updating token information..."

mplx toolbox token update "5hnUzmpcavbtWJ2LmL9NMefm58gvBRqWsyUtpQd3QHC9" \
  --keypair "/home/c4n/.config/solana/id.json" \
  --rpc "https://api.devnet.solana.com" \
  --name "$TOKEN_NAME" \
  --symbol "$TOKEN_SYMBOL" \
  --description "$TOKEN_DESCRIPTION" \
  --image "$TOKEN_IMAGE"

echo "✅ Token metadata update complete!"
echo "🪙 Mint: 5hnUzmpcavbtWJ2LmL9NMefm58gvBRqWsyUtpQd3QHC9"
echo "� Name: $TOKEN_NAME"
echo "🏷️ Symbol: $TOKEN_SYMBOL"
echo "📝 Description: $TOKEN_DESCRIPTION"
echo "🖼️ Image: $TOKEN_IMAGE"
echo "🔗 Network: https://api.devnet.solana.com"
echo ""
echo "ℹ️ Note: This uses the modern Metaplex CLI (mplx) to update existing token metadata."
echo "For creating new tokens with metadata, use: mplx toolbox token create --wizard"
