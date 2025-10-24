#!/bin/bash
#
# Yield Recording Service Monitoring Script
#
# This script checks the health of the yield recording service
# and can be used with monitoring tools like Nagios, Zabbix, etc.
#
# Exit codes:
#   0 - OK
#   1 - Warning
#   2 - Critical
#
# Usage:
#   ./monitor-yield-service.sh [OPTIONS]
#
# Options:
#   --service-check    Check if service is running
#   --yield-check      Check if yield is being recorded
#   --balance-check    Check delegate SOL balance
#   --all              Run all checks (default)

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/yield-recorder.log"
SERVICE_NAME="yield-recorder"
MIN_SOL_BALANCE=0.05  # Alert if below this
WARN_SOL_BALANCE=0.02 # Critical if below this
MAX_HOURS_WITHOUT_YIELD=7  # Alert if no yield in X hours

# Exit codes
OK=0
WARNING=1
CRITICAL=2

# Counters
WARNINGS=0
CRITICALS=0

# Functions
log_ok() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    ((WARNINGS++))
}

log_critical() {
    echo -e "${RED}[CRITICAL]${NC} $1"
    ((CRITICALS++))
}

check_service() {
    echo "Checking service status..."
    
    # Check if systemd service exists and is active
    if systemctl list-units --full -all | grep -q "$SERVICE_NAME.service"; then
        if systemctl is-active --quiet "$SERVICE_NAME"; then
            log_ok "Service $SERVICE_NAME is running"
        else
            log_critical "Service $SERVICE_NAME is not running"
            
            # Get last error from logs
            LAST_ERROR=$(journalctl -u "$SERVICE_NAME" -n 10 --no-pager | grep -i "error" | tail -1)
            if [ -n "$LAST_ERROR" ]; then
                echo "  Last error: $LAST_ERROR"
            fi
        fi
    else
        # Check if PM2 process exists
        if command -v pm2 &> /dev/null; then
            if pm2 list | grep -q "$SERVICE_NAME.*online"; then
                log_ok "PM2 process $SERVICE_NAME is running"
            else
                log_critical "Service $SERVICE_NAME not found (systemd or pm2)"
            fi
        else
            log_critical "Service $SERVICE_NAME not found"
        fi
    fi
}

check_yield_recording() {
    echo "Checking yield recording activity..."
    
    if [ ! -f "$LOG_FILE" ]; then
        log_warning "Log file not found: $LOG_FILE"
        return
    fi
    
    # Check for recent successful yield recordings
    LAST_SUCCESS=$(grep -i "yield recorded successfully" "$LOG_FILE" 2>/dev/null | tail -1)
    
    if [ -z "$LAST_SUCCESS" ]; then
        log_warning "No successful yield recordings found in logs"
        return
    fi
    
    # Extract timestamp from last success (this is simplified, adjust based on your log format)
    LAST_SUCCESS_TIME=$(echo "$LAST_SUCCESS" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}.*[0-9]{2}:[0-9]{2}:[0-9]{2}' || echo "")
    
    if [ -n "$LAST_SUCCESS_TIME" ]; then
        log_ok "Last successful yield recording: $LAST_SUCCESS_TIME"
        
        # Check if it's been too long
        if command -v date &> /dev/null; then
            LAST_TIMESTAMP=$(date -d "$LAST_SUCCESS_TIME" +%s 2>/dev/null || echo "0")
            CURRENT_TIMESTAMP=$(date +%s)
            HOURS_AGO=$(( ($CURRENT_TIMESTAMP - $LAST_TIMESTAMP) / 3600 ))
            
            if [ $LAST_TIMESTAMP -gt 0 ]; then
                if [ $HOURS_AGO -gt $MAX_HOURS_WITHOUT_YIELD ]; then
                    log_critical "Last yield recording was $HOURS_AGO hours ago (threshold: $MAX_HOURS_WITHOUT_YIELD hours)"
                else
                    log_ok "Last recording was $HOURS_AGO hours ago"
                fi
            fi
        fi
    fi
    
    # Check for recent errors
    RECENT_ERRORS=$(grep -i "error\|failed" "$LOG_FILE" 2>/dev/null | tail -5 | wc -l)
    if [ $RECENT_ERRORS -gt 3 ]; then
        log_warning "Multiple errors found in recent logs ($RECENT_ERRORS errors)"
        grep -i "error\|failed" "$LOG_FILE" | tail -3 | while read line; do
            echo "  $line"
        done
    fi
}

