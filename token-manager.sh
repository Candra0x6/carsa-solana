#!/bin/bash

# 🪙 CARSA Token Management Utilities
# Manage Lokal tokens: check info, mint to users, create accounts, etc.

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
NETWORK=${SOLANA_NETWORK:-"devnet"}  # Default to devnet
if [ "$NETWORK" = "devnet" ]; then
    RPC_URL="https://api.devnet.solana.com"
elif [ "$NETWORK" = "mainnet" ]; then
    RPC_URL="https://api.mainnet-beta.solana.com"
elif [ "$NETWORK" = "localnet" ]; then
    RPC_URL="http://localhost:8899"
fi

# Load token addresses if available
if [[ -f "carsa-contracts/lokal-token-addresses.json" ]]; then
    MINT_ADDRESS=$(jq -r '.mintAddress' carsa-contracts/lokal-token-addresses.json)
    CONFIG_PDA=$(jq -r '.configPda' carsa-contracts/lokal-token-addresses.json)
    PROGRAM_ID=$(jq -r '.programId' carsa-contracts/lokal-token-addresses.json)
else
    echo -e "${RED}❌ Token not initialized. Run './setup.sh' first${NC}"
    exit 1
fi

# Set Solana config to the appropriate network
solana config set --url $RPC_URL > /dev/null 2>&1

show_help() {
    echo -e "${BLUE}🪙 CARSA Token Management${NC}"
    echo "========================="
    echo ""
    echo "Usage: $0 <command> [arguments]"
    echo ""
    echo "Commands:"
    echo "  info                     - Show token mint information"
    echo "  balance <wallet>         - Check Lokal token balance"
    echo "  create-account <wallet>  - Create token account for wallet"
    echo "  mint <wallet> <amount>   - Mint tokens to wallet (requires program authority)"
    echo "  transfer <from> <to> <amount> - Transfer tokens between wallets"
    echo "  accounts                 - List all token accounts"
    echo "  supply                   - Show total token supply"
    echo "  holders                  - Show token holders and balances"
    echo "  help                     - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 info"
    echo "  $0 balance 6ycCaQekY7qwhmcQaRevm16sM5GM7JBszDLLwhTuaCiE"
    echo "  $0 create-account 6ycCaQekY7qwhmcQaRevm16sM5GM7JBszDLLwhTuaCiE"
    echo "  $0 mint 6ycCaQekY7qwhmcQaRevm16sM5GM7JBszDLLwhTuaCiE 1000"
    echo ""
    echo "Current token: ${YELLOW}$MINT_ADDRESS${NC}"
}

token_info() {
    echo -e "${BLUE}🪙 Lokal Token Information${NC}"
    echo "=========================="
    echo -e "Mint Address: ${YELLOW}$MINT_ADDRESS${NC}"
    echo -e "Program ID: ${YELLOW}$PROGRAM_ID${NC}"
    echo -e "Config PDA: ${YELLOW}$CONFIG_PDA${NC}"
    echo ""
    
    # Get mint info
    echo -e "${BLUE}📊 Mint Details:${NC}"
    solana account "$MINT_ADDRESS" --output json-compact | jq -r '
        .account.data.parsed.info |
        "  • Decimals: \(.decimals)",
        "  • Supply: \(.supply)",
        "  • Mint Authority: \(.mintAuthority // "None")",
        "  • Freeze Authority: \(.freezeAuthority // "None")"
    '
    
    echo ""
    echo -e "${BLUE}⚙️ Program Configuration:${NC}"
    if command -v anchor &> /dev/null && [[ -d "carsa-contracts" ]]; then
        cd carsa-contracts
        anchor account LokalMintConfig "$CONFIG_PDA" 2>/dev/null | grep -E "(mint|totalSupply|updateAuthority)" || echo "  • Unable to fetch config details"
        cd ..
    else
        echo "  • Run from carsa directory with Anchor installed to see config details"
    fi
}

check_balance() {
    local wallet=$1
    if [[ -z "$wallet" ]]; then
        echo -e "${RED}❌ Please provide wallet address${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}💰 Checking Lokal token balance for: ${YELLOW}$wallet${NC}"
    
    # Get associated token account
    ATA=$(spl-token account-info "$MINT_ADDRESS" --owner "$wallet" --output json 2>/dev/null | jq -r '.address // empty')
    
    if [[ -z "$ATA" ]]; then
        echo -e "${YELLOW}⚠️  No token account found. Balance: 0 LOKAL${NC}"
        echo "Create account with: $0 create-account $wallet"
    else
        BALANCE=$(spl-token balance "$MINT_ADDRESS" --owner "$wallet" 2>/dev/null || echo "0")
        echo -e "${GREEN}✅ Balance: ${YELLOW}$BALANCE LOKAL${NC}"
        echo -e "Token Account: ${YELLOW}$ATA${NC}"
    fi
}

create_account() {
    local wallet=$1
    if [[ -z "$wallet" ]]; then
        echo -e "${RED}❌ Please provide wallet address${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}🔧 Creating Lokal token account for: ${YELLOW}$wallet${NC}"
    
    # Check if account already exists
    ATA=$(spl-token account-info "$MINT_ADDRESS" --owner "$wallet" --output json 2>/dev/null | jq -r '.address // empty')
    
    if [[ -n "$ATA" ]]; then
        echo -e "${YELLOW}ℹ️ Token account already exists: ${GREEN}$ATA${NC}"
        return
    fi
    
    # Create the account
    RESULT=$(spl-token create-account "$MINT_ADDRESS" --owner "$wallet" 2>&1)
    if [[ $? -eq 0 ]]; then
        ATA=$(echo "$RESULT" | grep -o "[A-Za-z0-9]\{44\}" | head -1)
        echo -e "${GREEN}✅ Token account created: ${YELLOW}$ATA${NC}"
    else
        echo -e "${RED}❌ Failed to create token account: $RESULT${NC}"
    fi
}

