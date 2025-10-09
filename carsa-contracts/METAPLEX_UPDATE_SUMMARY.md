# Metaplex CLI Update Summary

## Changes Made

The token metadata upload script has been updated to use the modern Metaplex CLI (`mplx`) instead of the deprecated `metaplex` command.

### Key Updates

1. **CLI Command Update**: 
   - **Old**: `metaplex create-metadata`
   - **New**: `mplx toolbox token update`

2. **Installation Method**:
   - **Old**: `bash <(curl -sSf https://sugar.metaplex.com/install.sh)`
   - **New**: `npm install -g @metaplex-foundation/cli`

3. **Functionality Change**:
   - **Old**: Created new metadata accounts
   - **New**: Updates existing token metadata

### New Script Features

- **JSON Parsing**: Uses `jq` to extract metadata from JSON file
- **Dynamic Values**: Automatically reads name, symbol, description, and image from metadata file
- **Better Error Handling**: Checks for required dependencies (`jq`, `mplx`)
- **Clearer Documentation**: Added notes about usage and alternatives

### Command Structure

```bash
# Old command (deprecated)
metaplex create-metadata \
  --keypair "/path/to/keypair.json" \
  --rpc "https://api.devnet.solana.com" \
  --mint "MINT_ADDRESS" \
  --metadata "./metadata.json" \
  --update-authority "UPDATE_AUTHORITY"

# New command (current)
mplx toolbox token update "MINT_ADDRESS" \
  --keypair "/path/to/keypair.json" \
  --rpc "https://api.devnet.solana.com" \
  --name "TOKEN_NAME" \
  --symbol "TOKEN_SYMBOL" \
  --description "TOKEN_DESCRIPTION" \
  --image "IMAGE_URL"
```

## Files Updated

1. **`create-token-metadata.sh`**: Main script updated to use modern CLI
2. **`create-metadata.ts`**: TypeScript generator updated to create modern scripts
3. **`METAPLEX_UPDATE_SUMMARY.md`**: This documentation file

## Usage Instructions

### For Existing Tokens (Current Script)
```bash
./create-token-metadata.sh
```

### For New Token Creation
```bash
# Interactive wizard
mplx toolbox token create --wizard

# Direct command
mplx toolbox token create \
  --name "My Token" \
  --symbol "TOKEN" \
  --description "My awesome token" \
  --image ./image.png \
  --decimals 9 \
  --mint-amount 1000000
```

## Dependencies Required

1. **jq**: JSON parsing tool
   - Ubuntu/Debian: `sudo apt-get install jq`
   - macOS: `brew install jq`
   - Arch Linux: `sudo pacman -S jq`

2. **mplx CLI**: Modern Metaplex CLI
   - Install: `npm install -g @metaplex-foundation/cli`
   - Verify: `mplx --version`

## Important Notes

- The updated script **updates existing token metadata**, it doesn't create new tokens
- For creating new tokens with metadata from scratch, use `mplx toolbox token create --wizard`
- The old `metaplex` CLI is deprecated and the `create-metadata` command no longer exists
- All metadata is now uploaded automatically when using the token update command

## Resources

- [Metaplex CLI Documentation](https://developers.metaplex.com/cli)
- [Token Metadata Documentation](https://developers.metaplex.com/token-metadata)
- [GitHub Repository](https://github.com/metaplex-foundation/cli)
