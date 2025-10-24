#!/bin/bash
#
# Test Yield Recording Service
# Run this to verify the service is working correctly

echo "🧪 Testing Yield Recording Service"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to script directory
cd "$(dirname "$0")"

# Check if delegate keypair exists
if [ ! -f "../delegate-keypair.json" ]; then
    echo -e "${RED}❌ Delegate keypair not found at ../delegate-keypair.json${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Delegate keypair found${NC}"

# Check if dependencies are installed
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx not found. Install Node.js first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js installed${NC}"

# Check if TypeScript is available
if ! npx ts-node --version &> /dev/null; then
    echo -e "${YELLOW}⚠️  Installing ts-node...${NC}"
    npm install -D typescript ts-node @types/node
fi

echo -e "${GREEN}✅ TypeScript environment ready${NC}"
echo ""

# Set to devnet for testing
export SOLANA_CLUSTER=devnet
export RPC_URL=https://api.devnet.solana.com
export YIELD_INTERVAL_HOURS=6
export APY_BASIS_POINTS=1200

echo "Configuration:"
echo "  Cluster: $SOLANA_CLUSTER"
echo "  RPC: $RPC_URL"
echo "  Interval: $YIELD_INTERVAL_HOURS hours"
echo "  APY: $((APY_BASIS_POINTS / 100))%"
echo ""

# Run service once
echo -e "${YELLOW}Running yield recording service (once mode)...${NC}"
echo ""

npx ts-node record-yield-service.ts once

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Test completed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review the output above"
    echo "  2. Check if yield was recorded or skipped (expected)"
    echo "  3. For production, update environment variables in:"
    echo "     - yield-recorder.service (for systemd)"
    echo "     - run-yield-cron.sh (for cron)"
    echo "  4. Deploy using one of the methods in YIELD_SERVICE_PRODUCTION_GUIDE.md"
else
    echo -e "${RED}❌ Test failed with exit code $EXIT_CODE${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check if pool is initialized"
    echo "  2. Verify delegate keypair is correct"
    echo "  3. Ensure RPC connection is working"
    echo "  4. Review error messages above"
fi

exit $EXIT_CODE
