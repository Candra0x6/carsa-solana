#!/bin/bash

# Devnet SOL Faucet Helper
# Helps get devnet SOL when CLI airdrop is rate limited

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() {
    echo -e "${YELLOW}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo -e "${BLUE}💧 Devnet SOL Faucet Helper${NC}"
echo "============================="
echo ""

# Get wallet address
WALLET_ADDRESS=$(solana address 2>/dev/null)
if [ $? -ne 0 ]; then
    print_error "No Solana wallet found. Please run 'solana-keygen new' first."
    exit 1
fi

# Check current network
CURRENT_RPC=$(solana config get | grep "RPC URL" | awk '{print $3}')
if [[ ! "$CURRENT_RPC" == *"devnet"* ]]; then
    print_error "Not connected to devnet. Current RPC: $CURRENT_RPC"
    echo "Run: solana config set --url https://api.devnet.solana.com"
    exit 1
fi

# Show current balance
CURRENT_BALANCE=$(solana balance 2>/dev/null)
print_info "Current wallet: $WALLET_ADDRESS"
print_info "Current balance: $CURRENT_BALANCE"

echo ""
echo -e "${YELLOW}🚰 Available Faucet Options:${NC}"
echo ""

# Try CLI airdrop first
print_step "Trying CLI airdrop..."
if solana airdrop 1; then
    print_success "CLI airdrop successful!"
    NEW_BALANCE=$(solana balance)
    print_success "New balance: $NEW_BALANCE"
    exit 0
else
    print_error "CLI airdrop failed (rate limited)"
fi

echo ""
echo -e "${YELLOW}📱 Web Faucets (copy your address):${NC}"
echo ""
echo "1. Official Solana Faucet:"
echo "   🔗 https://faucet.solana.com/"
echo "   📋 Wallet: $WALLET_ADDRESS"
echo ""
echo "2. Alternative SOL Faucet:"
echo "   🔗 https://solfaucet.com/"
echo "   📋 Wallet: $WALLET_ADDRESS"
echo ""
echo "3. QuickNode Faucet:"
echo "   🔗 https://faucet.quicknode.com/solana/devnet"
echo "   📋 Wallet: $WALLET_ADDRESS"
echo ""

# Copy address to clipboard if xclip is available
if command -v xclip &> /dev/null; then
    echo "$WALLET_ADDRESS" | xclip -selection clipboard
    print_success "Wallet address copied to clipboard!"
elif command -v pbcopy &> /dev/null; then
    echo "$WALLET_ADDRESS" | pbcopy
    print_success "Wallet address copied to clipboard!"
fi

echo ""
echo -e "${YELLOW}⏱️  After getting SOL from a faucet:${NC}"
echo "• Wait 30-60 seconds for confirmation"
echo "• Check balance: solana balance"
echo "• Continue with your setup"

echo ""
read -p "Press Enter to check balance again..."

NEW_BALANCE=$(solana balance)
print_info "Current balance: $NEW_BALANCE"

# Check if we have sufficient balance now
BALANCE_LAMPORTS=$(solana balance --lamports 2>/dev/null | grep -oE '[0-9]+' | head -1)
if [ -n "$BALANCE_LAMPORTS" ] && [ "$BALANCE_LAMPORTS" -gt 100000000 ]; then  # 0.1 SOL
    print_success "Sufficient balance detected! You can continue with setup."
else
    print_error "Still insufficient balance. Please get more SOL from the faucets above."
fi
