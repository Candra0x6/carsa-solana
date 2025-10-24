# Automated Yield Recording - Quick Start

## What This Does

Automatically calculates and records yield for your staking pool based on:
- **APY**: 12% by default (configurable)
- **Interval**: Every 6 hours (configurable)
- **Formula**: `yield = (staked_amount × APY × time_elapsed) / (seconds_per_year × 10000)`

## Quick Test (Devnet)

```bash
# 1. Navigate to contracts directory
cd carsa-contracts

# 2. Run test
./test-yield-service.sh
```

This will:
- ✅ Check if pool has staked tokens
- ✅ Check if enough time has elapsed
- ✅ Calculate and record yield (or skip if not needed)
- ✅ Show transaction on Solana Explorer

## Production Deployment

### Option 1: Systemd Service (Recommended)

**Best for:** Linux servers running 24/7

```bash
# 1. Edit service file with your paths
nano yield-recorder.service

# Update these lines:
# - User=ubuntu  (change to your username)
# - WorkingDirectory=/path/to/carsa-contracts
# - DELEGATE_KEYPAIR_PATH=/path/to/delegate-keypair.json

# 2. Install service
sudo cp yield-recorder.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable yield-recorder
sudo systemctl start yield-recorder

# 3. Check status
sudo systemctl status yield-recorder

# 4. View logs
sudo journalctl -u yield-recorder -f
```

### Option 2: Cron Job

**Best for:** Simple setups, shared hosting

```bash
# 1. Edit cron script with your paths
nano run-yield-cron.sh

# Update:
# - SCRIPT_DIR path
# - DELEGATE_KEYPAIR_PATH

# 2. Add to crontab
crontab -e

# Add this line (runs every 6 hours):
0 */6 * * * /full/path/to/carsa-contracts/run-yield-cron.sh

# 3. View logs
tail -f carsa-contracts/yield-recorder.log
```

### Option 3: PM2 Process Manager

**Best for:** Node.js environments

```bash
# Install PM2
npm install -g pm2

# Start service
pm2 start record-yield-service.ts --name yield-recorder

# Save & setup auto-start
pm2 save
pm2 startup

# Monitor
pm2 logs yield-recorder
```

## Configuration

### Environment Variables

Create `.env` file or set in your service:

```bash
# Network
SOLANA_CLUSTER=mainnet-beta
RPC_URL=https://api.mainnet-beta.solana.com

# Yield Settings
YIELD_INTERVAL_HOURS=6        # How often to record yield
APY_BASIS_POINTS=1200         # 1200 = 12% APY

# Security
DELEGATE_KEYPAIR_PATH=/secure/delegate-keypair.json
# OR
DELEGATE_PRIVATE_KEY=[1,2,3,...]  # JSON array
```

### APY Examples

| APY | Basis Points | Config Value |
|-----|--------------|--------------|
| 8%  | 800          | `APY_BASIS_POINTS=800` |
| 10% | 1000         | `APY_BASIS_POINTS=1000` |
| 12% | 1200         | `APY_BASIS_POINTS=1200` |
| 15% | 1500         | `APY_BASIS_POINTS=1500` |

### Interval Examples

| Interval | Config Value | Executions/Day |
|----------|-------------|----------------|
| 1 hour   | `YIELD_INTERVAL_HOURS=1` | 24 |
| 6 hours  | `YIELD_INTERVAL_HOURS=6` | 4 |
| 12 hours | `YIELD_INTERVAL_HOURS=12` | 2 |
| 24 hours | `YIELD_INTERVAL_HOURS=24` | 1 |

## How It Works

```
Every hour, the service:

1. Checks pool state
   ├─ What's staked?
   ├─ When was last update?
   └─ Has 6+ hours elapsed?

2. If YES:
   ├─ Calculate yield based on APY
   ├─ Send record_yield transaction
   └─ Update last_yield_update timestamp

3. If NO:
   └─ Skip (log remaining time)
```

## Monitoring

### Check Service Status

**Systemd:**
```bash
sudo systemctl status yield-recorder
```

**Cron:**
```bash
tail -n 50 carsa-contracts/yield-recorder.log
```

