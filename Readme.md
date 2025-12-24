# Tulips — The Comprehensive Guide to a Decentralized NFT Marketplace

**Tulips** is a full-stack, decentralized NFT marketplace built entirely on the **Internet Computer (IC)** blockchain. Unlike traditional dApps that often rely on a patchwork of services (AWS for frontend, IPFS for storage, Ethereum for logic), Tulips is a **monolithic** application where the frontend, backend logic, database, and asset storage all live on-chain.

This documentation is written to be an exhaustive guide to the system's inner workings. It breaks down every major user interaction—from creating an account to finalizing a complex auction—explaining the **cryptographic mechanisms**, **economic logic**, and **code execution** that occurs at each step.

---

## 📚 Table of Contents

1.  [System Architecture](#1-system-architecture)
2.  [Opening an Account & Identity](#2-opening-an-account--identity)
3.  [Minting an NFT (The Creation Engine)](#3-minting-an-nft-the-creation-engine)
4.  [Direct Selling (Fixed Price Trading)](#4-direct-selling-fixed-price-trading)
5.  [The Auction Mechanism (Escrow & Bidding)](#5-the-auction-mechanism-escrow--bidding)
6.  [Technical Appendix: The Bank Ledger](#6-technical-appendix-the-bank-ledger)
7.  [Installation & Deployment](#7-installation--deployment)

---

## 1. System Architecture

Before diving into the workflows, it is crucial to understand the three pillars of the Tulips ecosystem. The application follows the **Actor Model**, where different "canisters" (smart contracts) run independently and communicate via asynchronous messages.

### The Components

1.  **The Frontend (React/Vite)**:
    *   Hosted directly on the IC as an asset canister.
    *   Uses `@dfinity/agent` to sign messages with the user's private key (managed by Internet Identity) and send them to the backend.
    *   **Role**: The interface for state visualization and transaction initiation.

2.  **The Marketplace Canister (Motoko)**:
    *   **Role**: The "Brain" of the operation.
    *   **Storage**: Holds the entire state of NFTs (metadata, owners, status) in its heap memory.
    *   **Logic**: Executes the rules of trade, manages auction timers, and instructs the Bank to move funds.

3.  **The DBank Canister (Motoko)**:
    *   **Role**: The "Vault".
    *   **Storage**: Maintains a ledger mapping `Principal -> Balance`.
    *   **Logic**: Handles minting of the native token ("DAMN"), transfers between users, and treasury management.

---

## 2. Opening an Account & Identity

On the Internet Computer, there are no "wallets" in the browser extension sense (like MetaMask). Instead, users authenticate via **Internet Identity (II)**.

### Step-by-Step Workflow

1.  **User Arrives**: The user visits the Tulips URL.
2.  **Authentication**: The user clicks "Login". They are redirected to `identity.ic0.app`.
    *   **Mechanism**: The user authenticates using a passkey (FaceID, TouchID, or YubiKey).
    *   **Result**: The II protocol generates a unique **Principal ID** specifically for the Tulips dApp. This prevents cross-site tracking.
3.  **Session Creation**: The frontend receives this Principal and creates an `HttpAgent`. This agent will now sign every subsequent request.

### The "Faucet" Mechanism (Getting Started)

Since this is a custom token economy, a new user starts with 0 DAMN tokens. To allow testing, we implemented a Faucet.

**The Code Flow (`dbank/main.mo`):**

```motoko
public shared(msg) func payOut() : async Text {
    let caller = msg.caller; // The Principal of the user

    // 1. Check for Double-Dipping
    switch (claimed.get(caller)) {
      case (?true) { return "Already Claimed" };
      case _ {};
    };

    // 2. Verify Treasury Solvency
    let payoutAmount : Nat = 10_000;
    // ... check treasury balance ...

    // 3. Execute Transfer (Atomic State Update)
    balances.put(treasury, treasBal - payoutAmount);
    balances.put(userAcct, userBal + payoutAmount);

    // 4. Mark as Claimed
    claimed.put(caller, true);
    "Payout Successful"
};
```

**Explanation**:
*   The system uses a `HashMap` called `claimed` to track who has received tokens.
*   The transfer is **atomic**: the deduction from the treasury and the addition to the user happen in the same execution block. If the code traps (crashes) halfway, the entire state rolls back.

---

## 3. Minting an NFT (The Creation Engine)

Minting in Tulips is not just about uploading an image; it involves a **gamified economic cost**. The protocol charges a dynamic fee based on the asset's perceived value.

### Step-by-Step Workflow

1.  **User Input**:
    *   User uploads an image (converted to Base64 in the browser).
    *   User sets a **Desired Price** (e.g., 100 DAMN). This is the price they *intend* to sell it for later.

2.  **Fee Calculation (The "Secret Sauce")**:
    *   The user clicks "Mint".
    *   The `Marketplace` canister receives the request.
    *   It requests a **Random Blob** from the IC management canister.
    *   It calculates a random percentage between **40% and 60%**.

    **Code Snippet (`marketplace/main.mo`):**
    ```motoko
    let rnd = await Random.blob();
    let r = Nat8.toNat(Blob.toArray(rnd)[0]) % 21; // 0 to 20
    let feePercent = 40 + r; // 40 to 60
    let mintFee = (meta.desiredPrice * feePercent) / 100;
    ```

3.  **Payment Execution**:
    *   The Marketplace must now collect this `mintFee`.
    *   It calls the DBank's `icrc1_transfer_from_compat`.
    *   **Mechanism**: The DBank trusts the Marketplace canister to move funds from the User to the Treasury *without* a prior approval transaction. This streamlines UX.

4.  **Asset Creation**:
    *   If the transfer succeeds, the NFT is created in memory.
    *   **Storage**:
        ```motoko
        let nft : NFT = {
          id = nextNFTId;
          owner = msg.caller; // Assigned to the creator
          name = meta.name;
          image = meta.image; // Stored fully on-chain
          price = meta.desiredPrice;
          status = "Owned";
        };
        nfts.put(nftId, nft);
        ```

---

## 4. Direct Selling (Fixed Price Trading)

This is the standard e-commerce flow. A user lists an item, and another user buys it instantly.

### Phase A: Listing the Item

1.  **Initiation**: The owner calls `placeForSale(nftId, price)`.
2.  **Listing Fee**:
    *   To prevent spam, the protocol charges a **1% non-refundable listing fee**.
    *   The Marketplace calculates `price / 100` and transfers it to the Treasury immediately.
3.  **State Update**:
    *   The NFT status changes to `"isOnSale"`.
    *   A `SaleInfo` object is created in the `salesInfo` HashMap.

### Phase B: The Purchase

1.  **Buyer Action**: A different user calls `buyNFT(nftId)`.
2.  **Validation**: The system checks if the sale is active.
3.  **The Financial Transaction**:
    *   **Step 1 (Payment)**: The full price is transferred from the **Buyer** to the **Seller**.
    *   **Step 2 (Commission)**: The protocol automatically deducts a **2.5% commission** from the **Seller** and moves it to the Treasury.

    **Code Snippet (`marketplace/main.mo`):**
    ```motoko
    // 1. Buyer pays Seller
    ignore await Dbank.icrc1_transfer_from_compat({
      from = msg.caller; to = sale.seller; amount = sale.price; ...
    });

    // 2. Seller pays Protocol (Commission)
    let commission = (sale.price * 25) / 1000; // 2.5%
    ignore await Dbank.icrc1_transfer_from_compat({
      from = sale.seller; to = Treasury; amount = commission; ...
    });
    ```

4.  **Ownership Transfer**:
    *   The `nft.owner` field is updated to the Buyer's Principal.
    *   The `SaleInfo` is marked inactive.

---

## 5. The Auction Mechanism (Escrow & Bidding)

The auction system is the most complex part of Tulips. It solves the problem of **trustless bidding**: How do we ensure a bidder has the money without taking it from them permanently?

**The Solution: Deterministic Subaccounts.**

### Phase A: Starting the Auction

1.  **Listing**: The owner calls `listForAuction(nftId, startPrice, duration)`.
2.  **Fee**: A 1% listing fee is paid to the Treasury.
3.  **State**: An `AuctionInfo` object is created with an `endTime` (Current Time + Duration).

### Phase B: Placing a Bid (The Escrow Logic)

When a user places a bid, we don't send the money to the seller (the auction isn't over), nor do we keep it in the bidder's main account (they might spend it). We move it to a **Subaccount**.

**Mechanism: Subaccount Hashing**
Every Bidder + NFT combination has a unique subaccount address derived mathematically.

```motoko
func subaccountHash(user : Principal, nftId : Nat) : Blob {
    // Combine User ID and NFT ID
    let combinedText = Principal.toText(user) # "-" # Nat.toText(nftId);
    // Hash it to get a unique 32-byte identifier
    return Text.hash(combinedText);
};
```

**The Bidding Steps:**
1.  **New Bidder** (`User B`) bids 500 DAMN.
2.  **Lock Funds**: The system transfers 500 DAMN from `User B (Main)` -> `User B (Subaccount for NFT #123)`.
    *   *Note*: The funds are still technically "owned" by User B's principal, but they are in a specific "slot" that only the Marketplace can control.
3.  **Refund Previous**:
    *   If `User A` was the previous highest bidder (with 400 DAMN locked), the system detects this.
    *   It transfers 400 DAMN from `User A (Subaccount for NFT #123)` -> `User A (Main)`.
    *   This ensures the loser gets their money back instantly.

### Phase C: Finalizing the Auction

Once the time expires, the `finalizeAuction` function is called (by the seller or winner).

1.  **Validation**: Checks if `Time.now() > auction.endTime`.
2.  **Payout**:
    *   The funds are sitting in the **Winner's Subaccount**.
    *   The system transfers `HighestBid` from **Winner (Subaccount)** -> **Seller (Main)**.
3.  **Commission**:
    *   The system transfers 2.5% from **Seller (Main)** -> **Treasury**.
4.  **Asset Transfer**:
    *   The NFT ownership is updated to the Winner.

---

## 6. Technical Appendix: The Bank Ledger

The `DBank` canister is the financial backbone. It implements a simplified version of the **ICRC-1 Token Standard**.

### The "Privileged" Transfer
Standard token transfers require a two-step `approve` + `transferFrom` process. To make the Tulips UX smooth (no popups for every tiny fee), we implemented a "Compatible" transfer function that trusts the Marketplace.

```motoko
// In dbank/main.mo
public shared(msg) func icrc1_transfer_from_compat(args : ...) {
    // This function allows the caller (Marketplace) to move funds
    // from 'args.from' WITHOUT checking for an allowance.
    
    // In a production mainnet deployment, we would add:
    // if (msg.caller != MARKETPLACE_CANISTER_ID) return Error("Unauthorized");
}
```

This design choice prioritizes **User Experience** for the demo, allowing for "One-Click" minting and bidding.

---
---
## 🚧 Current Limitations
- NFT media storage on-chain can increase canister size; future versions may include hybrid IPFS links.  
- Bidding/auction logic exists only in the frontend UI; backend integration is pending.  
- No royalty mechanism is implemented yet.  
- The system uses mock “token balances” in the Bank canister — real token integration would require DIP20/ICP token compatibility.

---

## 🔮 Future Enhancements
- Implement full auction and bidding logic in Motoko with automatic bid tracking and closure.  
- Introduce royalty sharing for creators.  
- Optimize NFT storage by introducing compression or hybrid off-chain storage.  
- Add search, filters, and transaction history on the frontend.  
- Expand Bank canister to integrate with actual token standards (DIP20 or ICP).

---
---

## 7. Installation & Deployment

To run this entire ecosystem locally on your machine:

### Prerequisites
*   **Node.js** (v18+)
*   **DFX SDK** (The Internet Computer SDK)

### Step 1: Start the Local Blockchain
Open a terminal and start the local replica in the background.
```bash
dfx start --clean --background
```

### Step 2: Deploy the Canisters
This command compiles the Motoko backend and the React frontend, generates the Candid interfaces, and installs them on the local replica.
```bash
dfx deploy
```

### Step 3: Launch the Frontend
While `dfx deploy` uploads a static build, for development (hot-reloading), run the Vite server:
```bash
cd src/Tulips_frontend
npm install
npm run dev
```

### Step 4: Testing the Flow
1.  Open `localhost:5173` (or the URL provided).
2.  **Login** with Internet Identity.
3.  **Claim Tokens** via the Navbar button.
4.  **Mint** an NFT (upload any image).
5.  **List** it for sale.
6.  Open an **Incognito Window**, create a *second* account, claim tokens, and **Buy** the NFT.

---

**Author**: Krishna Satyam
**License**: MIT
**Status**: Educational / Demo
