import bs58 from "bs58";

// Ganti dengan array kamu lengkap dari file id.json
const keypair = Uint8Array.from([
  56,188,158,176,204,231,248,220,149,164,71,204,90,104,9,190,233,196,228,18,
  137,25,247,3,9,126,44,56,232,247,27,255,204,34,217,119,23,77,52,3,44,76,32,
  70,184,194,132,137,24,115,105,242,65,113,240,168,26,202,99,101,6,96,218,68
]);

// Encode seluruh 64-byte keypair
const base58Keypair = bs58.encode(keypair);

console.log("🔑 Import ke Phantom (Solana):");
console.log(base58Keypair);
console.log("Panjang:", base58Keypair.length);
