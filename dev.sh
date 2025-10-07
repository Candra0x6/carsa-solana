#!/bin/bash

# Development startup script
# Starts both contract testing environment and frontend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${YELLOW}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

PROJECT_ROOT="$(pwd)"
CONTRACTS_DIR="$PROJECT_ROOT/carsa-contracts"
FRONTEND_DIR="$PROJECT_ROOT/carsa-frontend"

# Parse arguments
START_VALIDATOR=false
START_FRONTEND=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --local-validator)
            START_VALIDATOR=true
            shift
            ;;
        --no-frontend)
            START_FRONTEND=false
            shift
            ;;
        --help|-h)
            echo "Development Startup Script"
            echo ""
            echo "Usage: ./dev.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --local-validator    Start local Solana validator"
            echo "  --no-frontend        Don't start frontend dev server"
            echo "  --help, -h          Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./dev.sh                      # Start frontend only (use devnet)"
            echo "  ./dev.sh --local-validator    # Start local validator and frontend"
            echo "  ./dev.sh --no-frontend        # Setup only, no dev server"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🚀 CARSA Development Environment${NC}"
echo ""

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    print_step "Cleaning up..."
    jobs -p | xargs -r kill
    exit 0
}
trap cleanup SIGINT SIGTERM

if [ "$START_VALIDATOR" = true ]; then
    print_step "Starting local Solana validator..."
    cd "$CONTRACTS_DIR"
    
    # Kill any existing validator
    pkill -f "solana-test-validator" || true
    sleep 2
    
    # Start validator in background
    solana-test-validator \
        --bpf-program 4rxv5KW47SDCVEQcgc2dDQxcWDyZ965SCTnA7sqF7gqT target/deploy/carsa.so \
        --reset \
        --quiet &
    
    # Wait for validator to start
    print_step "Waiting for validator to start..."
    sleep 5
    
    # Set config to localhost
    solana config set --url http://localhost:8899
    
    # Airdrop some SOL
    print_step "Requesting SOL airdrop..."
    solana airdrop 10
    
    print_success "Local validator started"
fi

if [ "$START_FRONTEND" = true ]; then
    print_step "Starting frontend development server..."
    cd "$FRONTEND_DIR"
    
    # Start frontend in background
    yarn dev &
    
    print_success "Frontend dev server starting..."
    print_success "Frontend will be available at http://localhost:3000"
fi

if [ "$START_VALIDATOR" = true ] || [ "$START_FRONTEND" = true ]; then
    echo ""
    echo -e "${GREEN}🎉 Development environment is running!${NC}"
    echo ""
    echo -e "${YELLOW}Available services:${NC}"
    [ "$START_VALIDATOR" = true ] && echo "• Local Solana validator: http://localhost:8899"
    [ "$START_FRONTEND" = true ] && echo "• Frontend: http://localhost:3000"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
    echo ""
    
    # Wait for user to stop
    wait
else
    print_success "Setup complete"
fi