check_delegate_balance() {
    echo "Checking delegate SOL balance..."
    
    # Load delegate keypair path
    DELEGATE_KEYPAIR="${DELEGATE_KEYPAIR_PATH:-$SCRIPT_DIR/../delegate-keypair.json}"
    
    if [ ! -f "$DELEGATE_KEYPAIR" ]; then
        log_warning "Delegate keypair not found: $DELEGATE_KEYPAIR"
        return
    fi
    
    # Check if solana CLI is installed
    if ! command -v solana &> /dev/null; then
        log_warning "Solana CLI not installed, skipping balance check"
        return
    fi
    
    # Get delegate public key
    DELEGATE_PUBKEY=$(solana-keygen pubkey "$DELEGATE_KEYPAIR" 2>/dev/null || echo "")
    
    if [ -z "$DELEGATE_PUBKEY" ]; then
        log_warning "Could not read delegate public key"
        return
    fi
    
    # Get balance
    CLUSTER="${SOLANA_CLUSTER:-devnet}"
    BALANCE=$(solana balance "$DELEGATE_PUBKEY" --url "$CLUSTER" 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' || echo "0")
    
    if [ -z "$BALANCE" ] || [ "$BALANCE" = "0" ]; then
        log_critical "Could not fetch delegate balance or balance is 0"
        return
    fi
    
    # Compare balance with thresholds
    if (( $(echo "$BALANCE < $WARN_SOL_BALANCE" | bc -l) )); then
        log_critical "Delegate balance critically low: $BALANCE SOL (threshold: $WARN_SOL_BALANCE SOL)"
    elif (( $(echo "$BALANCE < $MIN_SOL_BALANCE" | bc -l) )); then
        log_warning "Delegate balance low: $BALANCE SOL (threshold: $MIN_SOL_BALANCE SOL)"
    else
        log_ok "Delegate balance: $BALANCE SOL"
    fi
}

check_rpc_connection() {
    echo "Checking RPC connection..."
    
    CLUSTER="${SOLANA_CLUSTER:-devnet}"
    RPC_URL="${RPC_URL:-https://api.$CLUSTER.solana.com}"
    
    # Test RPC with getHealth
    HEALTH=$(curl -s -X POST "$RPC_URL" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' 2>/dev/null || echo "")
    
    if echo "$HEALTH" | grep -q "ok"; then
        log_ok "RPC connection healthy: $RPC_URL"
    else
        log_critical "RPC connection failed: $RPC_URL"
    fi
}

check_disk_space() {
    echo "Checking disk space..."
    
    # Get disk usage of current partition
    DISK_USAGE=$(df "$SCRIPT_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ $DISK_USAGE -gt 90 ]; then
        log_critical "Disk usage critical: ${DISK_USAGE}%"
    elif [ $DISK_USAGE -gt 80 ]; then
        log_warning "Disk usage high: ${DISK_USAGE}%"
    else
        log_ok "Disk usage: ${DISK_USAGE}%"
    fi
    
    # Check log file size
    if [ -f "$LOG_FILE" ]; then
        LOG_SIZE=$(du -h "$LOG_FILE" | cut -f1)
        log_ok "Log file size: $LOG_SIZE"
    fi
}

# Parse arguments
CHECK_SERVICE=false
CHECK_YIELD=false
CHECK_BALANCE=false
CHECK_RPC=false
CHECK_DISK=false
RUN_ALL=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --service-check)
            CHECK_SERVICE=true
            RUN_ALL=false
            shift
            ;;
        --yield-check)
            CHECK_YIELD=true
            RUN_ALL=false
            shift
            ;;
        --balance-check)
            CHECK_BALANCE=true
            RUN_ALL=false
            shift
            ;;
        --rpc-check)
            CHECK_RPC=true
            RUN_ALL=false
            shift
            ;;
        --disk-check)
            CHECK_DISK=true
            RUN_ALL=false
            shift
            ;;
        --all)
            RUN_ALL=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --service-check    Check if service is running"
            echo "  --yield-check      Check if yield is being recorded"
            echo "  --balance-check    Check delegate SOL balance"
            echo "  --rpc-check        Check RPC connection"
            echo "  --disk-check       Check disk space"
            echo "  --all              Run all checks (default)"
            echo "  --help             Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Main execution
echo "================================================"
echo "Yield Recording Service Health Check"
echo "Time: $(date)"
echo "================================================"
echo ""

if [ "$RUN_ALL" = true ] || [ "$CHECK_SERVICE" = true ]; then
    check_service
    echo ""
fi

if [ "$RUN_ALL" = true ] || [ "$CHECK_YIELD" = true ]; then
    check_yield_recording
    echo ""
fi

if [ "$RUN_ALL" = true ] || [ "$CHECK_BALANCE" = true ]; then
    check_delegate_balance
    echo ""
fi

if [ "$RUN_ALL" = true ] || [ "$CHECK_RPC" = true ]; then
    check_rpc_connection
    echo ""
fi

if [ "$RUN_ALL" = true ] || [ "$CHECK_DISK" = true ]; then
    check_disk_space
    echo ""
fi

# Summary
echo "================================================"
echo "Summary:"
echo "  Warnings: $WARNINGS"
echo "  Critical: $CRITICALS"
echo "================================================"

# Determine exit code
if [ $CRITICALS -gt 0 ]; then
    echo -e "${RED}Status: CRITICAL${NC}"
    exit $CRITICAL
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}Status: WARNING${NC}"
    exit $WARNING
else
    echo -e "${GREEN}Status: OK${NC}"
    exit $OK
fi
