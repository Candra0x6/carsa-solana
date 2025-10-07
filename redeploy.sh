#!/bin/bash

# Quick rebuild and redeploy script for development
# Use this during development when you make changes to the contract

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${YELLOW}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Configuration
SOLANA_NETWORK=${1:-devnet}  # Default to devnet, can be overridden
PROJECT_ROOT="$(pwd)"
CONTRACTS_DIR="$PROJECT_ROOT/carsa-contracts"
FRONTEND_DIR="$PROJECT_ROOT/carsa-frontend"

if [ "$SOLANA_NETWORK" = "devnet" ]; then
    RPC_URL="https://api.devnet.solana.com"
elif [ "$SOLANA_NETWORK" = "mainnet" ]; then
    RPC_URL="https://api.mainnet-beta.solana.com"
elif [ "$SOLANA_NETWORK" = "localnet" ]; then
    RPC_URL="http://localhost:8899"
else
    print_error "Invalid network. Use: devnet, mainnet, or localnet"
    exit 1
fi

echo -e "${YELLOW}🔨 Quick Rebuild & Redeploy for $SOLANA_NETWORK${NC}"
echo ""

cd "$CONTRACTS_DIR"

# Set Solana config
print_step "Setting Solana config to $SOLANA_NETWORK..."
solana config set --url $RPC_URL

# Build contracts
print_step "Building contracts..."
anchor build

# Deploy contracts
print_step "Deploying to $SOLANA_NETWORK..."
anchor deploy --provider.cluster $SOLANA_NETWORK

# Copy types to frontend
print_step "Updating frontend types..."
if [ -f "$CONTRACTS_DIR/target/types/carsa.ts" ]; then
    mkdir -p "$FRONTEND_DIR/src/types/anchor"
    cp "$CONTRACTS_DIR/target/types/carsa.ts" "$FRONTEND_DIR/src/types/anchor/"
    print_success "Types updated in frontend"
fi

# Get program ID
PROGRAM_ID=$(solana address -k target/deploy/carsa-keypair.json)

print_success "Rebuild and redeploy complete!"
echo "Program ID: $PROGRAM_ID"
echo ""
echo "If you made changes to the program interface, restart your frontend:"
echo "cd carsa-frontend && yarn dev"
