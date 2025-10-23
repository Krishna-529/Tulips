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
import Time "mo:base/Time";
import Nat32 "mo:base/Nat32";
import Nat64 "mo:base/Nat64";

actor Marketplace {

  public type NFT = {
    id : Nat;
    owner : Principal;
    name : Text;
    image : Text;
    price : Nat;
    status : Text;
  };

  public type Metadata = {
    name : Text;
    image : Text;
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

  // ✅ Stable storage for NFTs
  stable var stableNFTs : [(Nat, NFT)] = [];
  var nfts : HashMap.HashMap<Nat, NFT> = HashMap.HashMap<Nat, NFT>(
    0, Nat.equal, func(n: Nat): Hash.Hash { Text.hash(Nat.toText(n)) }
  );

  // ✅ New HashMaps for sales and auctions
  stable var stableSales : [(Nat, Nat)] = []; // nftId → price
  var sales : HashMap.HashMap<Nat, Nat> = HashMap.HashMap<Nat, Nat>(
    0, Nat.equal, func(n: Nat): Hash.Hash { Text.hash(Nat.toText(n)) }
  );

  public type AuctionInfo = {
    seller : Principal;
    highestBid : Nat;
    highestBidder : ?Principal;
    startPrice : Nat;
    endTime : Nat;
  };

  stable var stableAuctions : [(Nat, AuctionInfo)] = [];
  var auctions : HashMap.HashMap<Nat, AuctionInfo> = HashMap.HashMap<Nat, AuctionInfo>(
    0, Nat.equal, func(n: Nat): Hash.Hash { Text.hash(Nat.toText(n)) }
  );

  system func preupgrade() {
    stableFreezes := Iter.toArray(freezes.entries());    
    stableNFTs := Iter.toArray(nfts.entries());
    stableSales := Iter.toArray(sales.entries());
    stableAuctions := Iter.toArray(auctions.entries());
  };

  system func postupgrade() {
    freezes := HashMap.HashMap<(Principal, Nat), Nat>(0, equalTuple, hashTuple);
    for ((key, amount) in stableFreezes.vals()) {
      freezes.put(key, amount);
    };

    nfts := HashMap.HashMap<Nat, NFT>(
        0,
        Nat.equal,
        func(n: Nat): Hash.Hash { Text.hash(Nat.toText(n)) }
    );
    for ((id, nft) in stableNFTs.vals()) {
      nfts.put(id, nft);
    };

    sales := HashMap.HashMap<Nat, Nat>(
        0,
        Nat.equal,
        func(n: Nat): Hash.Hash { Text.hash(Nat.toText(n)) }
    );
    for ((id, price) in stableSales.vals()) {
      sales.put(id, price);
    };

    auctions := HashMap.HashMap<Nat, AuctionInfo>(
        0,
        Nat.equal,
        func(n: Nat): Hash.Hash { Text.hash(Nat.toText(n)) }
    );
    for ((id, auc) in stableAuctions.vals()) {
      auctions.put(id, auc);
    };
  };

  // ---------------- EXISTING FUNCTIONS ---------------- //

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
      case (?errText) { return "Mint failed: " # errText };
      case null {
        let nftId : Nat = nextNFTId;
        let nft : NFT = {
          id = nftId;
          owner = msg.caller;
          name = meta.name;
          image = meta.image;
          price = finalPrice;
          status = "Owned";
        };
        nfts.put(nftId, nft);
        nextNFTId += 1;
        return "NFT minted with ID " # Nat.toText(nft.id) #
               " at price " # Nat.toText(nft.price) #
               " (Fee deducted: " # Nat.toText(mintFee) # ")";
      };
    };
  };

  let IC : actor {
    sha256_hash : shared (data : Blob) -> async Blob;
  } = actor ("aaaaa-aa");

  public func subaccountHash(user : Principal, nftId : Nat) : async Blob {
    let input : Blob = Text.encodeUtf8(Principal.toText(user) # "-" # Nat.toText(nftId));
    let digest : Blob = await IC.sha256_hash(input);
    return digest;
  };

  public shared(msg) func transferOwnership(to : Principal, nftId : Nat) : async Text {
    switch (nfts.get(nftId)) {
      case (?nft) {
        let updatedNFT : NFT = { nft with owner = to; status = "Owned" };
        nfts.put(nftId, updatedNFT);
        return "NFT " # Nat.toText(nftId) # " ownership transferred to " # Principal.toText(to);
      };
      case null { return "Transfer failed: NFT does not exist" };
    };
  };

  public shared(msg) func getAllNFTs() : async [NFT] {
    var all : [NFT] = [];
    for ((_, nft) in nfts.entries()) { all := Array.append<NFT>(all, [nft]); };
    return all;
  };

  public shared(msg) func getMyNFTs() : async [NFT] {
    var owned : [NFT] = [];
    for ((_, nft) in nfts.entries()) {
      if (nft.owner == msg.caller) { owned := Array.append<NFT>(owned, [nft]); };
    };
    return owned;
  };

  // ---------------- NEW FUNCTIONS ---------------- //

  public query func getNFT(id : Nat) : async ?NFT {
    return nfts.get(id);
  };

  public shared(msg) func listForSale(nftId : Nat, price : Nat) : async Text {
    switch (nfts.get(nftId)) {
      case (?nft) {
        if (nft.owner != msg.caller) return "Error: Only owner can list";
        let updated = { nft with price = price; status = "isOnSale" };
        nfts.put(nftId, updated);
        sales.put(nftId, price);
        return "NFT listed for sale at " # Nat.toText(price);
      };
      case null { return "Error: NFT not found" };
    };
  };

  public shared(msg) func withdrawNFT(nftId : Nat) : async Text {
    switch (nfts.get(nftId)) {
      case (?nft) {
        if (nft.owner != msg.caller) return "Error: Only owner can withdraw";
        sales.delete(nftId);
        let updated = { nft with status = "Owned" };
        nfts.put(nftId, updated);
        return "NFT withdrawn from sale";
      };
      case null { return "Error: NFT not found" };
    };
  };

  public shared(msg) func listForAuction(nftId : Nat, startingPrice : Nat, duration : Nat) : async Text {
    switch (nfts.get(nftId)) {
      case (?nft) {
        if (nft.owner != msg.caller) return "Error: Only owner can auction";
        let now = Nat64.toNat(Nat64.fromIntWrap(Time.now()));
        let auction : AuctionInfo = {
          seller = msg.caller;
          highestBid = startingPrice;
          highestBidder = null;
          startPrice = startingPrice;
          endTime = now + duration;
        };
        auctions.put(nftId, auction);
        let updated = { nft with status = "isOnBid"; price = startingPrice };
        nfts.put(nftId, updated);
        return "NFT listed for auction at " # Nat.toText(startingPrice);
      };
      case null { return "Error: NFT not found" };
    };
  };

  public shared(msg) func placeBid(nftId : Nat, bidAmount : Nat) : async Text {
    switch (auctions.get(nftId)) {
      case (?auc) {
        let now = Nat64.toNat(Nat64.fromIntWrap(Time.now()));
        if (now > auc.endTime) return "Error: Auction ended";
        if (bidAmount <= auc.highestBid) return "Error: Bid too low";
        let updated = { auc with highestBid = bidAmount; highestBidder = ?msg.caller };
        auctions.put(nftId, updated);
        return "Bid of " # Nat.toText(bidAmount) # " placed on NFT " # Nat.toText(nftId);
      };
      case null { return "Error: No active auction" };
    };
  };

  public shared(msg) func finalizeSale(nftId : Nat) : async Text {
    switch (auctions.get(nftId)) {
      case (?auc) {
        let now = Nat64.toNat(Nat64.fromIntWrap(Time.now()));
        if (now < auc.endTime) return "Error: Auction still active";
        switch (auc.highestBidder) {
          case (?buyer) {
            let transferText = await transferOwnership(buyer, nftId);
            auctions.delete(nftId);
            return "Auction finalized. " # transferText;
          };
          case null {
            auctions.delete(nftId);
            return "No bids placed; auction closed.";
          };
        };
      };
      case null {
        switch (sales.get(nftId)) {
          case (?price) {
            sales.delete(nftId);
            return "Fixed sale finalized for NFT " # Nat.toText(nftId);
          };
          case null { return "Error: No active sale/auction" };
        };
      };
    };
  };
};



// import Nat "mo:base/Nat";
// import Principal "mo:base/Principal";
// import Random "mo:base/Random";
// import Debug "mo:base/Debug";
// import TrieMap "mo:base/TrieMap";
// import Hash "mo:base/Hash";
// import Iter "mo:base/Iter";
// import Text "mo:base/Text";
// import Nat8 "mo:base/Nat8";
// import Blob "mo:base/Blob";
// import HashMap "mo:base/HashMap";
// import Array "mo:base/Array";
// import Dbank "canister:dbank";
// import Time "mo:base/Time";
// import Nat32 "mo:base/Nat32";
// import Nat64 "mo:base/Nat64";

// actor Marketplace {

//   public type NFT = {
//     id : Nat;
//     owner : Principal;
//     name : Text;
//     image : Text;
//     price : Nat;
//     status : Text;
//   };

//   public type Metadata = {
//     name : Text;
//     image : Text;
//     desiredPrice : Nat;
//   };

//   public type TransferResult = {
//     #Ok : Nat;
//     #Err : Text;
//   };

//   stable var nextNFTId : Nat = 0;

//   let hashTuple = func(k: (Principal, Nat)): Hash.Hash {
//     let txt = Principal.toText(k.0) # Nat.toText(k.1);
//     return Text.hash(txt);
//   };

//   let equalTuple = func(k1: (Principal, Nat), k2: (Principal, Nat)): Bool {
//     return k1.0 == k2.0 and k1.1 == k2.1;
//   };

//   stable var stableFreezes : [((Principal, Nat), Nat)] = [];
//   var freezes : HashMap.HashMap<(Principal, Nat), Nat> = 
//     HashMap.HashMap<(Principal, Nat), Nat>(10, equalTuple, hashTuple);

//   // ✅ Stable storage for NFTs
//   stable var stableNFTs : [(Nat, NFT)] = [];
//   var nfts : HashMap.HashMap<Nat, NFT> = HashMap.HashMap<Nat, NFT>(
//     0, Nat.equal, func(n: Nat): Hash.Hash { n } // use identity, because nftId is already hashed
//   );

//   // ✅ New HashMaps for sales and auctions
//   stable var stableSales : [(Nat, Nat)] = []; // nftId → price
//   var sales : HashMap.HashMap<Nat, Nat> = HashMap.HashMap<Nat, Nat>(
//     0, Nat.equal, func(n: Nat): Hash.Hash { n }
//   );

//   public type AuctionInfo = {
//     seller : Principal;
//     highestBid : Nat;
//     highestBidder : ?Principal;
//     startPrice : Nat;
//     endTime : Nat;
//   };

//   stable var stableAuctions : [(Nat, AuctionInfo)] = [];
//     var auctions : HashMap.HashMap<Nat, AuctionInfo> = HashMap.HashMap<Nat, AuctionInfo>(
//     0, Nat.equal, func(n: Nat): Hash.Hash { n }
//   );

//   system func preupgrade() {
//     stableFreezes := Iter.toArray(freezes.entries());    
//     stableNFTs := Iter.toArray(nfts.entries());
//     stableSales := Iter.toArray(sales.entries());
//     stableAuctions := Iter.toArray(auctions.entries());
//   };

//   system func postupgrade() {
//     freezes := HashMap.HashMap<(Principal, Nat), Nat>(0, equalTuple, hashTuple);
//     for ((key, amount) in stableFreezes.vals()) {
//       freezes.put(key, amount);
//     };

//     nfts := HashMap.HashMap<Nat, NFT>(0, Nat.equal, func(n : Nat): Hash.Hash { Text.hash(Nat.toText(n)) });
//     for ((id, nft) in stableNFTs.vals()) {
//       nfts.put(id, nft);
//     };

//     sales := HashMap.HashMap<Nat, Nat>(0, Nat.equal, func(n) { Text.hash(Nat.toText(n)) });
//     for ((id, price) in stableSales.vals()) {
//       sales.put(id, price);
//     };

//     auctions := HashMap.HashMap<Nat, AuctionInfo>(0, Nat.equal, func(n) { Text.hash(Nat.toText(n)) });
//     for ((id, auc) in stableAuctions.vals()) {
//       auctions.put(id, auc);
//     };
//   };

//   // ---------------- EXISTING FUNCTIONS ---------------- //

//   public shared(msg) func mintNFT(meta : Metadata) : async Text {
//     let rnd = await Random.blob();
//     let r = Nat8.toNat(Blob.toArray(rnd)[0]) % 21;
//     let feePercent = 40 + r; // 40–60%

//     let mintFee = (meta.desiredPrice * feePercent) / 100;
//     let finalPrice = meta.desiredPrice;

//     let transferResult = await Dbank.icrc1_transfer_from_compat({
//       from_subaccount = null;
//       from = msg.caller;
//       to = Principal.fromActor(Dbank);  
//       amount = mintFee;
//       fee = null;
//       memo = null;
//       created_at_time = null;
//     });

//     switch (transferResult.error) {
//       case (?errText) { return "Mint failed: " # errText };
//       case null {
//         let idHash : Nat32 = Text.hash(Principal.toText(msg.caller) # "-" # Nat.toText(nextNFTId));
//         let nftId : Nat = Nat32.toNat(idHash);
//         let nft : NFT = {
//           id = nftId;
//           owner = msg.caller;
//           name = meta.name;
//           image = meta.image;
//           price = finalPrice;
//           status = "Owned";
//         };
//         nfts.put(nftId, nft);
//         nextNFTId += 1;
//         return "NFT minted with ID " # Nat.toText(nft.id) #
//                " at price " # Nat.toText(nft.price) #
//                " (Fee deducted: " # Nat.toText(mintFee) # ")";
//       };
//     };
//   };

//   let IC : actor {
//     sha256_hash : shared (data : Blob) -> async Blob;
//   } = actor ("aaaaa-aa");

//   public func subaccountHash(user : Principal, nftId : Nat) : async Blob {
//     let input : Blob = Text.encodeUtf8(Principal.toText(user) # "-" # Nat.toText(nftId));
//     let digest : Blob = await IC.sha256_hash(input);
//     return digest;
//   };

//   public shared(msg) func transferOwnership(to : Principal, nftId : Nat) : async Text {
//     switch (nfts.get(nftId)) {
//       case (?nft) {
//         let updatedNFT : NFT = { nft with owner = to; status = "Owned" };
//         nfts.put(nftId, updatedNFT);
//         return "NFT " # Nat.toText(nftId) # " ownership transferred to " # Principal.toText(to);
//       };
//       case null { return "Transfer failed: NFT does not exist" };
//     };
//   };

//   public shared(msg) func getAllNFTs() : async [NFT] {
//     var all : [NFT] = [];
//     for ((_, nft) in nfts.entries()) { all := Array.append<NFT>(all, [nft]); };
//     return all;
//   };

//   public shared(msg) func getMyNFTs() : async [NFT] {
//     var owned : [NFT] = [];
//     for ((_, nft) in nfts.entries()) {
//       if (nft.owner == msg.caller) { owned := Array.append<NFT>(owned, [nft]); };
//     };
//     return owned;
//   };

//   // ---------------- NEW FUNCTIONS ---------------- //

//   public query func getNFT(id : Nat) : async ?NFT {
//     return nfts.get(id);
//   };

//   public shared(msg) func listForSale(nftId : Nat, price : Nat) : async Text {
//     switch (nfts.get(nftId)) {
//       case (?nft) {
//         if (nft.owner != msg.caller) return "Error: Only owner can list";
//         let updated = { nft with price = price; status = "isOnSale" };
//         nfts.put(nftId, updated);
//         sales.put(nftId, price);
//         return "NFT listed for sale at " # Nat.toText(price);
//       };
//       case null { return "Error: NFT not found" };
//     };
//   };

//   public shared(msg) func withdrawNFT(nftId : Nat) : async Text {
//     switch (nfts.get(nftId)) {
//       case (?nft) {
//         if (nft.owner != msg.caller) return "Error: Only owner can withdraw";
//         sales.delete(nftId);
//         let updated = { nft with status = "Owned" };
//         nfts.put(nftId, updated);
//         return "NFT withdrawn from sale";
//       };
//       case null { return "Error: NFT not found" };
//     };
//   };

//   public shared(msg) func listForAuction(nftId : Nat, startingPrice : Nat, duration : Nat) : async Text {
//     switch (nfts.get(nftId)) {
//       case (?nft) {
//         if (nft.owner != msg.caller) return "Error: Only owner can auction";
//         let now = Nat64.toNat(Nat64.fromIntWrap(Time.now()));
//         let auction : AuctionInfo = {
//           seller = msg.caller;
//           highestBid = startingPrice;
//           highestBidder = null;
//           startPrice = startingPrice;
//           endTime = now + duration;
//         };
//         auctions.put(nftId, auction);
//         let updated = { nft with status = "isOnBid"; price = startingPrice };
//         nfts.put(nftId, updated);
//         return "NFT listed for auction at " # Nat.toText(startingPrice);
//       };
//       case null { return "Error: NFT not found" };
//     };
//   };

//   public shared(msg) func placeBid(nftId : Nat, bidAmount : Nat) : async Text {
//     switch (auctions.get(nftId)) {
//       case (?auc) {
//         let now = Nat64.toNat(Nat64.fromIntWrap(Time.now()));
//         if (now > auc.endTime) return "Error: Auction ended";
//         if (bidAmount <= auc.highestBid) return "Error: Bid too low";
//         let updated = { auc with highestBid = bidAmount; highestBidder = ?msg.caller };
//         auctions.put(nftId, updated);
//         return "Bid of " # Nat.toText(bidAmount) # " placed on NFT " # Nat.toText(nftId);
//       };
//       case null { return "Error: No active auction" };
//     };
//   };

//   public shared(msg) func finalizeSale(nftId : Nat) : async Text {
//     switch (auctions.get(nftId)) {
//       case (?auc) {
//         let now = Nat64.toNat(Nat64.fromIntWrap(Time.now()));
//         if (now < auc.endTime) return "Error: Auction still active";
//         switch (auc.highestBidder) {
//           case (?buyer) {
//             let transferText = await transferOwnership(buyer, nftId);
//             auctions.delete(nftId);
//             return "Auction finalized. " # transferText;
//           };
//           case null {
//             auctions.delete(nftId);
//             return "No bids placed; auction closed.";
//           };
//         };
//       };
//       case null {
//         switch (sales.get(nftId)) {
//           case (?price) {
//             sales.delete(nftId);
//             return "Fixed sale finalized for NFT " # Nat.toText(nftId);
//           };
//           case null { return "Error: No active sale/auction" };
//         };
//       };
//     };
//   };
// };
