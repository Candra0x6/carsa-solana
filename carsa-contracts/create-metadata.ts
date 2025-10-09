import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import fs from "fs";
import os from "os";

/**
 * Simple metadata creation script for Lokal Token
 * This script creates a metadata JSON file with token information
 * and provides instructions for using Metaplex CLI to create on-chain metadata
 */
async function createTokenMetadata() {
  try {
    console.log("🚀 Preparing Lokal Token Metadata...");
    
    // Setup connection and wallet info
    const network = process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com";
    
    // Get wallet keypair
    const keypairPath = process.env.ANCHOR_WALLET || `${os.homedir()}/.config/solana/id.json`;
    
    if (!fs.existsSync(keypairPath)) {
      throw new Error(`Wallet keypair not found at ${keypairPath}. Please run 'solana-keygen new' first.`);
    }
    
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
    
    console.log("🔗 Network:", network);
    console.log("👤 Wallet:", wallet.publicKey.toBase58());
    
    // Load mint address
    if (!fs.existsSync("lokal-token-addresses.json")) {
      throw new Error("Token addresses not found. Please run initialize-token.ts first.");
    }
    
    const addresses = JSON.parse(fs.readFileSync("lokal-token-addresses.json", "utf8"));
    const mintAddress = process.env.LOKAL_MINT_ADDRESS || addresses.mintAddress;
    
    console.log("🪙 Mint Address:", mintAddress);
    
    // Load and prepare metadata
    const metadata = JSON.parse(fs.readFileSync("lokal-token-metadata.json", "utf8"));
    
    // Update creator address with actual wallet
    metadata.properties.creators[0].address = wallet.publicKey.toBase58();
    
    
    // Create a complete metadata file with all info
    const completeMetadata = {
      ...metadata,
      mint: mintAddress,
      decimals: 9,
      freeze_authority: null, // Can be updated if needed
      mint_authority: addresses.mintAuthorityPda,
      update_authority: wallet.publicKey.toBase58(),
      network: network.includes("devnet") ? "devnet" : network.includes("mainnet") ? "mainnet" : "localnet"
    };
    
    // Save the complete metadata
    fs.writeFileSync("lokal-token-metadata-complete.json", JSON.stringify(completeMetadata, null, 2));
    console.log("💾 Complete metadata saved to: lokal-token-metadata-complete.json");
    
    // Create Metaplex CLI configuration
    const metaplexConfig = {
      json: "./lokal-token-metadata-complete.json",
      keypair: keypairPath,
      rpc: network,
      mint: mintAddress,
      update_authority: wallet.publicKey.toBase58()
    };
    
    fs.writeFileSync("metaplex-config.json", JSON.stringify(metaplexConfig, null, 2));
    console.log("⚙️ Metaplex CLI config saved to: metaplex-config.json");
    
    // Create upload script for Metaplex CLI
    const uploadScript = `#!/bin/bash

# LOKAL Token Metadata Upload Script
# This script uses modern Metaplex CLI (mplx) to update token metadata

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
TOKEN_NAME=\\$(jq -r '.name' "\\$METADATA_FILE")
TOKEN_SYMBOL=\\$(jq -r '.symbol' "\\$METADATA_FILE") 
TOKEN_DESCRIPTION=\\$(jq -r '.description' "\\$METADATA_FILE")
TOKEN_IMAGE=\\$(jq -r '.image' "\\$METADATA_FILE")

# Upload and update token metadata using modern mplx CLI
echo "📤 Uploading metadata and updating token information..."

mplx toolbox token update "${mintAddress}" \\
  --keypair "${keypairPath}" \\
  --rpc "${network}" \\
  --name "\\$TOKEN_NAME" \\
  --symbol "\\$TOKEN_SYMBOL" \\
  --description "\\$TOKEN_DESCRIPTION" \\
  --image "\\$TOKEN_IMAGE"

echo "✅ Token metadata update complete!"
echo "🪙 Mint: ${mintAddress}"
echo "� Name: \\$TOKEN_NAME"
echo "🏷️ Symbol: \\$TOKEN_SYMBOL"
echo "📝 Description: \\$TOKEN_DESCRIPTION"
echo "🖼️ Image: \\$TOKEN_IMAGE"
echo "🔗 Network: ${network}"
echo ""
echo "ℹ️ Note: This uses the modern Metaplex CLI (mplx) to update existing token metadata."
echo "For creating new tokens with metadata, use: mplx toolbox token create --wizard"
`;

    fs.writeFileSync("create-token-metadata.sh", uploadScript);
    
    // Make script executable
    try {
      fs.chmodSync("create-token-metadata.sh", 0o755);
    } catch (chmodError) {
      console.log("Note: Could not make script executable. Run: chmod +x create-token-metadata.sh");
    }
    
    console.log("� Upload script created: create-token-metadata.sh");
    
    // Update addresses file with metadata info
    const updatedAddresses = {
      ...addresses,
      tokenName: metadata.name,
      tokenSymbol: metadata.symbol,
      metadataFile: "./lokal-token-metadata-complete.json",
      uploadScript: "./create-token-metadata.sh"
    };
    
    fs.writeFileSync("lokal-token-addresses.json", JSON.stringify(updatedAddresses, null, 2));
    console.log("💾 Updated addresses file with metadata info");
    
    // Create a summary file for easy reference
    const summary = {
      token: {
        name: metadata.name,
        symbol: metadata.symbol,
        mintAddress: mintAddress,
        decimals: 9,
        description: metadata.description,
        metadataFile: "./lokal-token-metadata-complete.json"
      },
      program: {
        programId: addresses.programId,
        configPda: addresses.configPda,
        mintAuthorityPda: addresses.mintAuthorityPda,
        updateAuthority: addresses.updateAuthority
      },
      metadata: {
        configFile: "./metaplex-config.json",
        uploadScript: "./create-token-metadata.sh",
        createdBy: wallet.publicKey.toBase58()
      },
      network: network,
      instructions: [
        "1. Run './create-token-metadata.sh' to create on-chain metadata",
        "2. Or use 'metaplex create-metadata' command manually",
        "3. Metadata will be uploaded to Arweave automatically"
      ]
    };
    
    fs.writeFileSync("lokal-token-summary.json", JSON.stringify(summary, null, 2));
    console.log("📋 Created token summary file: lokal-token-summary.json");
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ Token metadata preparation complete!");
    console.log("=".repeat(60));
    console.log("📁 Files created:");
    console.log("  • lokal-token-metadata-complete.json (complete metadata)");
    console.log("  • metaplex-config.json (CLI configuration)");
    console.log("  • create-token-metadata.sh (upload script)");
    console.log("  • lokal-token-summary.json (summary)");
    console.log("");
    console.log("🚀 Next steps:");
    console.log("  1. Run: ./create-token-metadata.sh");
    console.log("  2. This will update the token metadata using modern mplx CLI");
    console.log("  3. Or install Metaplex CLI and run commands manually");
    console.log("");
    console.log("🔧 Manual Metaplex CLI installation:");
    console.log("  npm install -g @metaplex-foundation/cli");
    console.log("");
    console.log("🆕 For creating new tokens with metadata:");
    console.log("  mplx toolbox token create --wizard");
    
  } catch (error) {
    console.error("❌ Error preparing token metadata:", error);
    process.exit(1);
  }
}

createTokenMetadata();
