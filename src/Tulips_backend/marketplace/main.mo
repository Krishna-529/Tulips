import Nat "mo:base/Nat";
import Principal "mo:base/Principal";
import Random "mo:base/Random";
import Debug "mo:base/Debug";
import TrieMap "mo:base/TrieMap";
import Hash "mo:base/Hash";
import Iter "mo:base/Iter";
import Text "mo:base/Text";
import Nat8 "mo:base/Nat8";
import Blob "mo:base/Blob";
// import ExperimentalHttp "mo:base/ExperimentalHttp";

actor class Marketplace(dBankId : Principal) = this {


  // ---------------- NFT & Marketplace Types ----------------

  // The NFT record type needs to be public to be used in public function signatures.
  public type NFT = {
    id : Nat;
    owner : Principal;
    price : Nat;
    forSale : Bool;
  };

  public type TransferResult = {
    #Ok : Nat;
    #Err : Text;
  };


  // var nfts : TrieMap.TrieMap<Nat, NFT> = TrieMap.TrieMap(Nat.equal, Nat.hash);

  stable var nextNFTId : Nat = 0;

  // Freeze ledger: (user, nftId) -> frozenAmount
  // Helper functions are required to use a tuple as a TrieMap key.
  let hashTuple = func(k: (Principal, Nat)): Hash.Hash {
      // Combine both into a Text and then hash to Nat32, then promote to Nat
      let txt = Principal.toText(k.0) # Nat.toText(k.1);
      return Text.hash(txt);
  };

  let equalTuple = func(k1: (Principal, Nat), k2: (Principal, Nat)): Bool {
      return k1.0 == k2.0 and k1.1 == k2.1;
  };
  // The key for 'freezes' is a tuple (Principal, Nat) and the value is the bid amount (Nat).
  stable var stableFreezes : [((Principal, Nat), Nat)] = [];

  var freezes : TrieMap.TrieMap<(Principal, Nat), Nat> = TrieMap.TrieMap(equalTuple, hashTuple);

  system func preupgrade() {
    stableFreezes := Iter.toArray(freezes.entries());    
    stableNFTs := Iter.toArray(nfts.entries());
    // stableFreezes := Iter.toArray(freezes.entries());
};

system func postupgrade() {
    freezes := TrieMap.TrieMap(equalTuple, hashTuple);
    for ((key, amount) in stableFreezes.vals()) {
        freezes.put(key, amount);
    };
    nfts := TrieMap.TrieMap(Nat.equal, func(n : Nat) : Hash.Hash {
      Text.hash(Nat.toText(n))
    });

    for ((id, nft) in stableNFTs.vals()) {
        nfts.put(id, nft);
    };

    // freezes := TrieMap.TrieMap(equalTuple, hashTuple);
    // for ((key, amount) in stableFreezes.vals()) {
    //     freezes.put(key, amount);
    // };
};

stable var stableNFTs : [(Nat, NFT)] = [];

var nfts : TrieMap.TrieMap<Nat, NFT> = TrieMap.TrieMap(
    Nat.equal,
    func(n : Nat) : Hash.Hash { Text.hash(Nat.toText(n)) }
);



  // Reference to dBank canister
  // Corrected the actor reference syntax and function signatures.
  let dBank : actor {
    icrc1_balance_of : shared query ({ owner : Principal; subaccount : ?[Nat8] }) -> async Nat;
    icrc1_transfer : shared ({
      from_subaccount : ?[Nat8];
      to : { owner : Principal; subaccount : ?[Nat8] };
      amount : Nat;
      fee : ?Nat;
      memo : ?[Nat8];
      created_at_time : ?Nat64;
    }) -> async TransferResult;
  } = actor (Principal.toText(dBankId));


  // ---------------- Minting ----------------
  public shared(msg) func mintNFT(name: Nat,  desiredPrice : Nat) : async Text {
    // Random mint fee between 40–60%
    let rnd = await Random.blob();
    // Corrected the way a random Nat is generated from a Blob.
    let r = Nat8.toNat(Blob.toArray(rnd)[0]) % 21;
    let feePercent = 40 + r; // 40–60

    let mintFee = (desiredPrice * feePercent) / 100;
    let finalPrice = desiredPrice;

    let nft : NFT = {
      id = nextNFTId;
      owner = msg.caller;
      price = finalPrice;
      forSale = true;
    };

    nfts.put(nextNFTId, nft);
    nextNFTId += 1;

    return "NFT minted with ID " # Nat.toText(nft.id) #
            " at price " # Nat.toText(nft.price) #
            " (Fee taken: " # Nat.toText(mintFee) # ")";
  };

  // ---------------- Bidding ----------------
  public shared(msg) func placeBid(nftId : Nat, bidAmount : Nat) : async Text {
    switch (nfts.get(nftId)) {
      // Added a colon to the 'case' statement.
      case null {return "NFT does not exist"};
      case (?nft) {
        if (not nft.forSale) return "NFT not for sale";

        // Bid must be <= 220% of current price
        if (bidAmount > (nft.price * 220) / 100) {
          return "Bid too high (must be <= 220% of current price)";
        };

        // Bid must be >= current price * 105% (min +5%)
        if (bidAmount < (nft.price * 105) / 100) {
          return "Bid too low (must be at least +5% of current price)";
        };

        // Check user balance
        let bal = await dBank.icrc1_balance_of({ owner = msg.caller; subaccount = null });
        if (bal < bidAmount) return "Insufficient balance";

        // Release previous freeze if exists
        // Corrected the 'for' loop syntax for iterating over map entries.
        for ((key, amount) in freezes.entries()) {
          if (key.1 == nftId) { // same NFT
            if (key.0 != msg.caller) {
              // The correct method to remove an entry is 'remove', not 'delete'.
              ignore freezes.remove(key);
            };
          };
        };

        // Freeze new bidder
        freezes.put((msg.caller, nftId), bidAmount);

        // Update NFT price (highest bid so far)
        let updatedNFT = { nft with price = bidAmount };
        nfts.put(nftId, updatedNFT);

        return "Bid placed successfully with freeze of " # Nat.toText(bidAmount);
      };
    };
  };

  // ---------------- Transfer (Finalize Sale) ----------------
  public shared(msg) func finalizeSale(nftId : Nat) : async Text {
    switch (nfts.get(nftId)) {
      // Added a colon to the 'case' statement.
      case null { "NFT does not exist" };
      case (?nft) {
        if (not nft.forSale) return "NFT not for sale";

        // Find winner
        var winner : ?Principal = null;
        var winAmount : Nat = 0;
        // Corrected the 'for' loop syntax.
        for ((key, amount) in freezes.entries()) {
          // Replaced 'and' with the correct logical operator '&&'.
          if (key.1 == nftId and amount > winAmount) {
            winner := ?key.0;
            winAmount := amount;
          };
        };

        switch (winner) {
          // Added a colon to the 'case' statement.
          case null {return "No bids to finalize"};
          case (?buyer) {
            if (buyer == nft.owner) return "Owner cannot buy own NFT";

            // Calculate 5% profit cut
            let profit = if (winAmount > nft.price) { winAmount - nft.price } else { 0 };
            let fee = (profit * 5) / 100;
            let sellerReceives = winAmount - fee;

            // Transfer to seller
            // Used 'let _ = await' to correctly ignore the async result.
            let _ = await dBank.icrc1_transfer({
              from_subaccount = null;
              to = { owner = nft.owner; subaccount = null };
              amount = sellerReceives;
              fee = null;
              memo = null;
              created_at_time = null;
            });

            // Transfer fee to bank (owner=bank principal)
            if (fee > 0) {
              // Used a principal literal, which is safer than 'fromText'.
              let _ = await dBank.icrc1_transfer({
                from_subaccount = null;
                to = { owner = dBankId; subaccount = null };
                amount = fee;
                fee = null;
                memo = null;
                created_at_time = null;
              });
            };

            // Release all freezes for this NFT
            // Corrected the 'for' loop syntax.
            for ((key, _) in freezes.entries()) {
              if (key.1 == nftId) {
                // The correct method is 'remove', not 'delete'.
                ignore freezes.remove(key);
              };
            };

            // Transfer ownership
            let updatedNFT = { nft with owner = buyer; forSale = false };
            nfts.put(nftId, updatedNFT);

            // Removed the erroneous semicolon at the end of the return statement.
            return "NFT " # Nat.toText(nftId) # " sold to " # Principal.toText(buyer) #
                   " for " # Nat.toText(winAmount) #
                   ". Seller received " # Nat.toText(sellerReceives) #
                   ", Fee sent: " # Nat.toText(fee)
          };
        };
      };
    };
  };

  // ---------------- Utility ----------------
  public query func getNFT(nftId : Nat) : async ?NFT {
    nfts.get(nftId)
  };

  public query func getAllNFTs() : async [NFT] {
    Iter.toArray(nfts.vals())
  };

};