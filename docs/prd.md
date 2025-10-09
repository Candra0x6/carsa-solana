
---

  # 📄 Project Requirements Document (PRD)

  ### Project: *Carsa – Hyperlocal Community Currency & Loyalty Program*

  ### Hackathon MVP Version (Solana + Anchor)

  ---

  ## 1. App Overview

  **Carsa** is a mobile-first loyalty & rewards app powered by blockchain.
  Users earn **Lokal tokens** when shopping at local MSMEs and can spend them across a **city-wide coalition of merchants**.

  **Goal for MVP**:

  * Showcase **earning + spending Lokal tokens** across at least **2 types of merchants** (e.g., coffee shop & bookstore).
  * Demonstrate **closed-loop token economy** via simple mobile/web app running on **Solana testnet**.

  ---

## 2. User Flows

### a. **User (Consumer)**

1. Download/open app → sign up (phone/email).
2. Browse participating merchants.
3. Make a purchase at a merchant (simulated via QR scan / mock checkout).
4. Receive % cashback in Lokal tokens (wallet balance updated on Solana).
5. Spend Lokal tokens at another merchant for a discount/partial payment.

### b. **Merchant**

1. Merchant signs up via merchant dashboard (web).
2. Lists shop details + generates merchant QR code.
3. Accepts payments / verifies user’s Lokal tokens.
4. Views simple dashboard: sales, tokens issued/redeemed.

---

## 3. Tech Stack & APIs

* **Frontend (MVP)**:

  * Next.js (web) with mobile-first design.
  * Simple QR scanner (simulate transactions).
  * Solana wallet adapter (web/custodial mock).

* **Backend**:

  * API Routes (Next.js).
  * Authentication (NextAuth).
  * Database: Supabase (users, merchants, transaction logs).

* **Blockchain Layer (Solana)**:

  * **Anchor Program** for Lokal token + reward logic:

    * Mint SPL tokens (`Lokal`).
    * Transfer rewards to user wallets.
    * Allow token redemption at merchants.
  * Use **Solana Devnet** for hackathon demo.
  * SPL Token Program integration.

* **Wallet**:

  * Custodial wallet (backend-managed keypairs for hackathon simplicity).
  * Optionally connect Phantom/Solflare for demo.

---

## 4. Core Features (for MVP)

* **Consumer App**

  * User registration & login.
  * Show Solana wallet balance (Lokal tokens).
  * QR scan to simulate purchase → Anchor contract mints reward tokens.
  * Spend Lokal tokens at merchant → transfer tokens back to merchant account.

* **Merchant Dashboard**

  * Merchant registration.
  * Generate merchant QR code.
  * Simple analytics: # of transactions, tokens issued, tokens redeemed.

---

## 5. In-Scope vs Out-of-Scope

✅ **In-Scope (MVP)**

* Lokal token SPL mint on Solana Devnet.
* Anchor program for mint + transfer logic.
* Custodial wallets tied to user/merchant IDs (no seed phrases).
* Web app with wallet balance + QR-based flow.
* 2–3 demo merchants (coffee shop, bookstore, restaurant).

❌ **Out-of-Scope (Future versions)**

* Non-custodial UX (Phantom/Solflare fully integrated).
* Fiat on/off ramps (e.g. Rupiah integration).
* Cross-city expansion (focus on Bandung demo).
* Advanced merchant analytics & dashboards.
* Complex tokenomics (staking, yield farming).
* Full regulatory compliance stack.
