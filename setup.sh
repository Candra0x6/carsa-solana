#!/bin/bash

# CARSA Solana Project Setup Script
# This script sets up the entire Solana project: contracts, deployment, token initialization, and frontend configuration

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project paths
PROJECT_ROOT="$(pwd)"
CONTRACTS_DIR="$PROJECT_ROOT/carsa-contracts"
FRONTEND_DIR="$PROJECT_ROOT/carsa-frontend"

# Configuration
SOLANA_NETWORK="devnet"  # Change to "devnet" for devnet deployment
RPC_URL="https://api.devnet.solana.com"

print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}🚀 CARSA Solana Project Setup${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

print_step() {
    echo -e "${YELLOW}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_dependencies() {
    print_step "Checking dependencies..."
    
    # Check if Solana CLI is installed
    if ! command -v solana &> /dev/null; then
        print_error "Solana CLI is not installed. Please install it first:"
        echo "sh -c \"\$(curl -sSfL https://release.solana.com/v1.18.22/install)\""
        exit 1
    fi
    
    # Check if Anchor is installed
    if ! command -v anchor &> /dev/null; then
        print_error "Anchor is not installed. Please install it first:"
        echo "npm install -g @coral-xyz/anchor-cli"
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install it first."
        exit 1
    fi
    
    # Check if yarn is installed
    if ! command -v yarn &> /dev/null; then
        print_error "Yarn is not installed. Please install it first:"
        echo "npm install -g yarn"
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

setup_solana_config() {
    print_step "Setting up Solana configuration for $SOLANA_NETWORK..."
    
    # Set Solana config to devnet
    solana config set --url $RPC_URL
    
    # Check if keypair exists, if not create one
    if [ ! -f ~/.config/solana/id.json ]; then
        print_step "Creating new Solana keypair..."
        solana-keygen new --outfile ~/.config/solana/id.json --no-bip39-passphrase
    fi
    
    # Get some SOL for devnet operations
    if [ "$SOLANA_NETWORK" = "devnet" ]; then
        print_step "Requesting SOL airdrop for devnet..."
        
        # Check current balance
        CURRENT_BALANCE=$(solana balance --lamports 2>/dev/null || echo "0")
        REQUIRED_BALANCE=1000000000  # 1 SOL in lamports
        
        if [ "$CURRENT_BALANCE" -lt "$REQUIRED_BALANCE" ]; then
            print_step "Current balance is low, requesting airdrop..."
            
            # Try multiple airdrop attempts with different amounts
            for amount in 1 0.5 0.1; do
                if solana airdrop $amount; then
                    print_success "Airdrop successful: $amount SOL"
                    break
                else
                    print_error "Airdrop failed for $amount SOL, trying smaller amount..."
                    sleep 2
                fi
            done
            
            # Check if we still have insufficient funds
            NEW_BALANCE=$(solana balance --lamports 2>/dev/null || echo "0")
            if [ "$NEW_BALANCE" -lt "$REQUIRED_BALANCE" ]; then
                print_error "Unable to get sufficient SOL via airdrop"
                echo "You can get devnet SOL from these sources:"
                echo "1. https://faucet.solana.com/ (web faucet)"
                echo "2. https://solfaucet.com/ (alternative faucet)"
                echo "3. Try again later when airdrop rate limits reset"
                echo ""
                echo "Your wallet address: $(solana address)"
                echo "Current balance: $(solana balance)"
                echo ""
                read -p "Press Enter to continue once you have sufficient SOL..."
            fi
        else
            print_success "Sufficient SOL balance detected"
        fi
    fi
    
    print_success "Solana configuration complete"
}

setup_contracts() {
    print_step "Setting up Solana contracts..."
    
    cd "$CONTRACTS_DIR"
    
    # Update Anchor.toml for devnet
    print_step "Updating Anchor.toml for $SOLANA_NETWORK..."
    cat > Anchor.toml << EOF
[toolchain]
package_manager = "yarn"

[features]
resolution = true
skip-lint = false

[programs.localnet]
carsa = "FicaEwstRkE9pwHZPWS34XAjnbH6vc8aZ2Ly4EiksmxY"

[programs.devnet]
carsa = "FicaEwstRkE9pwHZPWS34XAjnbH6vc8aZ2Ly4EiksmxY"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "$SOLANA_NETWORK"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
EOF
    
    # Install dependencies
    print_step "Installing contract dependencies..."
    yarn install
    
    # Build the contracts
    print_step "Building Anchor contracts..."
    anchor build
    
    print_success "Contracts setup complete"
}

deploy_contracts() {
    print_step "Deploying contracts to $SOLANA_NETWORK..."
    
    cd "$CONTRACTS_DIR"
    
    # Deploy the program
    anchor deploy --provider.cluster $SOLANA_NETWORK
    
    # Get the deployed program ID
    DEPLOYED_PROGRAM_ID=$(solana address -k target/deploy/carsa-keypair.json)
    
    print_success "Contracts deployed successfully!"
    echo "Program ID: $DEPLOYED_PROGRAM_ID"
}

initialize_token() {
    print_step "Initializing LOKAL token on $SOLANA_NETWORK..."
    
    cd "$CONTRACTS_DIR"
    
    # Generate mint keypair if it doesn't exist
    if [ ! -f lokal-mint-keypair.json ]; then
        print_step "Generating new mint keypair..."
        solana-keygen new --outfile lokal-mint-keypair.json --no-bip39-passphrase
    fi
    
    # Run token initialization
    print_step "Running token initialization script..."
    npx ts-node initialize-token.ts
    
    print_success "Token initialization complete"
}

setup_frontend_env() {
    print_step "Setting up frontend environment..."
    
    cd "$FRONTEND_DIR"
    
    # Install frontend dependencies
    print_step "Installing frontend dependencies..."
    yarn install
    
    # Get contract addresses
    if [ -f "$CONTRACTS_DIR/lokal-token-addresses.json" ]; then
        MINT_ADDRESS=$(cat "$CONTRACTS_DIR/lokal-token-addresses.json" | grep -o '"mintAddress": "[^"]*"' | cut -d'"' -f4)
        PROGRAM_ID=$(cat "$CONTRACTS_DIR/lokal-token-addresses.json" | grep -o '"programId": "[^"]*"' | cut -d'"' -f4)
    else
        PROGRAM_ID=$(solana address -k "$CONTRACTS_DIR/target/deploy/carsa-keypair.json")
        MINT_ADDRESS="TBD"
    fi
    
    # Create or update .env.local
    print_step "Updating frontend environment variables..."
    cat > .env.local << EOF
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/carsa_db"

# Next Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-$(openssl rand -base64 32)"

# Solana Configuration
NEXT_PUBLIC_ANCHOR_PROGRAM_ID=$PROGRAM_ID
NEXT_PUBLIC_SOLANA_NETWORK="$RPC_URL"
NEXT_PUBLIC_LOKAL_MINT_ADDRESS="$MINT_ADDRESS"

# Server Wallet (for backend operations) 
# IMPORTANT: Generate a new keypair for production use
SERVER_WALLET_PRIVATE_KEY="[56,188,158,176,204,231,248,220,149,164,71,204,90,104,9,190,233,196,228,18,137,25,247,3,9,126,44,56,232,247,27,255,204,34,217,119,23,77,52,3,44,76,32,70,184,194,132,137,24,115,105,242,65,113,240,168,26,202,99,101,6,96,218,68]"

# Development flags
NEXT_PUBLIC_ENABLE_DEVTOOLS="true"
EOF
    
    print_success "Frontend environment setup complete"
}

copy_program_types() {
    print_step "Copying program types to frontend..."
    
    # Copy the generated types to frontend
    if [ -f "$CONTRACTS_DIR/target/types/carsa.ts" ]; then
        mkdir -p "$FRONTEND_DIR/src/types/anchor"
        cp "$CONTRACTS_DIR/target/types/carsa.ts" "$FRONTEND_DIR/src/types/anchor/"
        print_success "Program types copied to frontend"
    else
        print_error "Program types not found. Make sure contracts are built."
    fi
}

print_summary() {
    echo ""
    echo -e "${GREEN}🎉 Setup Complete!${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
    echo -e "${YELLOW}📋 Summary:${NC}"
    echo "• Solana Network: $SOLANA_NETWORK"
    echo "• RPC URL: $RPC_URL"
    
    if [ -f "$CONTRACTS_DIR/lokal-token-addresses.json" ]; then
        echo "• Program ID: $(cat "$CONTRACTS_DIR/lokal-token-addresses.json" | grep -o '"programId": "[^"]*"' | cut -d'"' -f4)"
        echo "• Mint Address: $(cat "$CONTRACTS_DIR/lokal-token-addresses.json" | grep -o '"mintAddress": "[^"]*"' | cut -d'"' -f4)"
    fi
    
    echo ""
    echo -e "${YELLOW}🚀 Next Steps:${NC}"
    echo "1. Start the frontend development server:"
    echo "   cd carsa-frontend && yarn dev"
    echo ""
    echo "2. Set up your database (if using Prisma):"
    echo "   cd carsa-frontend && npx prisma migrate dev"
    echo ""
    echo "3. Fund your wallet with devnet SOL:"
    echo "   solana airdrop 2"
    echo ""
    echo -e "${YELLOW}📁 Important Files:${NC}"
    echo "• Contract addresses: carsa-contracts/lokal-token-addresses.json"
    echo "• Frontend env: carsa-frontend/.env.local"
    echo "• Solana config: ~/.config/solana/cli/config.yml"
}

# Main execution
main() {
    print_header
    
    check_dependencies
    setup_solana_config
    setup_contracts
    deploy_contracts
    initialize_token
    setup_frontend_env
    copy_program_types
    
    print_summary
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --network)
            SOLANA_NETWORK="$2"
            if [ "$SOLANA_NETWORK" = "devnet" ]; then
                RPC_URL="https://api.devnet.solana.com"
            elif [ "$SOLANA_NETWORK" = "mainnet" ]; then
                RPC_URL="https://api.mainnet-beta.solana.com"
            elif [ "$SOLANA_NETWORK" = "localnet" ]; then
                RPC_URL="http://localhost:8899"
            fi
            shift 2
            ;;
        --help|-h)
            echo "CARSA Solana Setup Script"
            echo ""
            echo "Usage: ./setup.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --network NETWORK    Set the Solana network (devnet|mainnet|localnet) [default: devnet]"
            echo "  --help, -h          Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./setup.sh                    # Deploy to devnet (default)"
            echo "  ./setup.sh --network devnet  # Deploy to devnet"
            echo "  ./setup.sh --network localnet # Deploy to local validator"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run main function
main
