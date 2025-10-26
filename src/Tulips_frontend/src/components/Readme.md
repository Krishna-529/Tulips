# Tulips — NFT Marketplace on Internet Computer

Tulips is a decentralized NFT Marketplace built on the **Internet Computer (IC)** using **Motoko** canisters for backend logic and a **React frontend** for user interaction.  
It allows users to mint, own, list, and purchase NFTs — all managed directly on-chain without depending on external storage or third-party APIs.

All NFT images and metadata are stored **entirely on-chain**, providing a fully decentralized and tamper-proof representation of ownership and content.

---

## 🌐 Project Overview

Tulips demonstrates how a complete NFT trading platform can be implemented natively on the Internet Computer.  
The system is composed of two core canisters:

1. **Marketplace Canister** — manages NFT creation, ownership, metadata, and trade actions (minting, listing, buying, and removing from sale).  
2. **Bank (dBank) Canister** — functions as an internal ledger that securely handles all currency movements such as deposits, withdrawals, and NFT transaction payments.

The frontend, written in React, interacts directly with these canisters through agent calls and provides a clean, minimal, dark-themed interface for performing all actions.

---

## ⚙️ Core Features

### 🪙 1. NFT Minting
- Users can mint NFTs by uploading an image and providing metadata (name and description).  
- The image file is converted to binary (`Blob`) format and stored **directly on-chain** in the Marketplace canister.  
- Each NFT is given a **unique ID**, typically derived from a hashed or incremented counter, ensuring that no two NFTs overlap.  
- Ownership of the newly minted NFT is automatically assigned to the minting user’s **Principal**.  
- A minting fee is deducted from the user’s account in the **Bank canister** before the minting succeeds.

### 🏪 2. Listing and Buying NFTs
- NFT owners can **list** their tokens for sale by specifying a price.  
- When an NFT is listed, it is marked as “for sale” within the canister’s data.  
- Other users can then **buy** the NFT directly by paying the listed price.  
- The Bank canister ensures that the payment transfer is successful before ownership is updated in the Marketplace.  
- Once purchased, the NFT’s ownership moves from the seller’s Principal to the buyer’s Principal.  
- NFTs that are listed appear **blurred or semi-transparent** under the “My NFTs” section, indicating they are not currently transferable by the owner.

### 🏦 3. Bank (dBank) System
- The dBank canister maintains an internal ledger mapping each user’s **Principal → Balance (Nat)**.  
- Users can deposit and withdraw tokens, which are then reflected in their on-chain balance.  
- During NFT minting or purchasing:
  - Minting fees are deducted from the creator’s balance.
  - Purchase payments are securely transferred between buyer and seller balances.
- The dBank canister ensures that all financial actions are **atomic** with respect to NFT ownership changes — preventing partial updates.

### 💬 4. User Authentication
- Authentication and user identification are handled via **Internet Identity**.  
- Each authenticated user is mapped to their unique Principal, which serves as both their account identifier and NFT owner key.  
- All state changes, balances, and NFT actions are tied directly to this Principal.

### ⏳ 5. Bidding (UI Only)
- A **bidding/auction interface** is scaffolded in the frontend but **not yet implemented in backend logic**.  
- The UI allows users to view “Put for Auction” and “Place Bid” options with modals, placeholders, and future integration points.  
- These components are designed for eventual extension into a timed bidding mechanism, but the current system operates purely as a direct sale marketplace.

---

## 💡 Implementation Logic

### Marketplace Canister (Motoko)
- Maintains mappings of NFT IDs to their full metadata, image blob, and ownership record.  
- Provides functions:
  - `mintNFT(owner, name, description, image)`  
  - `getMyNFTs(principal)`  
  - `listNFT(id, price)`  
  - `buyNFT(id)`  
  - `transferOwnership(id, newOwner)`  
  - `getAllListedNFTs()`
- Verifies ownership before allowing listing or transfers.  
- Handles state updates atomically to maintain consistency across minting and purchasing.

### Bank Canister (Motoko)
- Keeps a balance ledger for each user Principal.  
- Provides methods:
  - `deposit()`
  - `withdraw(amount)`
  - `transfer(from, to, amount)`
  - `deductMintFee(principal, fee)`
- Called internally by Marketplace functions to process payments during mint and sale operations.  
- Prevents unauthorized balance changes by validating caller Principal.

### Frontend (React)
- Built using **React + DFX agent calls** to interact with deployed canisters.  
- Provides three major pages:
  - **Mint NFT** — Form for minting with image upload and metadata entry.  
  - **Marketplace** — Displays all NFTs listed for sale with “Buy” buttons.  
  - **My NFTs** — Displays owned NFTs, indicating which ones are listed.  
- The UI uses a **dark theme** for a professional marketplace look and includes modals for key actions (minting, listing, buying, and bidding placeholders).

---

## 🧠 Technical Insights

- **On-Chain Storage:** Storing image blobs directly in the canister state ensures full decentralization but requires careful memory management due to size constraints.  
- **Ownership Verification:** Every listing and transfer action validates `msg.caller == nft.owner` before proceeding.  
- **Atomic Operations:** Payment and ownership transfer are designed to occur together — if one fails, both revert.  
- **Cycle Efficiency:** Storing and retrieving image blobs are the most cycle-intensive operations; optimization and compression may be added later.  
- **Security Measures:** All actions are scoped to authenticated principals; no user can list or transfer NFTs they don’t own.

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

## 📬 Maintainer
**Krishna Satyam**  
For suggestions or improvements, please open an issue in the repository.
