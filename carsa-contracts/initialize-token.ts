import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Carsa } from "./target/types/carsa";
import { 
  Keypair, 
  PublicKey, 
  SystemProgram, 
  SYSVAR_RENT_PUBKEY,
  Connection 
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import fs from "fs";
import os from "os";

async function initializeLokalToken() {
  try {
    // Setup provider - try to use existing provider first, fallback to devnet
    let provider;
    let network;
    
    try {
      // Try to get the existing provider configuration
      provider = anchor.AnchorProvider.env();
      network = provider.connection.rpcEndpoint;
      console.log("🔗 Using existing Anchor provider configuration");
    } catch (e) {
      // Fallback: create provider manually for devnet
      network = process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com";
      const connection = new Connection(network, "confirmed");
      
      // Create a wallet from the default Solana CLI keypair
      const keypairPath = process.env.ANCHOR_WALLET || `${os.homedir()}/.config/solana/id.json`;
      
      if (!fs.existsSync(keypairPath)) {
        throw new Error(`Wallet keypair not found at ${keypairPath}. Please run 'solana-keygen new' first.`);
      }
      
      const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
      const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
      const wallet = new anchor.Wallet(keypair);
      
      provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
      console.log("🔗 Created new provider for:", network);
    }
    
    anchor.setProvider(provider);
    const program = anchor.workspace.Carsa as Program<Carsa>;
    
    console.log("🔗 Connected to:", network);
    console.log("👤 Wallet:", provider.wallet.publicKey.toBase58());
    
    // Check wallet balance before proceeding
    const balance = await provider.connection.getBalance(provider.wallet.publicKey);
    console.log("💰 Wallet Balance:", (balance / 1_000_000_000).toFixed(4), "SOL");
    
    if (balance < 100_000_000) { // Less than 0.1 SOL
      console.error("❌ Insufficient SOL balance for transaction");
      console.error("💡 Get devnet SOL from:");
      console.error("   • https://faucet.solana.com/");
      console.error("   • https://solfaucet.com/");
      console.error("   • solana airdrop 2 (when not rate limited)");
      process.exit(1);
    }
  
  // Load mint keypair
  const mintKeypairData = JSON.parse(fs.readFileSync("lokal-mint-keypair.json", "utf8"));
  const mintKeypair = Keypair.fromSecretKey(new Uint8Array(mintKeypairData));
  
  // Get update authority (wallet)
  const updateAuthority = provider.wallet.publicKey;
  
  // Calculate PDAs
  const [mintAuthorityPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint_authority")],
    program.programId
  );
  
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );
  
  try {
    // Check if already initialized
    try {
      await program.account.lokalMintConfig.fetch(configPda);
      console.log("✅ Lokal token mint already initialized");
      console.log("🪙 Mint Address:", mintKeypair.publicKey.toBase58());
      console.log("⚙️ Config PDA:", configPda.toBase58());
      
      // Still save addresses file for existing setup
      const addresses = {
        mintAddress: mintKeypair.publicKey.toBase58(),
        configPda: configPda.toBase58(),
        mintAuthorityPda: mintAuthorityPda.toBase58(),
        programId: program.programId.toBase58(),
        updateAuthority: updateAuthority.toBase58()
      };
      
      fs.writeFileSync("lokal-token-addresses.json", JSON.stringify(addresses, null, 2));
      console.log("💾 Addresses saved to lokal-token-addresses.json");
      return;
    } catch (e) {
      // Not initialized yet, continue
    }
    
    console.log("🔄 Initializing Lokal token mint...");
    
    const tx = await program.methods
      .initializeLokalMint()
      .accounts({
        updateAuthority,
        mint: mintKeypair.publicKey,
        // Let Anchor resolve the PDA accounts automatically
      })
      .signers([mintKeypair])
      .rpc();
      
    console.log("✅ Lokal token initialized successfully!");
    console.log("📝 Transaction:", tx);
    console.log("🪙 Mint Address:", mintKeypair.publicKey.toBase58());
    console.log("⚙️ Config PDA:", configPda.toBase58());
    console.log("🔑 Mint Authority PDA:", mintAuthorityPda.toBase58());
    
    // Save important addresses to a file
    const addresses = {
      mintAddress: mintKeypair.publicKey.toBase58(),
      configPda: configPda.toBase58(),
      mintAuthorityPda: mintAuthorityPda.toBase58(),
      programId: program.programId.toBase58(),
      updateAuthority: updateAuthority.toBase58()
    };
    
    fs.writeFileSync("lokal-token-addresses.json", JSON.stringify(addresses, null, 2));
    console.log("💾 Addresses saved to lokal-token-addresses.json");
    
    } catch (error) {
      console.error("❌ Error initializing token:", error);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error setting up provider:", error);
    process.exit(1);
  }
}

initializeLokalToken();
