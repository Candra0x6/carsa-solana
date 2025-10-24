#!/bin/bash
#
# Cron Job Configuration for Yield Recording
# 
# This script can be run as a cron job to record yield periodically.
# The service itself checks if enough time has elapsed before recording.
#
# Installation:
#   1. Make executable: chmod +x run-yield-cron.sh
#   2. Add to crontab: crontab -e
#   3. Add one of the example entries below
#
# Cron Examples:
#   # Run every 6 hours
#   0 */6 * * * /home/ubuntu/carsa/carsa-contracts/run-yield-cron.sh
#
#   # Run daily at 2 AM
#   0 2 * * * /home/ubuntu/carsa/carsa-contracts/run-yield-cron.sh
#
#   # Run every hour (service will skip if not enough time elapsed)
#   0 * * * * /home/ubuntu/carsa/carsa-contracts/run-yield-cron.sh

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/yield-recorder.log"
MAX_LOG_SIZE=10485760  # 10MB

# Change to script directory
cd "$SCRIPT_DIR"

# Rotate log if too large
if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null) -gt $MAX_LOG_SIZE ]; then
    mv "$LOG_FILE" "$LOG_FILE.old"
fi

# Environment (adjust as needed)
export NODE_ENV=production
export SOLANA_CLUSTER=mainnet-beta
export RPC_URL=https://api.mainnet-beta.solana.com
export YIELD_INTERVAL_HOURS=6
export APY_BASIS_POINTS=1200
export DELEGATE_KEYPAIR_PATH="$SCRIPT_DIR/../delegate-keypair.json"

# Log execution
echo "========================================" >> "$LOG_FILE"
echo "Cron execution started: $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Run yield recording (once mode for cron)
npx ts-node record-yield-service.ts once >> "$LOG_FILE" 2>&1

# Capture exit code
EXIT_CODE=$?

echo "Exit code: $EXIT_CODE" >> "$LOG_FILE"
echo "Cron execution finished: $(date)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

exit $EXIT_CODE
