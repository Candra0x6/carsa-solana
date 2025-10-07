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
      "name": "burnTokens",
      "docs": [
        "Burn Lokal tokens (optional deflation mechanism)",
        "Allows merchants to burn tokens they receive from redemptions",
        "",
        "# Arguments",
        "* `ctx` - The instruction context containing required accounts",
        "* `amount` - The amount of tokens to burn (in smallest unit, considering 9 decimals)",
        "",
        "# Returns",
        "* `Result<()>` - Success or error result"
      ],
      "discriminator": [
        76,
        15,
        51,
        254,
        229,
        215,
        121,
        66
      ],
      "accounts": [
        {
          "name": "merchantOwner",
          "docs": [
            "The merchant burning tokens"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "merchantAccount",
          "docs": [
            "The merchant account"
          ]
        },
        {
          "name": "merchantTokenAccount",
          "docs": [
            "The merchant's token account (tokens to be burned)"
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
          "name": "tokenProgram",
          "docs": [
            "SPL Token program for burn operations"
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
        "Process a purchase transaction and distribute reward tokens",
        "This is the core instruction that implements the loyalty program logic",
        "",
        "# Arguments",
        "* `ctx` - The instruction context containing required accounts",
        "* `purchase_amount` - The purchase amount in SOL lamports",
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
            "The customer's token account that will receive the reward tokens"
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
          "name": "purchaseAmount",
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
        }
      ]
    },
    {
      "name": "redeemTokens",
      "docs": [
        "Redeem Lokal tokens at a merchant for discounts or payments",
        "This instruction handles the spending side of the loyalty program",
        "",
        "# Arguments",
        "* `ctx` - The instruction context containing required accounts",
        "* `token_amount` - The amount of tokens to redeem (in smallest unit, considering 9 decimals)",
        "* `fiat_value` - The fiat value of the purchase in lamports equivalent",
        "* `discount_rate` - The discount percentage in basis points (e.g., 1000 = 10%)",
        "* `transaction_id` - Unique identifier for this transaction (32 bytes)",
        "",
        "# Returns",
        "* `Result<()>` - Success or error result"
      ],
      "discriminator": [
        246,
        98,
        134,
        41,
        152,
        33,
        120,
        69
      ],
      "accounts": [
        {
          "name": "customer",
          "docs": [
            "The customer redeeming tokens"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "customerTokenAccount",
          "docs": [
            "The customer's token account"
          ],
          "writable": true
        },
        {
          "name": "merchantAccount",
          "docs": [
            "The merchant account where tokens are being redeemed"
          ],
          "writable": true
        },
        {
          "name": "merchantTokenAccount",
          "docs": [
            "The merchant's token account (receives the redeemed tokens)"
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
          "name": "redemptionRecord",
          "docs": [
            "Redemption record for tracking"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  109,
                  112,
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
                "kind": "account",
                "path": "merchantAccount"
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
          "name": "tokenAmount",
          "type": "u64"
        },
        {
          "name": "fiatValue",
          "type": "u64"
        },
        {
          "name": "discountRate",
          "type": "u16"
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
      "name": "tokenRedemption",
      "discriminator": [
        116,
        31,
        235,
        253,
        162,
        204,
        183,
        23
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
              "Total purchase volume (in SOL lamports) processed"
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
      "name": "purchaseTransaction",
      "docs": [
        "Purchase transaction record for tracking and analytics",
        "This account stores details of each purchase transaction"
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
            "name": "purchaseAmount",
            "docs": [
              "Purchase amount in SOL lamports"
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
      "name": "tokenRedemption",
      "docs": [
        "Token redemption record for tracking spending at merchants",
        "This account stores details when customers spend Lokal tokens at merchants"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "customer",
            "docs": [
              "The customer who redeemed tokens"
            ],
            "type": "pubkey"
          },
          {
            "name": "merchant",
            "docs": [
              "The merchant where tokens were redeemed"
            ],
            "type": "pubkey"
          },
          {
            "name": "tokenAmount",
            "docs": [
              "Amount of tokens redeemed"
            ],
            "type": "u64"
          },
          {
            "name": "fiatValue",
            "docs": [
              "Fiat value of the redemption (in lamports for calculation)"
            ],
            "type": "u64"
          },
          {
            "name": "discountRate",
            "docs": [
              "Discount percentage applied (in basis points)"
            ],
            "type": "u16"
          },
          {
            "name": "timestamp",
            "docs": [
              "Timestamp of the redemption"
            ],
            "type": "i64"
          },
          {
            "name": "transactionId",
            "docs": [
              "Redemption transaction signature for reference"
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
              "The bump seed for this redemption account's PDA"
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
    }
  ]
};
