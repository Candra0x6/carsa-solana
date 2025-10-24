# Yield Recording Service - Production Deployment Guide

This guide covers deploying the automated yield recording service for production use.

## Overview

The yield recording service automatically calculates and records yield for the staking pool based on:
- Time elapsed since last update
- Total staked amount
- Configured APY rate

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Yield Recording Flow                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Service Checks Pool State                                │
│     ├─ Fetch total_voucher_staked                           │
│     ├─ Fetch last_yield_update timestamp                     │
│     └─ Calculate seconds_elapsed                             │
│                                                               │
│  2. Determine If Update Needed                               │
│     ├─ Check: elapsed >= YIELD_INTERVAL_HOURS                │
│     ├─ Check: total_staked > 0                              │
│     └─ If YES, proceed to step 3                             │
│                                                               │
│  3. Calculate Yield Amount                                   │
│     Formula:                                                  │
│     yield = (staked × APY × elapsed) / (seconds_per_year × 10000) │
│                                                               │
│  4. Execute record_yield Instruction                         │
│     ├─ Call program.methods.recordYield(amount)             │
│     ├─ Signed by pool_delegate                              │
│     └─ Updates pool state with new yield                     │
│                                                               │
│  5. On-Chain Updates                                         │
│     ├─ total_yield_earned += yield_amount                   │
│     ├─ reward_index updated for proportional distribution    │
│     └─ last_yield_update = current_timestamp                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Options

### Option 1: Systemd Service (Recommended for Production)

Best for: 24/7 uptime, automatic restarts, production servers

**Installation:**

```bash
# 1. Update paths in yield-recorder.service
nano yield-recorder.service

# 2. Copy to systemd directory
sudo cp yield-recorder.service /etc/systemd/system/

# 3. Reload systemd
sudo systemctl daemon-reload

# 4. Enable service (start on boot)
sudo systemctl enable yield-recorder

# 5. Start service
sudo systemctl start yield-recorder
```

**Monitoring:**

```bash
# Check status
sudo systemctl status yield-recorder

# View logs (live)
sudo journalctl -u yield-recorder -f

# View recent logs
sudo journalctl -u yield-recorder -n 100

# Restart service
sudo systemctl restart yield-recorder

# Stop service
sudo systemctl stop yield-recorder
```

### Option 2: Cron Job

Best for: Simple setups, shared hosting, scheduled execution

**Installation:**

```bash
# 1. Make script executable
chmod +x run-yield-cron.sh

# 2. Test run
./run-yield-cron.sh

# 3. Add to crontab
crontab -e

# Add one of these lines:

# Run every 6 hours
0 */6 * * * /full/path/to/carsa-contracts/run-yield-cron.sh

# Run daily at 2 AM
0 2 * * * /full/path/to/carsa-contracts/run-yield-cron.sh

# Run every hour (service will skip if not needed)
0 * * * * /full/path/to/carsa-contracts/run-yield-cron.sh
```

**Monitoring:**

```bash
# View log file
tail -f carsa-contracts/yield-recorder.log

# View last 50 lines
tail -n 50 carsa-contracts/yield-recorder.log

# List cron jobs
crontab -l
```

### Option 3: Docker Container

Best for: Cloud deployments, containerized infrastructure

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Build TypeScript (if needed)
RUN npx tsc --build

# Set environment variables
ENV NODE_ENV=production
ENV SOLANA_CLUSTER=mainnet-beta

# Run service
CMD ["npx", "ts-node", "record-yield-service.ts", "continuous"]
```

Run container:

```bash
# Build image
docker build -t yield-recorder .

# Run container
docker run -d \
  --name yield-recorder \
  --restart unless-stopped \
  -e DELEGATE_PRIVATE_KEY='[1,2,3,...]' \
  -e YIELD_INTERVAL_HOURS=6 \
  -e APY_BASIS_POINTS=1200 \
  yield-recorder

# View logs
docker logs -f yield-recorder
```

### Option 4: PM2 Process Manager

Best for: Node.js environments, development servers

```bash
# Install PM2
npm install -g pm2

# Start service
pm2 start record-yield-service.ts --name yield-recorder

# Save process list
pm2 save

# Setup startup script
pm2 startup

# Monitoring
pm2 status
pm2 logs yield-recorder
pm2 monit
```

## Configuration

### Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `SOLANA_CLUSTER` | Solana cluster | `devnet` | `mainnet-beta` |
| `RPC_URL` | Custom RPC endpoint | Cluster default | `https://api.mainnet-beta.solana.com` |
| `DELEGATE_PRIVATE_KEY` | Pool delegate private key (JSON array) | - | `[1,2,3,...]` |
| `DELEGATE_KEYPAIR_PATH` | Path to delegate keypair file | `../delegate-keypair.json` | `/secure/delegate.json` |
| `YIELD_INTERVAL_HOURS` | Hours between yield updates | `6` | `24` |
| `APY_BASIS_POINTS` | Annual yield in basis points | `1200` (12%) | `800` (8%) |

### Security Best Practices

1. **Keypair Storage:**
   ```bash
   # Store keypair in secure location
   sudo mkdir -p /secure
   sudo cp delegate-keypair.json /secure/
   sudo chmod 600 /secure/delegate-keypair.json
   sudo chown your-user:your-user /secure/delegate-keypair.json
   ```

