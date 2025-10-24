# Automatic Deposit - Setup Guide

## 🎯 Overview

Now you **DON'T need** to run `ts-node backend-deposit-monitor.ts`!

The deposit happens **automatically** when users approve - via a Next.js API route.

## ⚙️ Setup (One Time)

### 1. Add Environment Variables

Create/update `.env.local` in `/carsa-frontend`:

```bash
# Solana RPC
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Pool Delegate Private Key (keep this secret!)
DELEGATE_PRIVATE_KEY='[YOUR_DELEGATE_KEYPAIR_ARRAY]'

# Optional: Carsa IDL (copy from carsa-contracts/target/idl/carsa.json)
CARSA_IDL='{"version":"0.1.0",...}'
```

### 2. Get Your Delegate Private Key

From `/carsa-contracts/delegate-keypair.json`:

```bash
cd carsa-contracts
cat ../delegate-keypair.json
```

Copy the entire array and paste it as `DELEGATE_PRIVATE_KEY` in `.env.local`.

Example:
```bash
DELEGATE_PRIVATE_KEY='[123,45,67,89,...]'
```

### 3. Copy the IDL (Optional but Recommended)

```bash
cd carsa-frontend
cp ../carsa-contracts/target/idl/carsa.json public/carsa-idl.json
```

Then update the API route to load it:
```typescript
// In src/app/api/deposit/route.ts
const idlPath = path.join(process.cwd(), 'public', 'carsa-idl.json');
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
```

## 🚀 How It Works Now

### User Flow (Fully Automatic):

```
1. User clicks "Approve" button
   ↓
2. Wallet signs approval transaction
   ↓
3. Frontend waits for confirmation
   ↓
4. Frontend immediately calls /api/deposit
   ↓
5. API verifies approval and deposits tokens
   ↓
6. User sees success message with both signatures
   ↓
7. Tokens are staked! ✅
```

### No Background Service Needed!

- ✅ No need to run `backend-deposit-monitor.ts`
- ✅ No polling or monitoring
- ✅ Instant deposits after approval
- ✅ All serverless (works on Vercel, Netlify, etc.)

## 📝 Alternative Options

### Option 1: Frontend API (Current - Recommended)

**Pros:**
- ✅ No background service needed
- ✅ Instant deposits
- ✅ Works on any serverless platform
- ✅ Easy to deploy

**Cons:**
- ⚠️ Private key in server environment variables
- ⚠️ API must be secure (rate limiting, auth)

### Option 2: Webhook-Based (Production)

Use Helius or QuickNode webhooks:

1. **Setup Webhook:**
```bash
# Helius API
curl -X POST "https://api.helius.xyz/v0/webhooks?api-key=YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhookURL": "https://your-app.com/api/webhook",
    "transactionTypes": ["APPROVE"],
    "accountAddresses": ["5hnUzmpcavbtWJ2LmL9NMefm58gvBRqWsyUtpQd3QHC9"],
    "webhookType": "enhanced"
  }'
```

2. **Use `webhook-deposit-handler.ts`** as your webhook endpoint

**Pros:**
- ✅ No frontend API needed
- ✅ Backend fully decoupled
- ✅ More secure
- ✅ Better for high volume

**Cons:**
- ⚠️ Requires webhook service (Helius/QuickNode)
- ⚠️ Small delay (webhook processing)

### Option 3: Scheduled Job (Cron)

Run deposit monitor on a schedule:

```yaml
# GitHub Actions (.github/workflows/deposit-monitor.yml)
name: Auto Deposit Monitor
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
        working-directory: carsa-contracts
      - run: npx ts-node backend-deposit-monitor.ts
        working-directory: carsa-contracts
        env:
          DELEGATE_KEYPAIR_PATH: ${{ secrets.DELEGATE_KEYPAIR }}
```

**Pros:**
- ✅ No server needed
- ✅ Free (GitHub Actions)
- ✅ Reliable

**Cons:**
- ⚠️ Delay up to 5 minutes
- ⚠️ Not instant

## 🔒 Security Considerations

### Keep Private Keys Safe:

1. **Never commit private keys to git**
   ```bash
   # Add to .gitignore
   echo ".env.local" >> .gitignore
   echo "delegate-keypair.json" >> .gitignore
   ```

2. **Use environment variables** (not hardcoded)

3. **Rotate keys** if compromised

4. **Use separate delegate key** (not your main wallet)

### API Security:

Add rate limiting and authentication:

```typescript
// src/app/api/deposit/route.ts
export async function POST(request: NextRequest) {
  // 1. Check API key or JWT
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limiting
  const ip = request.headers.get('x-forwarded-for');
  // ... implement rate limiting ...

  // 3. Verify signature (optional)
  const { userPubkey, signature } = await request.json();
  // ... verify user signed something ...
}
```

## 🧪 Testing

### Test the API Route:

```bash
cd carsa-frontend
npm run dev
```

Then in another terminal:
```bash
curl -X POST http://localhost:3000/api/deposit \
  -H "Content-Type: application/json" \
  -d '{"userPubkey":"YOUR_USER_PUBKEY"}'
```

### Test Frontend Flow:

1. Go to `/test` page
2. Connect wallet
3. Approve tokens
4. Check console logs for API call
5. Verify deposit on Solana Explorer

## 📊 Monitoring

Check deposit success:
```bash
# View recent delegate transactions
solana transaction-history Hwx6w6vxboAoME2ARayb661yyeT5JShKwxH3Xa489CSR --limit 10
```

## 🎯 Deployment

### Vercel (Recommended):

```bash
cd carsa-frontend

# Add environment variables in Vercel dashboard
# Settings > Environment Variables:
# - NEXT_PUBLIC_SOLANA_RPC_URL
# - DELEGATE_PRIVATE_KEY
# - CARSA_IDL (optional)

vercel deploy
```

### Other Platforms:

Same setup works on:
- Netlify
- AWS Amplify
- Railway
- Render

Just add the environment variables in their dashboard.

## ❓ FAQ

**Q: Do I still need to run the monitor script?**
A: No! The frontend API handles it automatically.

**Q: What if the API fails?**
A: The approval is still valid. You can manually deposit or run the monitor script once.

**Q: Can I use both methods?**
A: Yes! The API can handle instant deposits, and the monitor can catch any missed ones.

**Q: Is it safe to put the private key in environment variables?**
A: Yes, as long as:
   - It's not committed to git
   - It's only the delegate key (not your main wallet)
   - Your server is secure
   - You use a separate key per environment

**Q: How much SOL does the delegate need?**
A: About 0.01 SOL per deposit transaction. Keep 1-2 SOL for safety.

---

**Status**: ✅ Fully Automatic!
**No manual scripts needed!** 🎉
