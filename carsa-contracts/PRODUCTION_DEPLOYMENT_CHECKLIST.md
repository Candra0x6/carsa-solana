# Production Deployment Checklist

Use this checklist when deploying the automated yield recording service to production.

## Pre-Deployment

### 1. Testing Phase
- [ ] Tested service on devnet successfully
- [ ] Verified yield calculations are correct (12% APY)
- [ ] Confirmed transactions execute without errors
- [ ] Checked pool state updates correctly
- [ ] Validated time interval logic (6 hours)
- [ ] Tested error handling and recovery
- [ ] Reviewed all logs for issues

### 2. Configuration
- [ ] Updated `SOLANA_CLUSTER` to `mainnet-beta`
- [ ] Set production RPC URL (preferably paid tier)
- [ ] Configured `APY_BASIS_POINTS` (default: 1200 = 12%)
- [ ] Set `YIELD_INTERVAL_HOURS` (default: 6)
- [ ] Verified all environment variables
- [ ] Removed any devnet-specific settings

### 3. Security
- [ ] Delegate keypair stored in secure location
- [ ] Keypair file permissions set to 600 (`chmod 600`)
- [ ] Keypair NOT committed to git
- [ ] Backup of keypair stored safely offline
- [ ] `DELEGATE_PRIVATE_KEY` env var set (if using)
- [ ] `ADMIN_API_KEY` set for API authentication (optional)
- [ ] Service runs as non-root user
- [ ] Firewall configured (allow only HTTPS out)

### 4. Infrastructure
- [ ] Server provisioned (Linux recommended)
- [ ] Node.js installed (v16+)
- [ ] npm/npx available
- [ ] TypeScript dependencies installed
- [ ] Sufficient disk space for logs
- [ ] Network connectivity to Solana mainnet verified

## Deployment

### Choose Deployment Method

#### Option A: Systemd Service (Recommended)
- [ ] Edited `yield-recorder.service` with correct paths
- [ ] Updated `User` to actual username
- [ ] Set correct `WorkingDirectory`
- [ ] Configured all environment variables
- [ ] Copied service file to `/etc/systemd/system/`
- [ ] Ran `sudo systemctl daemon-reload`
- [ ] Enabled service: `sudo systemctl enable yield-recorder`
- [ ] Started service: `sudo systemctl start yield-recorder`
- [ ] Verified status: `sudo systemctl status yield-recorder`
- [ ] Checked logs: `sudo journalctl -u yield-recorder -n 50`

#### Option B: Cron Job
- [ ] Edited `run-yield-cron.sh` with correct paths
- [ ] Made script executable: `chmod +x run-yield-cron.sh`
- [ ] Tested script manually: `./run-yield-cron.sh`
- [ ] Added to crontab: `crontab -e`
- [ ] Verified cron entry syntax
- [ ] Checked log file location is writable
- [ ] Confirmed cron service is running

#### Option C: PM2
- [ ] Installed PM2: `npm install -g pm2`
- [ ] Started service: `pm2 start record-yield-service.ts`
- [ ] Saved process list: `pm2 save`
- [ ] Set up startup script: `pm2 startup`
- [ ] Verified service status: `pm2 status`
- [ ] Checked logs: `pm2 logs yield-recorder`

#### Option D: Docker
- [ ] Built Docker image
- [ ] Configured environment variables
- [ ] Started container with restart policy
- [ ] Verified container is running
- [ ] Checked container logs

## Post-Deployment

### 1. Verification
- [ ] Service is running (check via appropriate method)
- [ ] No errors in logs
- [ ] Pool state accessible via API: `/api/record-yield`
- [ ] First yield recording executed successfully
- [ ] Transaction visible on Solana Explorer
- [ ] On-chain state updated correctly

### 2. Monitoring Setup
- [ ] Log monitoring configured
- [ ] Alert system set up (email/webhook/SMS)
- [ ] Health check endpoint tested
- [ ] Dashboard access verified (YieldAdminPanel)
- [ ] Scheduled log rotation (if needed)
- [ ] Disk space monitoring enabled

### 3. Operations
- [ ] SOL balance in delegate account checked (≥0.1 SOL recommended)
- [ ] Auto-refill system for delegate SOL (optional)
- [ ] On-call rotation documented
- [ ] Escalation procedures defined
- [ ] Runbook created for common issues

### 4. Documentation
- [ ] Service deployment documented
- [ ] Configuration values recorded
- [ ] Access credentials stored securely
- [ ] Team members trained on operations
- [ ] Emergency procedures documented
- [ ] Contact information updated

## Ongoing Maintenance

### Daily
- [ ] Check service is running
- [ ] Review logs for errors
- [ ] Verify yield recordings happened
- [ ] Check delegate SOL balance

### Weekly
- [ ] Analyze yield amounts vs expected
- [ ] Review transaction costs
- [ ] Check disk space usage
- [ ] Update dependencies if needed

### Monthly
- [ ] Audit security configuration
- [ ] Review and rotate logs
- [ ] Test backup/recovery procedures
- [ ] Update documentation
- [ ] Review and optimize costs

## Rollback Plan

If issues occur:

1. **Stop Service**
   ```bash
   # Systemd
   sudo systemctl stop yield-recorder
   
   # Cron
   crontab -e  # Comment out the line
   
   # PM2
   pm2 stop yield-recorder
   ```

2. **Investigate**
   - Check logs for error messages
   - Verify configuration
   - Test on devnet

3. **Fix Issues**
   - Update configuration
   - Fix code if needed
   - Test thoroughly

4. **Restart**
   - Follow deployment steps again
   - Monitor closely

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| Primary On-Call | ___________ | ___________ |
| Secondary On-Call | ___________ | ___________ |
| DevOps Lead | ___________ | ___________ |
| CTO | ___________ | ___________ |

## Important URLs

- **Solana Explorer:** https://explorer.solana.com/
- **RPC Status:** ___________ (your RPC provider)
- **Admin Dashboard:** https://your-domain.com/admin/yield
- **Monitoring Dashboard:** ___________ (if applicable)
- **Documentation:** https://github.com/your-repo/carsa

## Critical Information

### Delegate Account
- **Public Key:** ___________
- **Keypair Location:** ___________
- **Backup Location:** ___________

### Program Information
- **Program ID:** `FicaEwstRkE9pwHZPWS34XAjnbH6vc8aZ2Ly4EiksmxY`
- **Pool State PDA:** `CY4nSbSnFWSn3kvksa9G4wzWgS6jd3tfMQLWyti7uibz`
- **Mint:** `5hnUzmpcavbtWJ2LmL9NMefm58gvBRqWsyUtpQd3QHC9`

### Configuration
- **APY:** ___________% (default: 12%)
- **Interval:** ___________ hours (default: 6)
- **Network:** mainnet-beta
- **RPC:** ___________

## Known Issues & Workarounds

_Document any known issues here_

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Developer | ___________ | ___________ | ___________ |
| DevOps | ___________ | ___________ | ___________ |
| Security | ___________ | ___________ | ___________ |
| Manager | ___________ | ___________ | ___________ |

---

**Deployment Date:** ___________  
**Version:** 1.0.0  
**Status:** ___________

## Notes

_Add any additional notes here_
