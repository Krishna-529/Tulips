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
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Dbank "canister:dbank";
import Nat32 "mo:base/Nat32";


actor Marketplace {
  public type NFT = {
    id : Nat;
    owner : Principal;
    name : Text;
    image : Text;
    price : Nat;
    forSale : Bool;
  };

  public type Metadata = {
    name : Text;
    image : Text;        // base64-encoded PNG/JPEG
    desiredPrice : Nat;
  };

  public type TransferResult = {
    #Ok : Nat;
    #Err : Text;
  };

  stable var nextNFTId : Nat = 0;

  let hashTuple = func(k: (Principal, Nat)): Hash.Hash {
      let txt = Principal.toText(k.0) # Nat.toText(k.1);
      return Text.hash(txt);
  };

  let equalTuple = func(k1: (Principal, Nat), k2: (Principal, Nat)): Bool {
      return k1.0 == k2.0 and k1.1 == k2.1;
  };
  stable var stableFreezes : [((Principal, Nat), Nat)] = [];
  var freezes : HashMap.HashMap<(Principal, Nat), Nat> = 
    HashMap.HashMap<(Principal, Nat), Nat>(10, equalTuple, hashTuple);


  system func preupgrade() {
    stableFreezes := Iter.toArray(freezes.entries());    
    stableNFTs := Iter.toArray(nfts.entries());
    // stableFreezes := Iter.toArray(freezes.entries());
  };

  system func postupgrade() {
    freezes := HashMap.HashMap<(Principal, Nat), Nat>(0, equalTuple, hashTuple);
    for ((key, amount) in stableFreezes.vals()) {
        freezes.put(key, amount);
    };
    nfts := HashMap.HashMap<Nat, NFT>(0, Nat.equal, func(n : Nat) : Hash.Hash { Text.hash(Nat.toText(n)) });
    for ((id, nft) in stableNFTs.vals()) {
        nfts.put(id, nft);
    };
  };

  stable var stableNFTs : [(Nat, NFT)] = [];
  var nfts : HashMap.HashMap<Nat, NFT> = HashMap.HashMap<Nat, NFT>(
    0,                      // initial capacity
    Nat.equal,              // key equality function
    func(n: Nat) : Hash.Hash { Text.hash(Nat.toText(n)) } // key hash function
  );

  public shared(msg) func mintNFT(meta : Metadata) : async Text {
    let rnd = await Random.blob();
    let r = Nat8.toNat(Blob.toArray(rnd)[0]) % 21;
    let feePercent = 40 + r; // 40–60%

    let mintFee = (meta.desiredPrice * feePercent) / 100;
    let finalPrice = meta.desiredPrice;

    let transferResult = await Dbank.icrc1_transfer_from_compat({
        from_subaccount = null;
        from = msg.caller;
        to = Principal.fromActor(Dbank);  
        amount = mintFee;
        fee = null;
        memo = null;
        created_at_time = null;
    });

    switch (transferResult.error) {
      case (?errText) {
        return "Mint failed: " # errText;
      };
      case null {
        // Hash based on nextNFTId and caller to get a unique NFT ID
        let idHash : Nat32 = Text.hash(Principal.toText(msg.caller) # "-" # Nat.toText(nextNFTId));
        let nftId : Nat = Nat32.toNat(idHash);
        let nft : NFT = {
          id = nftId;
          owner = msg.caller;
          name = meta.name;
          image = meta.image;
          price = finalPrice;
          forSale = false;
        };

        nfts.put(nextNFTId, nft);
        nextNFTId += 1;

        return "NFT minted with ID " # Nat.toText(nft.id) #
                " at price " # Nat.toText(nft.price) #
                " (Fee deducted: " # Nat.toText(mintFee) # ")";
      };
    };
  };

  //Bidding Protocol
  let IC : actor {
    sha256_hash : shared (data : Blob) -> async Blob;
  } = actor ("aaaaa-aa");

  public func subaccountHash(user : Principal, nftId : Nat) : async Blob {
    let input : Blob = Text.encodeUtf8(Principal.toText(user) # "-" # Nat.toText(nftId));
    let digest : Blob = await IC.sha256_hash(input);
    return digest; // 32-byte Blob
  };

  public shared(msg) func transferOwnership(to : Principal, nftId : Nat) : async Text {
      switch (nfts.get(nftId)) {
          case (?nft) {
              let updatedNFT : NFT = {
                  id = nft.id;
                  owner = to;
                  name = nft.name;
                  image = nft.image;
                  price = nft.price;
                  forSale = false; // remove from sale
              };
              nfts.put(nftId, updatedNFT);
              return "NFT " # Nat.toText(nftId) # " ownership transferred to " # Principal.toText(to) # " and removed from sale";
          };
          case null {
              return "Transfer failed: NFT does not exist";
          };
      };
  };


  public shared(msg) func getAllNFTs() : async [NFT] {
    var all : [NFT] = [];
    for ((_, nft) in nfts.entries()) {
      all := Array.append<NFT>(all, [nft]);
    };
    return all;
  };

  public shared(msg) func getMyNFTs() : async [NFT] {
    var owned : [NFT] = [];
    for ((_, nft) in nfts.entries()) {
      if (nft.owner == msg.caller) {
        owned := Array.append<NFT>(owned, [nft]);
      };
    };
    return owned;
  };


};



  // // ---------------- Bidding ----------------
  // public shared(msg) func placeBid(nftId : Nat, bidAmount : Nat) : async Text {
  //   switch (nfts.get(nftId)) {
  //     // Added a colon to the 'case' statement.
  //     case null {return "NFT does not exist"};
  //     case (?nft) {
  //       if (not nft.forSale) return "NFT not for sale";

  //       // Bid must be <= 220% of current price
  //       if (bidAmount > (nft.price * 220) / 100) {
  //         return "Bid too high (must be <= 220% of current price)";
  //       };

  //       // Bid must be >= current price * 105% (min +5%)
  //       if (bidAmount < (nft.price * 105) / 100) {
  //         return "Bid too low (must be at least +5% of current price)";
  //       };

  //       // Check user balance
  //       let bal = await dBank.icrc1_balance_of({ owner = msg.caller; subaccount = null });
  //       if (bal < bidAmount) return "Insufficient balance";

  //       // Release previous freeze if exists
  //       // Corrected the 'for' loop syntax for iterating over map entries.
  //       for ((key, amount) in freezes.entries()) {
  //         if (key.1 == nftId) { // same NFT
  //           if (key.0 != msg.caller) {
  //             // The correct method to remove an entry is 'remove', not 'delete'.
  //             ignore freezes.remove(key);
  //           };
  //         };
  //       };

  //       // Freeze new bidder
  //       freezes.put((msg.caller, nftId), bidAmount);

  //       // Update NFT price (highest bid so far)
  //       let updatedNFT = { nft with price = bidAmount };
  //       nfts.put(nftId, updatedNFT);

  //       return "Bid placed successfully with freeze of " # Nat.toText(bidAmount);
  //     };
  //   };
  // };

  // // ---------------- Transfer (Finalize Sale) ----------------
  // public shared(msg) func finalizeSale(nftId : Nat) : async Text {
  //   switch (nfts.get(nftId)) {
  //     // Added a colon to the 'case' statement.
  //     case null { "NFT does not exist" };
  //     case (?nft) {
  //       if (not nft.forSale) return "NFT not for sale";

  //       // Find winner
  //       var winner : ?Principal = null;
  //       var winAmount : Nat = 0;
  //       // Corrected the 'for' loop syntax.
  //       for ((key, amount) in freezes.entries()) {
  //         // Replaced 'and' with the correct logical operator '&&'.
  //         if (key.1 == nftId and amount > winAmount) {
  //           winner := ?key.0;
  //           winAmount := amount;
  //         };
  //       };

  //       switch (winner) {
  //         // Added a colon to the 'case' statement.
  //         case null {return "No bids to finalize"};
  //         case (?buyer) {
  //           if (buyer == nft.owner) return "Owner cannot buy own NFT";

  //           // Calculate 5% profit cut
  //           let profit = if (winAmount > nft.price) { winAmount - nft.price } else { 0 };
  //           let fee = (profit * 5) / 100;
  //           let sellerReceives = winAmount - fee;

  //           // Transfer to seller
  //           // Used 'let _ = await' to correctly ignore the async result.
  //           let _ = await dBank.icrc1_transfer({
  //             from_subaccount = null;
  //             to = { owner = nft.owner; subaccount = null };
  //             amount = sellerReceives;
  //             fee = null;
  //             memo = null;
  //             created_at_time = null;
  //           });

  //           // Transfer fee to bank (owner=bank principal)
  //           if (fee > 0) {
  //             // Used a principal literal, which is safer than 'fromText'.
  //             let _ = await dBank.icrc1_transfer({
  //               from_subaccount = null;
  //               to = { owner = dBankId; subaccount = null };
  //               amount = fee;
  //               fee = null;
  //               memo = null;
  //               created_at_time = null;
  //             });
  //           };

  //           // Release all freezes for this NFT
  //           // Corrected the 'for' loop syntax.
  //           for ((key, _) in freezes.entries()) {
  //             if (key.1 == nftId) {
  //               // The correct method is 'remove', not 'delete'.
  //               ignore freezes.remove(key);
  //             };
  //           };

  //           // Transfer ownership
  //           let updatedNFT = { nft with owner = buyer; forSale = false };
  //           nfts.put(nftId, updatedNFT);

  //           // Removed the erroneous semicolon at the end of the return statement.
  //           return "NFT " # Nat.toText(nftId) # " sold to " # Principal.toText(buyer) #
  //                  " for " # Nat.toText(winAmount) #
  //                  ". Seller received " # Nat.toText(sellerReceives) #
  //                  ", Fee sent: " # Nat.toText(fee)
  //         };
  //       };
  //     };
  //   };
  // };

  // // ---------------- Utility ----------------
  // public query func getNFT(nftId : Nat) : async ?NFT {
  //   nfts.get(nftId)
  // };

  // public query func getAllNFTs() : async [NFT] {
  //   Iter.toArray(nfts.vals())
  // };