mint_tokens() {
    local wallet=$1
    local amount=$2
    
    if [[ -z "$wallet" ]] || [[ -z "$amount" ]]; then
        echo -e "${RED}❌ Usage: $0 mint <wallet> <amount>${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}🪙 Minting ${YELLOW}$amount LOKAL${BLUE} to: ${YELLOW}$wallet${NC}"
    
    # Check if token account exists
    ATA=$(spl-token account-info "$MINT_ADDRESS" --owner "$wallet" --output json 2>/dev/null | jq -r '.address // empty')
    
    if [[ -z "$ATA" ]]; then
        echo -e "${YELLOW}⚠️  Token account doesn't exist. Creating...${NC}"
        create_account "$wallet"
        ATA=$(spl-token account-info "$MINT_ADDRESS" --owner "$wallet" --output json 2>/dev/null | jq -r '.address')
    fi
    
    # Convert to smallest unit (considering 9 decimals)
    AMOUNT_LAMPORTS=$((amount * 1000000000))
    
    echo -e "${BLUE}🚀 Using program to mint tokens...${NC}"
    
    if [[ -d "carsa-contracts" ]]; then
        cd carsa-contracts
        
        # Create TypeScript script to mint tokens
        cat > mint-tokens-script.ts << 'EOF'
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Carsa } from "./target/types/carsa";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";

async function mintTokens() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Carsa as Program<Carsa>;
  
  const mintPubkey = new PublicKey("MINT_ADDRESS_PLACEHOLDER");
  const recipientPubkey = new PublicKey("WALLET_PLACEHOLDER");
  const amount = new anchor.BN(AMOUNT_PLACEHOLDER);
  
  // Get PDAs
  const [mintAuthorityPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint_authority")],
    program.programId
  );
  
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );
  
  // Get recipient token account
  const recipientTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    recipientPubkey
  );
  
  try {
    const tx = await program.methods
      .mintLokalTokens(amount)
      .accounts({
        mint: mintPubkey,
        mintAuthority: mintAuthorityPda,
        config: configPda,
        recipientTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
      
    console.log("✅ Tokens minted successfully!");
    console.log("📝 Transaction:", tx);
    console.log("🪙 Amount:", amount.toString() + " LOKAL (raw units)");
    console.log("👤 Recipient:", recipientPubkey.toBase58());
    
  } catch (error) {
    console.error("❌ Error minting tokens:", error);
    process.exit(1);
  }
}

mintTokens();
EOF
        
        # Replace placeholders with actual values
        sed -i "s/MINT_ADDRESS_PLACEHOLDER/$MINT_ADDRESS/g" mint-tokens-script.ts
        sed -i "s/WALLET_PLACEHOLDER/$wallet/g" mint-tokens-script.ts
        sed -i "s/AMOUNT_PLACEHOLDER/$AMOUNT_LAMPORTS/g" mint-tokens-script.ts
        
        # Run the script
        npx ts-node mint-tokens-script.ts
        rm mint-tokens-script.ts
        cd ..
    else
        echo -e "${RED}❌ Not in CARSA project directory${NC}"
        exit 1
    fi
}

list_accounts() {
    echo -e "${BLUE}📊 All Lokal Token Accounts${NC}"
    echo "=========================="
    
    spl-token accounts "$MINT_ADDRESS" --output json | jq -r '
        .[] | 
        "Account: \(.address)",
        "Owner: \(.owner)", 
        "Balance: \(.tokenAmount.uiAmountString) LOKAL",
        "---"
    '
}

show_supply() {
    echo -e "${BLUE}📈 Lokal Token Supply${NC}"
    echo "===================="
    
    SUPPLY_INFO=$(solana account "$MINT_ADDRESS" --output json-compact | jq -r '.account.data.parsed.info')
    SUPPLY=$(echo "$SUPPLY_INFO" | jq -r '.supply')
    DECIMALS=$(echo "$SUPPLY_INFO" | jq -r '.decimals')
    
    # Calculate UI amount
    UI_SUPPLY=$(echo "scale=9; $SUPPLY / (10^$DECIMALS)" | bc -l)
    
    echo -e "Total Supply: ${YELLOW}$UI_SUPPLY LOKAL${NC}"
    echo -e "Raw Supply: ${YELLOW}$SUPPLY${NC} (smallest units)"
    echo -e "Decimals: ${YELLOW}$DECIMALS${NC}"
}

show_holders() {
    echo -e "${BLUE}👥 Lokal Token Holders${NC}"
    echo "====================="
    
    spl-token accounts "$MINT_ADDRESS" --output json | jq -r '
        sort_by(.tokenAmount.uiAmount | tonumber) | reverse | 
        .[] | 
        select(.tokenAmount.uiAmount > 0) |
        "🪙 \(.tokenAmount.uiAmountString) LOKAL - \(.owner)"
    ' | head -20
    
    TOTAL_HOLDERS=$(spl-token accounts "$MINT_ADDRESS" --output json | jq '[.[] | select(.tokenAmount.uiAmount > 0)] | length')
    echo ""
    echo -e "Total holders with balance > 0: ${YELLOW}$TOTAL_HOLDERS${NC}"
}

# Main command handler
case "$1" in
    "info")
        token_info
        ;;
    "balance")
        check_balance "$2"
        ;;
    "create-account")
        create_account "$2"
        ;;
    "mint")
        mint_tokens "$2" "$3"
        ;;
    "accounts")
        list_accounts
        ;;
    "supply")
        show_supply
        ;;
    "holders")
        show_holders
        ;;
    "help"|""|*)
        show_help
        ;;
esac
