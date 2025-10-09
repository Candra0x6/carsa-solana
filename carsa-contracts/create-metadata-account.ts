import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { Metaplex, keypairIdentity } from "@metaplex-foundation/js";
import fs from "fs";
import os from "os";

/**
 * Create metadata account for existing SPL token
 * This script creates the metadata account for an existing SPL token mint
 */
async function createMetadataAccount() {
  try {
    console.log("🚀 Creating metadata account for existing SPL token...");
    
    // Setup connection
    const network = process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com";
    const connection = new Connection(network, "confirmed");
    
    // Get wallet keypair
    const keypairPath = process.env.ANCHOR_WALLET || `${os.homedir()}/.config/solana/id.json`;
    
    if (!fs.existsSync(keypairPath)) {
      throw new Error(`Wallet keypair not found at ${keypairPath}. Please run 'solana-keygen new' first.`);
    }
    
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
    
    console.log("🔗 Network:", network);
    console.log("👤 Wallet:", wallet.publicKey.toBase58());
    
    // Initialize Metaplex SDK
    const metaplex = Metaplex.make(connection)
      .use(keypairIdentity(wallet));
    
    // Load token addresses
    if (!fs.existsSync("lokal-token-addresses.json")) {
      throw new Error("Token addresses not found. Please run initialize-token.ts first.");
    }
    
    const addresses = JSON.parse(fs.readFileSync("lokal-token-addresses.json", "utf8"));
    const mintAddress = new PublicKey(addresses.mintAddress);
    
    console.log("🪙 Mint Address:", mintAddress.toBase58());
    
    // Load metadata
    const metadata = JSON.parse(fs.readFileSync("lokal-token-metadata-complete.json", "utf8"));
    
    // Check if metadata already exists
    try {
      const existingNft = await metaplex.nfts().findByMint({ mintAddress });
      if (existingNft) {
        console.log("ℹ️ Metadata already exists for this token!");
        console.log("📄 Metadata address:", existingNft.metadataAddress.toBase58());
        console.log("   You can now use: mplx toolbox token update", mintAddress.toBase58());
        return;
      }
    } catch (error) {
      // Metadata doesn't exist, which is expected
      console.log("📄 No existing metadata found. Creating new metadata account...");
    }
    
    console.log("📤 Creating metadata account with Metaplex SDK...");
    
    // Create NFT with metadata (this works for both NFTs and fungible tokens)
    const { nft } = await metaplex.nfts().create({
      uri: metadata.image || "", // Use image URL as URI for now
      name: metadata.name,
      symbol: metadata.symbol,
      sellerFeeBasisPoints: 0, // No royalties for utility token
      creators: metadata.properties.creators.map(creator => ({
        address: new PublicKey(creator.address),
        verified: true,
        share: creator.share
      })),
      isMutable: true,
      maxSupply: null, // No limit for fungible token
      useExistingMint: mintAddress, // Use our existing mint
    });
    
    console.log("✅ Metadata account created successfully!");
    console.log("� Metadata address:", nft.metadataAddress.toBase58());
    console.log("🪙 Mint:", nft.address.toBase58());
    console.log("🔗 Transaction signature:", "Created successfully");
    
    // Update addresses file with metadata info
    const updatedAddresses = {
      ...addresses,
      metadataAddress: nft.metadataAddress.toBase58(),
      metadataTransaction: "Created",
      tokenName: metadata.name,
      tokenSymbol: metadata.symbol,
    };
    
    fs.writeFileSync("lokal-token-addresses.json", JSON.stringify(updatedAddresses, null, 2));
    console.log("💾 Updated addresses file with metadata info");
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ Metadata account creation complete!");
    console.log("=".repeat(60));
    console.log("🚀 Next steps:");
    console.log("  1. Now you can run: ./create-token-metadata.sh");
    console.log("  2. Or use: mplx toolbox token update", mintAddress.toBase58());
    console.log("  3. Metadata URI currently points to image - consider uploading full metadata to IPFS/Arweave");
    
  } catch (error) {
    console.error("❌ Error creating metadata account:", error);
    if (error.message) {
      console.error("Details:", error.message);
    }
    process.exit(1);
  }
}

createMetadataAccount();
