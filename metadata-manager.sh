#!/bin/bash

# 🎨 CARSA Token Metadata Management Script
# Create, update, and manage Lokal token metadata using Metaplex

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
NETWORK=${SOLANA_NETWORK:-"devnet"}
if [ "$NETWORK" = "devnet" ]; then
    RPC_URL="https://api.devnet.solana.com"
elif [ "$NETWORK" = "mainnet" ]; then
    RPC_URL="https://api.mainnet-beta.solana.com"
elif [ "$NETWORK" = "localnet" ]; then
    RPC_URL="http://localhost:8899"
fi

print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}🎨 CARSA Token Metadata Manager${NC}"
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

check_requirements() {
    print_step "Checking requirements..."
    
    # Check if we're in the right directory
    if [ ! -f "lokal-token-addresses.json" ]; then
        print_error "Not in carsa-contracts directory or token not initialized"
        echo "Please run this script from carsa-contracts directory after token initialization"
        exit 1
    fi
    
    # Check Solana CLI
    if ! command -v solana &> /dev/null; then
        print_error "Solana CLI not found. Please install it first."
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js not found. Please install it first."
        exit 1
    fi
    
    print_success "Requirements check passed"
}

install_metaplex_cli() {
    if ! command -v metaplex &> /dev/null; then
        print_step "Installing Metaplex CLI..."
        bash <(curl -sSf https://sugar.metaplex.com/install.sh)
        print_success "Metaplex CLI installed"
    else
        print_success "Metaplex CLI already installed"
    fi
}

prepare_metadata() {
    print_step "Preparing token metadata..."
    
    # Install dependencies if needed
    if ! npm list @metaplex-foundation/js &> /dev/null; then
        print_step "Installing Metaplex dependencies..."
        yarn add @metaplex-foundation/js @metaplex-foundation/mpl-token-metadata
    fi
    
    # Run metadata preparation script
    npx ts-node create-metadata.ts
    
    print_success "Metadata preparation complete"
}

create_metadata() {
    print_step "Creating on-chain token metadata..."
    
    if [ ! -f "create-token-metadata.sh" ]; then
        print_error "Metadata script not found. Run 'prepare' command first."
        exit 1
    fi
    
    # Make script executable
    chmod +x create-token-metadata.sh
    
    # Run the metadata creation script
    ./create-token-metadata.sh
    
    print_success "On-chain metadata created successfully!"
}

update_metadata() {
    print_step "Updating token metadata..."
    
    # Load addresses
    MINT_ADDRESS=$(jq -r '.mintAddress' lokal-token-addresses.json)
    UPDATE_AUTHORITY=$(jq -r '.updateAuthority' lokal-token-addresses.json)
    
    if [ ! -f "lokal-token-metadata-complete.json" ]; then
        print_error "Complete metadata file not found. Run 'prepare' first."
        exit 1
    fi
    
    echo "Current mint: $MINT_ADDRESS"
    echo "Update authority: $UPDATE_AUTHORITY"
    
    # Update metadata
    metaplex update-metadata \
        --keypair ~/.config/solana/id.json \
        --rpc "$RPC_URL" \
        --mint "$MINT_ADDRESS" \
        --metadata "./lokal-token-metadata-complete.json"
    
    print_success "Metadata updated successfully!"
}

verify_metadata() {
    print_step "Verifying token metadata..."
    
    MINT_ADDRESS=$(jq -r '.mintAddress' lokal-token-addresses.json)
    
    echo "🪙 Mint Address: $MINT_ADDRESS"
    echo "🔗 Network: $RPC_URL"
    echo ""
    
    # Get token info
    solana account "$MINT_ADDRESS" --output json-compact | jq -r '
        if .account.data.parsed then
            .account.data.parsed.info |
            "Token Info:",
            "• Supply: \(.supply)",
            "• Decimals: \(.decimals)",
            "• Mint Authority: \(.mintAuthority // "None")",
            "• Freeze Authority: \(.freezeAuthority // "None")"
        else
            "Could not parse token account data"
        end
    '
    
    echo ""
    
    # Try to get metadata account
    metaplex show "$MINT_ADDRESS" --rpc "$RPC_URL" || echo "No on-chain metadata found"
    
    print_success "Metadata verification complete"
}

show_summary() {
    print_step "Token Metadata Summary"
    
    if [ -f "lokal-token-summary.json" ]; then
        cat lokal-token-summary.json | jq -r '
            "🪙 Token Information:",
            "• Name: \(.token.name)",
            "• Symbol: \(.token.symbol)", 
            "• Mint: \(.token.mintAddress)",
            "• Decimals: \(.token.decimals)",
            "",
            "📁 Files:",
            "• Metadata: \(.token.metadataFile)",
            "• Upload Script: \(.metadata.uploadScript)",
            "",
            "🔗 Network: \(.network)",
            "👤 Creator: \(.metadata.createdBy)"
        '
    else
        print_error "Summary file not found. Run 'prepare' command first."
    fi
}

show_help() {
    echo "CARSA Token Metadata Manager"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  prepare     - Prepare metadata files and scripts"
    echo "  create      - Create on-chain metadata (requires SOL)"
    echo "  update      - Update existing metadata"
    echo "  verify      - Verify current metadata state"
    echo "  summary     - Show token and metadata summary"
    echo "  install-cli - Install Metaplex CLI"
    echo "  help        - Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  SOLANA_NETWORK - Network to use (devnet|mainnet|localnet)"
    echo ""
    echo "Examples:"
    echo "  $0 prepare                    # Prepare metadata files"
    echo "  $0 create                     # Create on-chain metadata"
    echo "  SOLANA_NETWORK=mainnet $0 verify  # Verify on mainnet"
}

# Main execution
case "${1:-help}" in
    "prepare")
        print_header
        check_requirements
        prepare_metadata
        echo ""
        print_success "Metadata prepared! Run '$0 create' to create on-chain metadata."
        ;;
    "create")
        print_header
        check_requirements
        install_metaplex_cli
        create_metadata
        ;;
    "update")
        print_header
        check_requirements
        install_metaplex_cli
        update_metadata
        ;;
    "verify")
        print_header
        check_requirements
        verify_metadata
        ;;
    "summary")
        print_header
        show_summary
        ;;
    "install-cli")
        print_header
        install_metaplex_cli
        ;;
    "help"|*)
        show_help
        ;;
esac