**PM2:**
```bash
pm2 status
pm2 logs yield-recorder
```

### Manual Execution

Run once manually:
```bash
npx ts-node record-yield-service.ts once
```

### View On-Chain State

```bash
# Get pool state
solana account CY4nSbSnFWSn3kvksa9G4wzWgS6jd3tfMQLWyti7uibz

# Check transactions
solana transaction <SIGNATURE>
```

## Troubleshooting

### "No yield to record"

✅ **Normal!** Means:
- Not enough time elapsed since last update
- Nothing is staked yet
- Service is working correctly

### "Transaction failed"

Check:
1. **Delegate has SOL for fees**
   ```bash
   solana balance <DELEGATE_PUBKEY>
   ```
   
2. **Keypair is correct**
   ```bash
   solana-keygen pubkey delegate-keypair.json
   ```

3. **RPC connection works**
   ```bash
   curl -X POST $RPC_URL -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
   ```

### "Service won't start"

**Systemd:**
```bash
# View detailed logs
sudo journalctl -u yield-recorder -n 100 --no-pager

# Check file permissions
ls -la /path/to/delegate-keypair.json
```

**Cron:**
```bash
# Check cron is running
sudo systemctl status cron

# Test script manually
./run-yield-cron.sh
```

## Security Checklist

- [ ] Delegate keypair stored securely (not in git)
- [ ] File permissions: `chmod 600 delegate-keypair.json`
- [ ] Environment variables not hardcoded in scripts
- [ ] Service runs as non-root user
- [ ] Firewall allows only necessary ports
- [ ] Backup of delegate keypair stored safely
- [ ] Monitoring/alerts configured

## Cost Estimation

**Transaction Costs:**
- Each yield recording: ~0.000005 SOL
- 4 times/day (6 hour interval): 0.00002 SOL/day
- Monthly: ~0.0006 SOL (~$0.05 at $100/SOL)

**Recommended Balance:**
Keep **0.1 SOL** in delegate account for:
- Transaction fees
- Network congestion buffer
- Emergency operations

## Production Checklist

Before going live:

- [ ] Tested on devnet successfully
- [ ] Changed to mainnet-beta cluster
- [ ] Updated RPC to production endpoint
- [ ] Set correct APY and interval
- [ ] Verified delegate keypair security
- [ ] Service installed and running
- [ ] Logs accessible and monitored
- [ ] Team knows how to restart service
- [ ] Emergency contacts documented

## Example Output

**Successful Yield Recording:**
```
📊 Checking if yield recording is needed...
Time: 2025-10-24T10:30:00.000Z

Pool State:
  Total Staked: 10000 LOKAL
  Last Yield Update: 10/24/2025, 4:30:00 AM
  Time Elapsed: 6.00 hours
  Total Yield Earned: 150.5 LOKAL

💰 Recording Yield:
  Yield Amount: 8.22 LOKAL
  APY: 12 %
  Period: 6.00 hours

🚀 Executing record_yield instruction...
✅ Yield recorded successfully!
Transaction: 5KxX...AbCd
Explorer: https://explorer.solana.com/tx/5KxX...AbCd?cluster=mainnet-beta
```

**Skipped (Not Enough Time):**
```
📊 Checking if yield recording is needed...
Time: 2025-10-24T09:00:00.000Z

Pool State:
  Total Staked: 10000 LOKAL
  Last Yield Update: 10/24/2025, 4:30:00 AM
  Time Elapsed: 4.50 hours

⏳ Not enough time elapsed. Wait 1.50 more hours.
```

## Support

- **Documentation:** See `YIELD_SERVICE_PRODUCTION_GUIDE.md` for detailed info
- **Test First:** Always test on devnet before production
- **Logs:** Check logs for detailed execution info
- **Community:** Ask in your team's Slack/Discord

## Files Reference

- `record-yield-service.ts` - Main service code
- `yield-recorder.service` - Systemd service file
- `run-yield-cron.sh` - Cron job script
- `test-yield-service.sh` - Test script
- `YIELD_SERVICE_PRODUCTION_GUIDE.md` - Full documentation

---

**Ready to deploy?** Start with `./test-yield-service.sh` to verify everything works!
