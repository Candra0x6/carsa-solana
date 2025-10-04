#!/bin/bash

# Carsa System Setup Script
# This script helps set up the on-chain first architecture

set -e

echo "🚀 Setting up Carsa On-Chain First Architecture"
echo "============================================="

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    echo "❌ Error: Please run this script from the carsa-frontend directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check for required environment variables
echo "🔧 Checking environment configuration..."

if [[ ! -f ".env.local" ]]; then
    echo "📋 Creating .env.local from template..."
    cp .env.example .env.local
    echo "⚠️  Please edit .env.local with your actual values"
fi

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
npx prisma generate

# Check database connection
echo "🔍 Checking database connection..."
if npx prisma db push --skip-generate > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed. Please check your DATABASE_URL in .env.local"
    echo "💡 Make sure PostgreSQL is running and the database exists"
fi

# Generate server wallet if not configured
echo "🔐 Checking server wallet configuration..."
if grep -q "SERVER_WALLET_PRIVATE_KEY=\[1,2,3" .env.local; then
    echo "⚠️  Server wallet is using example key. Generating new keypair..."
    
    # Generate a new keypair using Solana CLI if available
    if command -v solana-keygen &> /dev/null; then
        TEMP_KEYPAIR=$(mktemp)
        solana-keygen new --no-bip39-passphrase --silent --outfile "$TEMP_KEYPAIR"
        
        # Convert to array format
        NEW_KEY=$(cat "$TEMP_KEYPAIR" | tr -d '[]' | tr -d ' ')
        
        # Update .env.local
        sed -i.bak "s/SERVER_WALLET_PRIVATE_KEY=.*/SERVER_WALLET_PRIVATE_KEY=[$NEW_KEY]/" .env.local
        
        # Get public key for reference
        PUBLIC_KEY=$(solana-keygen pubkey "$TEMP_KEYPAIR")
        echo "✅ Generated new server wallet: $PUBLIC_KEY"
        
        rm "$TEMP_KEYPAIR"
    else
        echo "⚠️  Solana CLI not found. Please install it or manually set SERVER_WALLET_PRIVATE_KEY"
        echo "   Install: sh -c \"\$(curl -sSfL https://release.solana.com/v1.16.0/install)\""
    fi
fi

# Check Anchor program deployment
echo "⚓ Checking Anchor program..."
if [[ -d "../carsa-contracts" ]]; then
    echo "📁 Found Anchor project at ../carsa-contracts"
    
    cd ../carsa-contracts
    
    # Build the program
    echo "🔨 Building Anchor program..."
    if anchor build > /dev/null 2>&1; then
        echo "✅ Anchor program built successfully"
        
        # Get program ID
        PROGRAM_ID=$(anchor keys list | grep -E '^carsa:' | awk '{print $2}')
        if [[ -n "$PROGRAM_ID" ]]; then
            echo "📝 Program ID: $PROGRAM_ID"
            
            # Update .env.local with correct program ID
            cd ../carsa-frontend
            sed -i.bak "s/NEXT_PUBLIC_ANCHOR_PROGRAM_ID=.*/NEXT_PUBLIC_ANCHOR_PROGRAM_ID=$PROGRAM_ID/" .env.local
            echo "✅ Updated program ID in .env.local"
        fi
    else
        echo "⚠️  Anchor build failed. Please check the Anchor program"
    fi
    
    cd ../carsa-frontend
else
    echo "⚠️  Anchor project not found at ../carsa-contracts"
fi

# Run database migrations
echo "🗄️  Running database setup..."
if npx prisma db push > /dev/null 2>&1; then
    echo "✅ Database schema updated"
else
    echo "⚠️  Database migration failed"
fi

# Check if Solana CLI is configured
echo "🌐 Checking Solana configuration..."
if command -v solana &> /dev/null; then
    NETWORK=$(solana config get | grep "RPC URL" | awk '{print $3}')
    echo "📡 Current Solana network: $NETWORK"
    
    if [[ "$NETWORK" != *"devnet"* ]] && [[ "$NETWORK" != *"localhost"* ]]; then
        echo "⚠️  Consider switching to devnet for development:"
        echo "   solana config set --url https://api.devnet.solana.com"
    fi
else
    echo "⚠️  Solana CLI not found. Install for easier development:"
    echo "   sh -c \"\$(curl -sSfL https://release.solana.com/v1.16.0/install)\""
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. 📝 Review and update .env.local with your values"
echo "2. 🗄️  Ensure your PostgreSQL database is running"
echo "3. ⚓ Deploy your Anchor program to devnet: cd ../carsa-contracts && anchor deploy"
echo "4. 🚀 Start development server: npm run dev"
echo ""
echo "📚 Architecture documentation: ./ARCHITECTURE.md"
echo "🔍 Test the flows: http://localhost:3000 (after starting dev server)"
echo ""
echo "🎉 Happy coding with on-chain first architecture!"
