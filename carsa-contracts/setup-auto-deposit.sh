#!/bin/bash

# Auto-Deposit Setup Script
# This script helps you configure automatic deposits without running a background service

set -e

echo "🚀 Auto-Deposit Setup"
echo "===================="
echo ""

# Determine project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Check if delegate keypair exists
DELEGATE_KEYPAIR="$PROJECT_ROOT/delegate-keypair.json"
if [ ! -f "$DELEGATE_KEYPAIR" ]; then
    echo "❌ Error: delegate-keypair.json not found at $DELEGATE_KEYPAIR"
    echo "Expected location: $DELEGATE_KEYPAIR"
    exit 1
fi

# Create .env.local in frontend
FRONTEND_DIR="$PROJECT_ROOT/carsa-frontend"
ENV_FILE="$FRONTEND_DIR/.env.local"

echo "📝 Creating environment configuration..."
echo ""

# Read delegate keypair
DELEGATE_KEY=$(cat "$DELEGATE_KEYPAIR")

# Check if .env.local exists
if [ -f "$ENV_FILE" ]; then
    echo "⚠️  .env.local already exists"
    read -p "Do you want to overwrite it? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled"
        exit 1
    fi
fi

# Create .env.local
cat > "$ENV_FILE" << EOF
# Solana Configuration
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Pool Delegate Private Key (KEEP THIS SECRET!)
# This allows the backend to deposit tokens on behalf of users
DELEGATE_PRIVATE_KEY='$DELEGATE_KEY'

# Optional: Carsa Program IDL
# CARSA_IDL='{...}'
EOF

echo "✅ Created $ENV_FILE"
echo ""

# Copy IDL to frontend
echo "📦 Copying IDL to frontend..."
IDL_FILE="$SCRIPT_DIR/target/idl/carsa.json"
if [ -f "$IDL_FILE" ]; then
    mkdir -p "$FRONTEND_DIR/public"
    cp "$IDL_FILE" "$FRONTEND_DIR/public/carsa-idl.json"
    echo "✅ Copied IDL to public/carsa-idl.json"
else
    echo "⚠️  IDL not found at $IDL_FILE. Run 'anchor build' first."
fi

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. cd ../carsa-frontend"
echo "2. npm run dev"
echo "3. Visit /test page and approve tokens"
echo "4. Deposits will happen automatically! 🚀"
echo ""
echo "⚠️  SECURITY NOTE:"
echo "- Never commit .env.local to git"
echo "- The delegate key is only for staking deposits"
echo "- Keep your main wallet separate"
echo ""
echo "📚 Read AUTOMATIC_DEPOSIT_GUIDE.md for more info"
