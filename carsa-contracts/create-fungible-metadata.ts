import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, Transaction } from "@solana/web3.js";
import { 
  DataV2, 
  createCreateMetadataAccountV2Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID 
} from "@metaplex-foundation/mpl-token-metadata";
import fs from "fs";
import os from "os";

/**
 * Create metadata account for existing fungible SPL token
 * This script creates the metadata account for an existing fungible SPL token mint
 */
async function createFungibleTokenMetadata() {
  try {
    console.log("🚀 Creating metadata for fungible SPL token...");
    
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
    
    // Load token addresses
    if (!fs.existsSync("lokal-token-addresses.json")) {
      throw new Error("Token addresses not found. Please run initialize-token.ts first.");
    }
    
    const addresses = JSON.parse(fs.readFileSync("lokal-token-addresses.json", "utf8"));
    const mintAddress = new PublicKey(addresses.mintAddress);
    
    console.log("🪙 Mint Address:", mintAddress.toBase58());
    
    // Load metadata
    const metadata = JSON.parse(fs.readFileSync("lokal-token-metadata-complete.json", "utf8"));
    
    // Derive metadata PDA
    const [metadataPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintAddress.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    
    console.log("📄 Metadata PDA:", metadataPda.toBase58());
    
    // Check if metadata account already exists
    try {
      const existingAccount = await connection.getAccountInfo(metadataPda);
      if (existingAccount) {
        console.log("ℹ️ Metadata account already exists!");
        console.log("   You can now use: mplx toolbox token update", mintAddress.toBase58());
        return;
      }
    } catch (error) {
      // Account doesn't exist, which is expected
    }
    
    console.log("📤 Creating metadata account for fungible token...");
    
    // Prepare metadata data for fungible token
    const metadataData: DataV2 = {
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.image || "", // Simple URI for now
      sellerFeeBasisPoints: 0, // No royalties for utility token
      creators: metadata.properties.creators.map(creator => ({
        address: new PublicKey(creator.address),
        verified: false, // We'll verify in separate instruction
        share: creator.share
      })),
      collection: null,
      uses: null,
    };
    
    // Create the metadata account instruction
    const createMetadataInstruction = createCreateMetadataAccountV2Instruction(
      {
        metadata: metadataPda,
        mint: mintAddress,
        mintAuthority: wallet.publicKey,
        payer: wallet.publicKey,
        updateAuthority: wallet.publicKey,
      },
      {
        createMetadataAccountArgsV2: {
          data: metadataData,
          isMutable: true,
        },
      }
    );
    
    // Create and send transaction
    const transaction = new Transaction();
    transaction.add(createMetadataInstruction);
    
    console.log("⏳ Sending transaction...");
    
    const signature = await connection.sendTransaction(transaction, [wallet]);
    
    console.log("⏳ Waiting for confirmation...");
    await connection.confirmTransaction(signature, "confirmed");
    
    console.log("✅ Metadata account created successfully!");
    console.log("🔗 Transaction:", signature);
    console.log("📄 Metadata PDA:", metadataPda.toBase58());
    console.log("🪙 Mint:", mintAddress.toBase58());
    
    // Update addresses file with metadata info
    const updatedAddresses = {
      ...addresses,
      metadataAddress: metadataPda.toBase58(),
      metadataTransaction: signature,
      tokenName: metadata.name,
      tokenSymbol: metadata.symbol,
    };
    
    fs.writeFileSync("lokal-token-addresses.json", JSON.stringify(updatedAddresses, null, 2));
    console.log("💾 Updated addresses file with metadata info");
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ Fungible token metadata creation complete!");
    console.log("=".repeat(60));
    console.log("🚀 Next steps:");
    console.log("  1. Now you can run: ./create-token-metadata.sh");
    console.log("  2. Or use: mplx toolbox token update", mintAddress.toBase58());
    console.log("  3. Consider uploading complete metadata to IPFS/Arweave and updating URI");
    
  } catch (error) {
    console.error("❌ Error creating metadata account:", error);
    if (error.message) {
      console.error("Details:", error.message);
    }
    process.exit(1);
  }
}

createFungibleTokenMetadata();
