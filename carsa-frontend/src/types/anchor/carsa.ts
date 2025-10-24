/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/carsa.json`.
 */
export type Carsa = {
  "address": "FicaEwstRkE9pwHZPWS34XAjnbH6vc8aZ2Ly4EiksmxY",
  "metadata": {
    "name": "carsa",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "docs": [
    "Main program module for the Carsa loyalty program",
    "Manages Lokal token minting, distribution, and redemption"
  ],
  "instructions": [
    {
      "name": "depositVoucher",
      "docs": [
        "Deposit voucher tokens into the staking pool using delegated authority",
        "The user must have previously approved the pool delegate",
        "",
        "# Arguments",
        "* `ctx` - The instruction context containing required accounts",
        "* `amount` - The amount of voucher tokens to stake",
        "",
        "# Returns",
        "* `Result<()>` - Success or error result"
      ],
      "discriminator": [
        82,
        178,
        83,
        142,
        200,
        70,
        4,
        73
      ],
      "accounts": [
        {
          "name": "user",
          "docs": [
            "The user whose tokens are being deposited"
          ]
        },
        {
          "name": "poolDelegate",
          "docs": [
            "The delegate authority executing this instruction on behalf of the user",
            "Must match the pool_delegate in pool_state"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "poolState",
          "docs": [
            "The pool state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "userStakeRecord",
          "docs": [
            "User's stake record (created if doesn't exist)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "poolState"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "userVoucherAta",
          "docs": [
            "User's voucher token account (source)"
          ],
          "writable": true
        },
        {
          "name": "poolVaultAta",
          "docs": [
            "Pool vault token account (destination)"
          ],
          "writable": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program for account creation"
          ],
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Token program for SPL token operations"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initialize",
      "docs": [
        "Legacy initialize function for backwards compatibility",
        "This will be removed in future versions"
      ],
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [],
      "args": []
    },
    {
      "name": "initializeLokalMint",
      "docs": [
        "Initialize the Lokal token mint and program configuration",
        "This instruction sets up the SPL token mint with the program as authority",
        "",
        "# Arguments",
        "* `ctx` - The instruction context containing required accounts",
        "",
        "# Returns",
        "* `Result<()>` - Success or error result"
      ],
      "discriminator": [
        191,
        150,
        196,
        106,
        175,
        171,
        200,
        123
      ],
      "accounts": [
        {
          "name": "updateAuthority",
          "docs": [
            "The authority that can update the mint configuration",
            "This should be the program deployer or designated admin"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "mint",
          "docs": [
            "The mint account for Lokal tokens",
            "This will be created and owned by the SPL Token program"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "mintAuthority",
          "docs": [
            "Program Derived Address that acts as the mint authority",
            "This ensures only the program can mint new tokens"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "config",
          "docs": [
            "Configuration account that stores mint metadata and settings",
            "Uses PDA to ensure uniqueness and program ownership"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL Token program required for mint operations"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program required for account creation"
          ],
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "docs": [
            "Rent sysvar required for rent exemption calculations"
          ],
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializePool",
      "docs": [
        "Initialize a new voucher staking pool for LOKAL tokens",
        "Creates the pool state and configures staking parameters",
        "",
        "# Arguments",
        "* `ctx` - The instruction context containing required accounts",
        "* `config` - Pool configuration including stake limits and APY",
        "",
        "# Returns",
        "* `Result<()>` - Success or error result"
      ],
      "discriminator": [
        95,
        180,
        10,
        172,
        84,
        174,
        232,
        40
      ],
      "accounts": [
        {
          "name": "poolAuthority",
          "docs": [
            "The authority that manages the pool (admin)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "poolDelegate",
          "docs": [
            "The delegate authority that can execute deposits on behalf of users"
          ]
        },
        {
          "name": "poolState",
          "docs": [
            "The pool state account (PDA)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "vaultAta",
          "docs": [
            "The vault token account that will hold staked voucher tokens",
            "Must be initialized before calling this instruction"
          ],
          "writable": true
        },
        {
          "name": "poolVaultAuthority",
          "docs": [
            "The vault authority PDA (owns the vault_ata)"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "voucherMint",
          "docs": [
            "The voucher token mint (LOKAL token)"
          ]
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program for account creation"
          ],
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Token program for SPL token operations"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "config",
          "type": {
            "defined": {
              "name": "poolConfig"
            }
          }
        }
      ]
    },
    {
      "name": "mintLokalTokens",
      "docs": [
        "Mint Lokal tokens to a user's token account",
        "Used for reward distribution when users make purchases at merchants",
        "",
        "# Arguments",
        "* `ctx` - The instruction context containing required accounts",
        "* `amount` - The amount of tokens to mint (in smallest unit, considering 9 decimals)",
        "",
        "# Returns",
        "* `Result<()>` - Success or error result"
      ],
      "discriminator": [
        30,
        159,
        99,
        133,
        157,
        239,
        64,
        63
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "The authority that can mint tokens (must be the update authority)"
          ],
          "signer": true
        },
        {
          "name": "mint",
          "docs": [
            "The mint account for Lokal tokens",
            "Must match the mint stored in config"
          ],
          "writable": true
        },
        {
          "name": "mintAuthority",
          "docs": [
            "Program Derived Address that acts as the mint authority"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "config",
          "docs": [
            "Configuration account containing mint settings"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "destination",
          "docs": [
            "The token account that will receive the minted tokens",
            "This should be the user's associated token account for Lokal tokens"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL Token program for mint operations"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "processPurchase",
      "docs": [
        "Process a purchase transaction and distribute reward tokens with optional token redemption",
        "This is the core instruction that implements the loyalty program logic",
        "",
        "# Arguments",
        "* `ctx` - The instruction context containing required accounts",
        "* `fiat_amount` - The fiat payment amount in Indonesian Rupiah (IDR)",
        "* `redeem_token_amount` - Optional amount of tokens to redeem as payment",
        "* `transaction_id` - Unique identifier for this transaction (32 bytes)",
        "",
        "# Returns",
        "* `Result<()>` - Success or error result"
      ],
      "discriminator": [
        38,
        233,
        48,
        62,
        162,
        120,
        177,
        244
      ],
      "accounts": [
        {
          "name": "customer",
          "docs": [
            "The customer making the purchase"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "merchantAccount",
          "docs": [
            "The merchant account receiving the purchase"
          ],
          "writable": true
        },
        {
          "name": "mint",
          "docs": [
            "The Lokal token mint"
          ],
          "writable": true
        },
        {
          "name": "mintAuthority",
          "docs": [
            "Program Derived Address that acts as the mint authority"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "config",
          "docs": [
            "Configuration account containing mint settings"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "customerTokenAccount",
          "docs": [
            "The customer's token account that will receive the reward tokens and source for redemption"
          ],
          "writable": true
        },
        {
          "name": "merchantTokenAccount",
          "docs": [
            "The merchant's token account (required when redeeming tokens, otherwise can be any account)"
          ],
          "writable": true
        },
        {
          "name": "transactionRecord",
          "docs": [
            "Purchase transaction record for tracking"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  97,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "customer"
              },
              {
                "kind": "arg",
                "path": "transactionId"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL Token program for mint operations"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program required for account creation"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "fiatAmount",
          "type": "u64"
        },
        {
          "name": "redeemTokenAmount",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "transactionId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "recordYield",
      "docs": [
        "Record yield earned from staking activities",
        "Called by the backend after swapping vouchers to SOL and earning yield",
        "",
        "# Arguments",
        "* `ctx` - The instruction context containing required accounts",
        "* `sol_amount` - The amount of SOL yield earned",
        "",
        "# Returns",
        "* `Result<()>` - Success or error result"
      ],
      "discriminator": [
        80,
        136,
        238,
        204,
        216,
        161,
        41,
        88
      ],
      "accounts": [
        {
          "name": "poolDelegate",
          "docs": [
            "The pool delegate authority (backend service)"
          ],
          "signer": true
        },
        {
          "name": "poolState",
          "docs": [
            "The pool state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "solAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "redeemVoucher",
      "docs": [
        "Redeem staked vouchers and claim earned yield",
        "Allows users to unstake their tokens and withdraw",
        "",
        "# Arguments",
        "* `ctx` - The instruction context containing required accounts",
        "* `amount` - The amount of voucher tokens to redeem",
        "",
        "# Returns",
        "* `Result<()>` - Success or error result"
      ],
      "discriminator": [
        50,
        219,
        8,
        127,
        45,
        96,
        161,
        92
      ],
      "accounts": [
        {
          "name": "user",
          "docs": [
            "The user redeeming their stake"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "poolState",
          "docs": [
            "The pool state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "userStakeRecord",
          "docs": [
            "User's stake record"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "poolState"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "userVoucherAta",
          "docs": [
            "User's voucher token account (destination)"
          ],
          "writable": true
        },
        {
          "name": "poolVaultAta",
          "docs": [
            "Pool vault token account (source)"
          ],
          "writable": true
        },
        {
          "name": "poolVaultAuthority",
          "docs": [
            "Pool vault authority PDA (signer for transfer)"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Token program for SPL token operations"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "registerMerchant",
      "docs": [
        "Register a new merchant in the Carsa loyalty program",
        "This instruction creates a merchant account with specific cashback rates",
        "",
        "# Arguments",
        "* `ctx` - The instruction context containing required accounts",
        "* `name` - The merchant's display name (max 32 characters)",
        "* `category` - The merchant's business category (max 16 characters)",
        "* `cashback_rate` - The cashback percentage in basis points (e.g., 500 = 5%)",
        "",
        "# Returns",
        "* `Result<()>` - Success or error result"
      ],
      "discriminator": [
        238,
        245,
        77,
        132,
        161,
        88,
        216,
        248
      ],
      "accounts": [
        {
          "name": "merchantOwner",
          "docs": [
            "The merchant's wallet that will own this merchant account"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "merchantAccount",
          "docs": [
            "The merchant account to be created",
            "Uses PDA for security and to prevent duplicate merchants"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  114,
                  99,
                  104,
                  97,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "merchantOwner"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program required for account creation"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "category",
          "type": "string"
        },
        {
          "name": "cashbackRate",
          "type": "u16"
        }
      ]
    },
    {
      "name": "transferTokens",
      "docs": [
        "Transfer Lokal tokens between user accounts",
        "Enables peer-to-peer token transfers within the ecosystem",
        "",
        "# Arguments",
        "* `ctx` - The instruction context containing required accounts",
        "* `amount` - The amount of tokens to transfer (in smallest unit, considering 9 decimals)",
        "* `transaction_id` - Unique identifier for this transaction (32 bytes)",
        "* `memo` - Optional memo describing the transfer (max 64 characters)",
        "",
        "# Returns",
        "* `Result<()>` - Success or error result"
      ],
      "discriminator": [
        54,
        180,
        238,
        175,
        74,
        85,
        126,
        188
      ],
      "accounts": [
        {
          "name": "sender",
          "docs": [
            "The sender of the tokens"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "senderTokenAccount",
          "docs": [
            "The sender's token account"
          ],
          "writable": true
        },
        {
          "name": "recipientTokenAccount",
          "docs": [
            "The recipient's token account"
          ],
          "writable": true
        },
        {
          "name": "config",
          "docs": [
            "Configuration account containing mint settings"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "transferRecord",
          "docs": [
            "Transfer record for tracking"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "sender"
              },
              {
                "kind": "arg",
                "path": "transactionId"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL Token program for transfer operations"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program required for account creation"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "transactionId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "memo",
          "type": "string"
        }
      ]
    },
    {
      "name": "updateMerchant",
      "docs": [
        "Update merchant settings such as cashback rate and active status",
        "Only the merchant owner can perform this operation",
        "",
        "# Arguments",
        "* `ctx` - The instruction context containing required accounts",
        "* `new_cashback_rate` - Optional new cashback rate in basis points",
        "* `is_active` - Optional new active status for the merchant",
        "",
        "# Returns",
        "* `Result<()>` - Success or error result"
      ],
      "discriminator": [
        192,
        114,
        143,
        220,
        199,
        50,
        234,
        165
      ],
      "accounts": [
        {
          "name": "merchantOwner",
          "docs": [
            "The merchant's owner wallet"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "merchantAccount",
          "docs": [
            "The merchant account to update"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  114,
                  99,
                  104,
                  97,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "merchantOwner"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "newCashbackRate",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "isActive",
          "type": {
            "option": "bool"
          }
        }
      ]
    },
    {
      "name": "updatePoolConfig",
      "docs": [
        "Update pool configuration settings",
        "Only the pool authority can perform this operation",
        "",
        "# Arguments",
        "* `ctx` - The instruction context containing required accounts",
        "* `new_config` - New pool configuration parameters",
        "",
        "# Returns",
        "* `Result<()>` - Success or error result"
      ],
      "discriminator": [
        68,
        236,
        203,
        122,
        179,
        62,
        234,
        252
      ],
      "accounts": [
        {
          "name": "poolAuthority",
          "docs": [
            "The pool authority (admin)"
          ],
          "signer": true
        },
        {
          "name": "poolState",
          "docs": [
            "The pool state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "newConfig",
          "type": {
            "defined": {
              "name": "poolConfig"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "lokalMintConfig",
      "discriminator": [
        217,
        53,
        103,
        181,
        28,
        29,
        159,
        189
      ]
    },
    {
      "name": "merchantAccount",
      "discriminator": [
        182,
        10,
        106,
        140,
        73,
        79,
        234,
        186
      ]
    },
    {
      "name": "poolState",
      "discriminator": [
        247,
        237,
        227,
        245,
        215,
        195,
        222,
        70
      ]
    },
    {
      "name": "purchaseTransaction",
      "discriminator": [
        25,
        229,
        12,
        152,
        184,
        97,
        88,
        220
      ]
    },
    {
      "name": "tokenTransfer",
      "discriminator": [
        190,
        106,
        98,
        208,
        197,
        124,
        235,
        221
      ]
    },
    {
      "name": "userStakeRecord",
      "discriminator": [
        2,
        228,
        217,
        21,
        212,
        139,
        4,
        208
      ]
    }
  ],
  "events": [
    {
      "name": "poolConfigUpdatedEvent",
      "discriminator": [
        24,
        215,
        34,
        45,
        185,
        59,
        102,
        68
      ]
    },
    {
      "name": "poolInitializedEvent",
      "discriminator": [
        249,
        103,
        129,
        77,
        214,
        169,
        88,
        24
      ]
    },
    {
      "name": "voucherDepositedEvent",
      "discriminator": [
        103,
        231,
        214,
        11,
        249,
        124,
        82,
        77
      ]
    },
    {
      "name": "voucherRedeemedEvent",
      "discriminator": [
        86,
        236,
        24,
        84,
        52,
        173,
        157,
        177
      ]
    },
    {
      "name": "yieldRecordedEvent",
      "discriminator": [
        89,
        21,
        255,
        236,
        215,
        171,
        225,
        22
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "mintAuthorityMismatch",
      "msg": "Mint authority mismatch - the provided mint authority does not match the expected PDA"
    },
    {
      "code": 6001,
      "name": "updateAuthorityMismatch",
      "msg": "Update authority mismatch - only the designated update authority can perform this action"
    },
    {
      "code": 6002,
      "name": "invalidMintAmount",
      "msg": "Mint amount cannot be zero"
    },
    {
      "code": 6003,
      "name": "mintAmountTooLarge",
      "msg": "Mint amount exceeds maximum allowed per transaction"
    },
    {
      "code": 6004,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow occurred during calculation"
    },
    {
      "code": 6005,
      "name": "mintNotInitialized",
      "msg": "The Lokal token mint has not been initialized"
    },
    {
      "code": 6006,
      "name": "invalidPurchaseAmount",
      "msg": "Purchase amount cannot be zero"
    },
    {
      "code": 6007,
      "name": "purchaseAmountTooLarge",
      "msg": "Purchase amount exceeds maximum allowed per transaction"
    },
    {
      "code": 6008,
      "name": "merchantNotActive",
      "msg": "Merchant is not active or has been deactivated"
    },
    {
      "code": 6009,
      "name": "invalidCashbackRate",
      "msg": "Invalid cashback rate - must be between 0 and 10000 basis points"
    },
    {
      "code": 6010,
      "name": "invalidMerchantName",
      "msg": "Merchant name is too long or contains invalid characters"
    },
    {
      "code": 6011,
      "name": "invalidMerchantCategory",
      "msg": "Merchant category is invalid or not supported"
    },
    {
      "code": 6012,
      "name": "merchantOwnerMismatch",
      "msg": "Only the merchant owner can perform this action"
    },
    {
      "code": 6013,
      "name": "zeroRewardCalculation",
      "msg": "Reward calculation resulted in zero tokens"
    },
    {
      "code": 6014,
      "name": "invalidTransferAmount",
      "msg": "Transfer amount cannot be zero"
    },
    {
      "code": 6015,
      "name": "transferAmountTooLarge",
      "msg": "Transfer amount exceeds maximum allowed per transaction"
    },
    {
      "code": 6016,
      "name": "insufficientBalance",
      "msg": "Insufficient token balance for transfer"
    },
    {
      "code": 6017,
      "name": "invalidRedemptionAmount",
      "msg": "Redemption amount cannot be zero"
    },
    {
      "code": 6018,
      "name": "redemptionAmountTooLarge",
      "msg": "Redemption amount exceeds maximum allowed per transaction"
    },
    {
      "code": 6019,
      "name": "selfTransferNotAllowed",
      "msg": "Cannot transfer to the same account"
    },
    {
      "code": 6020,
      "name": "redemptionMerchantNotActive",
      "msg": "Redemption not allowed - merchant must be active"
    },
    {
      "code": 6021,
      "name": "invalidDiscountPercentage",
      "msg": "Invalid discount percentage - must be between 0 and 100"
    },
    {
      "code": 6022,
      "name": "invalidAmount",
      "msg": "Invalid amount - must be greater than zero and within limits"
    },
    {
      "code": 6023,
      "name": "unauthorized",
      "msg": "Unauthorized - only the pool authority can perform this action"
    },
    {
      "code": 6024,
      "name": "unauthorizedDelegate",
      "msg": "Unauthorized delegate - only the pool delegate can perform this action"
    },
    {
      "code": 6025,
      "name": "depositsDisabled",
      "msg": "Deposits are currently disabled for this pool"
    },
    {
      "code": 6026,
      "name": "withdrawalsDisabled",
      "msg": "Withdrawals are currently disabled for this pool"
    },
    {
      "code": 6027,
      "name": "exceedsMaxStake",
      "msg": "User has exceeded the maximum stake per user limit"
    },
    {
      "code": 6028,
      "name": "invalidVault",
      "msg": "Invalid vault account"
    },
    {
      "code": 6029,
      "name": "invalidMint",
      "msg": "Invalid mint account"
    },
    {
      "code": 6030,
      "name": "invalidOwner",
      "msg": "Invalid owner - account owner does not match expected value"
    },
    {
      "code": 6031,
      "name": "overflow",
      "msg": "Arithmetic overflow occurred"
    },
    {
      "code": 6032,
      "name": "divisionByZero",
      "msg": "Division by zero attempted"
    }
  ],
  "types": [
    {
      "name": "lokalMintConfig",
      "docs": [
        "State account that stores the configuration and metadata for the Lokal token mint",
        "This account is owned by the program and stores essential mint information"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "docs": [
              "The public key of the mint account for Lokal tokens"
            ],
            "type": "pubkey"
          },
          {
            "name": "mintAuthorityBump",
            "docs": [
              "The bump seed for the PDA that acts as mint authority",
              "This ensures the program has full control over token minting"
            ],
            "type": "u8"
          },
          {
            "name": "configBump",
            "docs": [
              "The bump seed for this config account's PDA"
            ],
            "type": "u8"
          },
          {
            "name": "updateAuthority",
            "docs": [
              "The authority that can update mint configuration (typically program deployer)"
            ],
            "type": "pubkey"
          },
          {
            "name": "totalSupply",
            "docs": [
              "Total supply of Lokal tokens ever minted",
              "Used for tracking and analytics purposes"
            ],
            "type": "u64"
          },
          {
            "name": "reserved",
            "docs": [
              "Reserved space for future upgrades (64 bytes)"
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "merchantAccount",
      "docs": [
        "Merchant account that stores merchant-specific information and settings",
        "This account tracks participating merchants and their reward configurations"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "merchantWallet",
            "docs": [
              "The merchant's wallet public key for receiving payments"
            ],
            "type": "pubkey"
          },
          {
            "name": "name",
            "docs": [
              "The merchant's display name"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "category",
            "docs": [
              "The merchant's category (e.g., \"restaurant\", \"bookstore\", \"coffee_shop\")"
            ],
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "cashbackRate",
            "docs": [
              "Cashback percentage (in basis points, e.g., 500 = 5%)"
            ],
            "type": "u16"
          },
          {
            "name": "isActive",
            "docs": [
              "Whether the merchant is currently active"
            ],
            "type": "bool"
          },
          {
            "name": "totalTransactions",
            "docs": [
              "Total number of transactions processed for this merchant"
            ],
            "type": "u64"
          },
          {
            "name": "totalRewardsDistributed",
            "docs": [
              "Total amount of tokens distributed as rewards for this merchant"
            ],
            "type": "u64"
          },
          {
            "name": "totalVolume",
            "docs": [
              "Total purchase volume (in Indonesian Rupiah IDR) processed"
            ],
            "type": "u64"
          },
          {
            "name": "createdAt",
            "docs": [
              "Timestamp when merchant was registered"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "The bump seed for this merchant account's PDA"
            ],
            "type": "u8"
          },
          {
            "name": "reserved",
            "docs": [
              "Reserved space for future upgrades (32 bytes)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "poolConfig",
      "docs": [
        "Configuration parameters for the voucher staking pool"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "minStakeAmount",
            "docs": [
              "Minimum amount required to stake"
            ],
            "type": "u64"
          },
          {
            "name": "maxStakePerUser",
            "docs": [
              "Maximum amount that can be staked per user"
            ],
            "type": "u64"
          },
          {
            "name": "depositsEnabled",
            "docs": [
              "Whether the pool accepts new deposits"
            ],
            "type": "bool"
          },
          {
            "name": "withdrawalsEnabled",
            "docs": [
              "Whether users can withdraw/redeem"
            ],
            "type": "bool"
          },
          {
            "name": "apyBasisPoints",
            "docs": [
              "Annual percentage yield (in basis points, e.g., 1200 = 12%)"
            ],
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "poolConfigUpdatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "config",
            "type": {
              "defined": {
                "name": "poolConfig"
              }
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "poolInitializedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "poolAuthority",
            "type": "pubkey"
          },
          {
            "name": "poolDelegate",
            "type": "pubkey"
          },
          {
            "name": "vaultAta",
            "type": "pubkey"
          },
          {
            "name": "voucherMint",
            "type": "pubkey"
          },
          {
            "name": "minStakeAmount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "poolState",
      "docs": [
        "Main pool state account for voucher staking",
        "Tracks overall pool metrics and configuration"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "poolAuthority",
            "docs": [
              "The authority that can manage the pool (admin)"
            ],
            "type": "pubkey"
          },
          {
            "name": "poolDelegate",
            "docs": [
              "The delegate authority that can execute deposits on behalf of users"
            ],
            "type": "pubkey"
          },
          {
            "name": "vaultAta",
            "docs": [
              "The vault token account that holds staked voucher tokens"
            ],
            "type": "pubkey"
          },
          {
            "name": "voucherMint",
            "docs": [
              "The mint address of the voucher token (LOKAL token)"
            ],
            "type": "pubkey"
          },
          {
            "name": "config",
            "docs": [
              "Pool configuration parameters"
            ],
            "type": {
              "defined": {
                "name": "poolConfig"
              }
            }
          },
          {
            "name": "totalVoucherStaked",
            "docs": [
              "Total amount of voucher tokens currently staked in the pool"
            ],
            "type": "u64"
          },
          {
            "name": "totalSolStaked",
            "docs": [
              "Total SOL/WSOL staked (after swaps)"
            ],
            "type": "u64"
          },
          {
            "name": "totalYieldEarned",
            "docs": [
              "Total yield earned (in SOL/WSOL)"
            ],
            "type": "u64"
          },
          {
            "name": "totalStakers",
            "docs": [
              "Number of unique stakers"
            ],
            "type": "u64"
          },
          {
            "name": "rewardIndex",
            "docs": [
              "Reward index for calculating proportional yields"
            ],
            "type": "u128"
          },
          {
            "name": "createdAt",
            "docs": [
              "Timestamp when pool was created"
            ],
            "type": "i64"
          },
          {
            "name": "lastYieldUpdate",
            "docs": [
              "Timestamp of last yield update"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "The bump seed for this pool state PDA"
            ],
            "type": "u8"
          },
          {
            "name": "reserved",
            "docs": [
              "Reserved space for future upgrades (64 bytes)"
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "purchaseTransaction",
      "docs": [
        "Purchase transaction record for tracking and analytics",
        "This account stores details of each purchase transaction including token redemptions"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "customer",
            "docs": [
              "The customer's wallet public key"
            ],
            "type": "pubkey"
          },
          {
            "name": "merchant",
            "docs": [
              "The merchant's account public key"
            ],
            "type": "pubkey"
          },
          {
            "name": "fiatAmount",
            "docs": [
              "Fiat purchase amount in Indonesian Rupiah (IDR)"
            ],
            "type": "u64"
          },
          {
            "name": "redeemedTokenAmount",
            "docs": [
              "Amount of tokens redeemed as payment (0 if none)"
            ],
            "type": "u64"
          },
          {
            "name": "totalValue",
            "docs": [
              "Total transaction value (fiat + token value in IDR)"
            ],
            "type": "u64"
          },
          {
            "name": "rewardAmount",
            "docs": [
              "Reward tokens minted for this purchase"
            ],
            "type": "u64"
          },
          {
            "name": "cashbackRate",
            "docs": [
              "Cashback rate applied (in basis points)"
            ],
            "type": "u16"
          },
          {
            "name": "usedTokens",
            "docs": [
              "Whether tokens were used in this transaction"
            ],
            "type": "bool"
          },
          {
            "name": "timestamp",
            "docs": [
              "Timestamp of the transaction"
            ],
            "type": "i64"
          },
          {
            "name": "transactionId",
            "docs": [
              "Transaction signature for reference"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "bump",
            "docs": [
              "The bump seed for this transaction account's PDA"
            ],
            "type": "u8"
          },
          {
            "name": "reserved",
            "docs": [
              "Reserved space for future upgrades (16 bytes)"
            ],
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          }
        ]
      }
    },
    {
      "name": "tokenTransfer",
      "docs": [
        "Token transfer record for tracking P2P transfers",
        "This account stores details of token transfers between users"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "from",
            "docs": [
              "The sender's public key"
            ],
            "type": "pubkey"
          },
          {
            "name": "to",
            "docs": [
              "The recipient's public key"
            ],
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "Amount of tokens transferred"
            ],
            "type": "u64"
          },
          {
            "name": "timestamp",
            "docs": [
              "Timestamp of the transfer"
            ],
            "type": "i64"
          },
          {
            "name": "transactionId",
            "docs": [
              "Transfer transaction signature for reference"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "memo",
            "docs": [
              "Optional memo/note for the transfer"
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "bump",
            "docs": [
              "The bump seed for this transfer account's PDA"
            ],
            "type": "u8"
          },
          {
            "name": "reserved",
            "docs": [
              "Reserved space for future upgrades (16 bytes)"
            ],
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          }
        ]
      }
    },
    {
      "name": "userStakeRecord",
      "docs": [
        "Individual user stake record",
        "Tracks each user's staking position and rewards"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "docs": [
              "The user who owns this stake"
            ],
            "type": "pubkey"
          },
          {
            "name": "pool",
            "docs": [
              "The pool this stake belongs to"
            ],
            "type": "pubkey"
          },
          {
            "name": "stakedAmount",
            "docs": [
              "Amount of voucher tokens staked by this user"
            ],
            "type": "u64"
          },
          {
            "name": "userRewardIndex",
            "docs": [
              "User's reward index snapshot (for yield calculations)"
            ],
            "type": "u128"
          },
          {
            "name": "totalYieldClaimed",
            "docs": [
              "Total yield claimed by this user"
            ],
            "type": "u64"
          },
          {
            "name": "stakedAt",
            "docs": [
              "Timestamp when user first staked"
            ],
            "type": "i64"
          },
          {
            "name": "lastActionAt",
            "docs": [
              "Timestamp of last stake/unstake action"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "The bump seed for this user stake record PDA"
            ],
            "type": "u8"
          },
          {
            "name": "reserved",
            "docs": [
              "Reserved space for future upgrades (32 bytes)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "voucherDepositedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "newUserTotal",
            "type": "u64"
          },
          {
            "name": "poolTotalStaked",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "voucherRedeemedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "amountRedeemed",
            "type": "u64"
          },
          {
            "name": "yieldClaimed",
            "type": "u64"
          },
          {
            "name": "remainingStake",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "yieldRecordedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "solAmount",
            "type": "u64"
          },
          {
            "name": "totalYieldEarned",
            "type": "u64"
          },
          {
            "name": "rewardIndex",
            "type": "u128"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