2. **Environment Variables:**
   ```bash
   # Use environment file instead of hardcoding
   sudo nano /etc/environment
   # Add:
   DELEGATE_PRIVATE_KEY=[...]
   ```

3. **Firewall:**
   ```bash
   # Only allow outbound HTTPS (for RPC)
   sudo ufw allow out 443/tcp
   ```

## Monitoring & Alerts

### Health Check Script

Create `health-check.sh`:

```bash
#!/bin/bash

# Check if service is running
if systemctl is-active --quiet yield-recorder; then
    echo "✅ Service is running"
    exit 0
else
    echo "❌ Service is not running"
    # Send alert (email, webhook, etc.)
    curl -X POST https://your-alert-webhook.com \
         -d "Service yield-recorder is down"
    exit 1
fi
```

### Log Monitoring

```bash
# Alert on errors in logs
tail -f /var/log/syslog | grep "yield-recorder" | grep "ERROR"

# Or use logrotate for log management
sudo nano /etc/logrotate.d/yield-recorder
```

### Metrics Collection

Add to service for monitoring:

```typescript
// Send metrics to monitoring service
async recordMetrics(yieldAmount: bigint, txSignature: string) {
  await fetch('https://your-metrics-api.com/metrics', {
    method: 'POST',
    body: JSON.stringify({
      service: 'yield-recorder',
      timestamp: Date.now(),
      yieldAmount: Number(yieldAmount) / 1e9,
      transaction: txSignature,
    }),
  });
}
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
sudo journalctl -u yield-recorder -n 50

# Common issues:
# 1. Wrong keypair path
# 2. Missing dependencies
# 3. RPC connection failed
```

### No Yield Being Recorded

**Check pool state:**
```bash
solana account <POOL_STATE_PDA> --output json
```

**Verify conditions:**
1. Is there anything staked? (`total_voucher_staked > 0`)
2. Has enough time elapsed? (Check `last_yield_update`)
3. Is delegate keypair correct?

### Transaction Failures

```bash
# Check delegate SOL balance (needs SOL for fees)
solana balance <DELEGATE_PUBKEY>

# View transaction logs
solana confirm -v <TX_SIGNATURE>
```

## Testing

### Test on Devnet First

```bash
# Set to devnet
export SOLANA_CLUSTER=devnet
export RPC_URL=https://api.devnet.solana.com

# Run once
npx ts-node record-yield-service.ts once

# Check output
# Should show pool state and either record yield or skip if not needed
```

### Manual Yield Recording

```typescript
// Test single execution
import { YieldRecordingService } from './record-yield-service';

const service = new YieldRecordingService();
await service.runOnce();
```

## Performance Optimization

### Custom RPC for Production

Use dedicated RPC services for better reliability:

```bash
# Helius
export RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# QuickNode
export RPC_URL=https://your-endpoint.quiknode.pro/YOUR_TOKEN/

# Triton
export RPC_URL=https://your-node.rpcpool.com/YOUR_TOKEN
```

### Rate Limiting

```typescript
// Add rate limiting for RPC calls
private async fetchWithRetry(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## Cost Analysis

### Transaction Costs

- Each `record_yield` call costs ~0.000005 SOL (5000 lamports)
- Running every 6 hours = 4 transactions/day
- Monthly cost: ~0.0006 SOL (~$0.05 at $100/SOL)

### Recommended SOL Balance

Keep at least **0.1 SOL** in delegate account for:
- Transaction fees (~0.0006 SOL/month)
- Buffer for network congestion
- Emergency operations

## Upgrading

```bash
# Stop service
sudo systemctl stop yield-recorder

# Update code
git pull origin main
npm install

# Restart service
sudo systemctl start yield-recorder

# Verify
sudo systemctl status yield-recorder
```

## Support & Debugging

Enable debug logging:

```typescript
// Add to service
private debugMode = process.env.DEBUG === 'true';

if (this.debugMode) {
  console.log("Debug info:", {
    poolState,
    calculatedYield,
    accounts,
  });
}
```

Run with debug:

```bash
DEBUG=true npx ts-node record-yield-service.ts once
```

## Appendix: Yield Calculation Formula

```
yield_amount = (total_staked × APY × seconds_elapsed) / (seconds_per_year × 10000)

Where:
- total_staked: Current staked tokens (in lamports)
- APY: Annual percentage yield in basis points (1200 = 12%)
- seconds_elapsed: Time since last yield update
- seconds_per_year: 31,557,600 (365.25 days)
- 10000: Basis points divisor

Example:
- Staked: 1,000,000 LOKAL (1,000,000,000,000,000 lamports)
- APY: 12% (1200 basis points)
- Elapsed: 6 hours (21,600 seconds)
- Yield: (1e15 × 1200 × 21600) / (31557600 × 10000)
      = 82,191,780,821 lamports
      = ~82.19 LOKAL
```

## Production Checklist

- [ ] Tested on devnet thoroughly
- [ ] Delegate keypair secured
- [ ] RPC endpoint configured
- [ ] APY and interval configured
- [ ] Service/cron installed
- [ ] Logs monitoring setup
- [ ] Alerts configured
- [ ] SOL balance topped up
- [ ] Backup delegate keypair stored safely
- [ ] Documentation reviewed
- [ ] Team trained on operations

## Contact

For issues or questions:
- Check logs first
- Review troubleshooting section
- Contact development team
