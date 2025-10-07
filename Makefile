# 🚀 CARSA Solana Project Makefile
# Provides convenient shortcuts for common development tasks

.PHONY: help setup redeploy dev test clean install deps

# Default target
help: ## Show this help message
	@echo "🚀 CARSA Solana Project Commands"
	@echo "================================="
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Examples:"
	@echo "  make setup          # Complete project setup"
	@echo "  make dev            # Start development environment"
	@echo "  make redeploy       # Quick contract redeploy"
	@echo "  make test           # Run all tests"

setup: ## Complete project setup (contracts + frontend)
	@echo "🚀 Setting up CARSA project..."
	./setup.sh

setup-local: ## Setup for local development (with local validator)
	@echo "🏠 Setting up for local development..."
	./setup.sh --network localnet

redeploy: ## Quick rebuild and redeploy contracts to devnet
	@echo "🔨 Rebuilding and redeploying..."
	./redeploy.sh devnet

redeploy-local: ## Quick rebuild and redeploy to local validator
	@echo "🔨 Rebuilding and redeploying to local..."
	./redeploy.sh localnet

dev: ## Start development environment (frontend only)
	@echo "🎨 Starting development environment..."
	./dev.sh

dev-local: ## Start local validator + frontend development
	@echo "🏠 Starting local development environment..."
	./dev.sh --local-validator

test: ## Run contract tests
	@echo "🧪 Running contract tests..."
	cd carsa-contracts && anchor test

test-frontend: ## Run frontend tests
	@echo "🧪 Running frontend tests..."
	cd carsa-frontend && yarn test

install: deps ## Install all dependencies

deps: ## Install project dependencies
	@echo "📦 Installing contract dependencies..."
	cd carsa-contracts && yarn install
	@echo "📦 Installing frontend dependencies..."
	cd carsa-frontend && yarn install

clean: ## Clean build artifacts
	@echo "🧹 Cleaning build artifacts..."
	cd carsa-contracts && rm -rf target/ node_modules/ .anchor/
	cd carsa-frontend && rm -rf .next/ node_modules/
	@echo "✅ Clean complete"

reset: clean ## Reset everything (clean + remove generated files)
	@echo "🔄 Resetting project..."
	rm -f carsa-contracts/lokal-token-addresses.json
	rm -f carsa-contracts/lokal-mint-keypair.json
	rm -f carsa-frontend/.env.local
	@echo "✅ Reset complete - run 'make setup' to reinitialize"

# Token management shortcuts
token-info: ## Show token information
	./token-manager.sh info

token-balance: ## Check token balance (usage: make token-balance WALLET=<address>)
	./token-manager.sh balance $(WALLET)

token-mint: ## Mint tokens (usage: make token-mint WALLET=<address> AMOUNT=<amount>)
	./token-manager.sh mint $(WALLET) $(AMOUNT)

# Solana shortcuts
airdrop: ## Request SOL airdrop for current wallet
	solana airdrop 2

wallet: ## Show current wallet address
	@echo "Current wallet: $(shell solana address)"

balance: ## Show current SOL balance
	@echo "SOL balance: $(shell solana balance)"

# Development shortcuts
logs: ## Show program logs
	solana logs --url devnet

explorer: ## Open Solana Explorer for current program
	@echo "Opening explorer for program: $(shell jq -r '.programId' carsa-contracts/lokal-token-addresses.json 2>/dev/null || echo 'No program deployed')"

# Status checks
status: ## Show project status
	@echo "🔍 Project Status"
	@echo "=================="
	@echo ""
	@echo "Solana Config:"
	@solana config get | grep -E "(RPC URL|Keypair Path)"
	@echo ""
	@echo "Wallet:"
	@echo "  Address: $(shell solana address)"
	@echo "  Balance: $(shell solana balance)"
	@echo ""
	@if [ -f "carsa-contracts/lokal-token-addresses.json" ]; then \
		echo "Token Info:"; \
		echo "  Program ID: $(shell jq -r '.programId' carsa-contracts/lokal-token-addresses.json)"; \
		echo "  Mint Address: $(shell jq -r '.mintAddress' carsa-contracts/lokal-token-addresses.json)"; \
	else \
		echo "❌ Token not initialized"; \
	fi

# Quick start for new developers
quickstart: ## Complete setup and start development environment
	@echo "🚀 CARSA Quick Start"
	@echo "==================="
	make setup
	@echo ""
	@echo "✅ Setup complete! Starting development environment..."
	@echo ""
	make dev
