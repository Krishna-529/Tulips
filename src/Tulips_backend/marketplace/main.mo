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

  stable var stableNFTs : [(Nat, NFT)] = [];
  var nfts : HashMap.HashMap<Nat, NFT> = HashMap.HashMap<Nat, NFT>(
    0, Nat.equal, func(n: Nat): Hash.Hash { Text.hash(Nat.toText(n)) }
  );

  stable var stableSales : [(Nat, Nat)] = [];
  var sales : HashMap.HashMap<Nat, Nat> = HashMap.HashMap<Nat, Nat>(
    0, Nat.equal, func(n: Nat): Hash.Hash { Text.hash(Nat.toText(n)) }
  );

  public type AuctionInfo = {
    nftId : Nat;
    seller : Principal;
    startPrice : Nat;
    highestBid : Nat;
    highestBidder : ?Principal;
    highestBidderSubaccount : ?Blob;
    endTime : Int;
    isActive : Bool;
  };

  public type SaleInfo = {
    nftId : Nat;
    seller : Principal;
    price : Nat;
    isActive : Bool;
  };

  stable var stableAuctions : [(Nat, AuctionInfo)] = [];
  var auctions : HashMap.HashMap<Nat, AuctionInfo> = HashMap.HashMap<Nat, AuctionInfo>(
    0, Nat.equal, func(n: Nat): Hash.Hash { Text.hash(Nat.toText(n)) }
  );

  var bidsPlaced = HashMap.HashMap<Nat, Bool>(
    0, Nat.equal, func(n: Nat): Hash.Hash { Text.hash(Nat.toText(n)) }
  );

  stable var stableSalesInfo : [(Nat, SaleInfo)] = [];
  var salesInfo : HashMap.HashMap<Nat, SaleInfo> = HashMap.HashMap<Nat, SaleInfo>(
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
    for ((key, amount) in stableFreezes.vals()) { freezes.put(key, amount); };

    nfts := HashMap.HashMap<Nat, NFT>(0, Nat.equal, func(n: Nat): Hash.Hash { Text.hash(Nat.toText(n)) });
    for ((id, nft) in stableNFTs.vals()) { nfts.put(id, nft); };

    sales := HashMap.HashMap<Nat, Nat>(0, Nat.equal, func(n: Nat): Hash.Hash { Text.hash(Nat.toText(n)) });
    for ((id, price) in stableSales.vals()) { sales.put(id, price); };

    auctions := HashMap.HashMap<Nat, AuctionInfo>(0, Nat.equal, func(n: Nat): Hash.Hash { Text.hash(Nat.toText(n)) });
    for ((id, auc) in stableAuctions.vals()) { auctions.put(id, auc); };
  };

  public shared(msg) func mintNFT(meta : Metadata) : async Text {
    let rnd = await Random.blob();
    let r = Nat8.toNat(Blob.toArray(rnd)[0]) % 21;
    let feePercent = 40 + r; 

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

  func subaccountHash(user : Principal, nftId : Nat) : Blob {
    let combinedText = Principal.toText(user) # "-" # Nat.toText(nftId);
    let hash32 : Nat32 = Text.hash(combinedText);

    let bytes : [Nat8] = [
      Nat8.fromNat(Nat32.toNat((hash32 >> 24) & 0xFF)),
      Nat8.fromNat(Nat32.toNat((hash32 >> 16) & 0xFF)),
      Nat8.fromNat(Nat32.toNat((hash32 >> 8) & 0xFF)),
      Nat8.fromNat(Nat32.toNat(hash32 & 0xFF)),
    ];

    return Blob.fromArray(bytes);
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

  public shared(msg) func listForAuction(nftId : Nat, startingPrice : Nat, duration : Nat) : async Text {
    switch (nfts.get(nftId)) {
      case (?nft) {
        if (nft.owner != msg.caller) return "Error: Only owner can auction";

        let fee = startingPrice / 100; 
        ignore await Dbank.icrc1_transfer_from_compat({
          from_subaccount = null;
          from = msg.caller;
          to = Principal.fromActor(Dbank);
          amount = fee;
          fee = null;
          memo = null;
          created_at_time = null;
        });

        let now = Time.now();
        let auction : AuctionInfo = {
          nftId = nftId;
          seller = msg.caller;
          startPrice = startingPrice;
          highestBid = startingPrice;
          highestBidder = null;
          highestBidderSubaccount = null;
          endTime = now + duration;
          isActive = true;
        };
        auctions.put(nftId, auction);
        bidsPlaced.put(nftId, false);

        let updated = { nft with status = "isOnBid"; price = startingPrice };
        nfts.put(nftId, updated);
        return "Auction created successfully.";
      };
      case null return "Error: NFT not found";
    };
  };

  public shared(msg) func placeBid(nftId : Nat, bidAmount : Nat) : async Text {
    let bidder = msg.caller;

    switch (auctions.get(nftId)) {
      case (?auction) {
        if (not auction.isActive) return "Auction inactive.";
        if (bidAmount <= auction.highestBid) return "Bid too low.";

        let subAccBlob : Blob = subaccountHash(bidder, nftId);

        ignore await Dbank.icrc1_transfer_from_compat({
          from_subaccount = null;
          from = bidder;
          to = bidder;
          to_subaccount = ?subAccBlob;
          amount = bidAmount;
          fee = null;
          memo = null;
          created_at_time = null;
        });

        let prevSubAcc : ?Blob = auction.highestBidderSubaccount;

        switch (auction.highestBidder) {
          case (?prevBidder) {
            switch (prevSubAcc) {
              case (?sub) {
                ignore await Dbank.icrc1_transfer_from_compat({
                  from_subaccount = ?sub;
                  from = prevBidder;
                  to = prevBidder;
                  to_subaccount = null;
                  amount = auction.highestBid;
                  fee = null;
                  memo = null;
                  created_at_time = null;
                });
              };
              case null {};
            };
          };
          case null {};
        };

        let updated = {
          auction with
          highestBid = bidAmount;
          highestBidder = ?bidder;
          highestBidderSubaccount = ?subAccBlob;
        };
        auctions.put(nftId, updated);
        bidsPlaced.put(nftId, true);

        return "Bid placed successfully.";
      };
      case null { return "Auction not found."; };
    };
  };

  public shared(msg) func finalizeAuction(nftId : Nat) : async Text {
    switch (auctions.get(nftId)) {
      case (?auction) {
        if (not auction.isActive) return "Already finalized.";

        let now = Nat64.toNat(Nat64.fromIntWrap(Time.now()));
        if (now < auction.endTime and msg.caller != auction.seller) 
            return "Auction still running.";

        switch (auction.highestBidder) {
          case (?winner) {
            ignore await transferOwnership(winner, nftId);

            ignore await Dbank.icrc1_transfer_from_compat({
              from_subaccount = auction.highestBidderSubaccount;
              from = winner;
              to = auction.seller;
              to_subaccount = null;
              amount = auction.highestBid;
              fee = null;
              memo = null;
              created_at_time = null;
            });

            let commission = (auction.highestBid * 25) / 1000;
            ignore await Dbank.icrc1_transfer_from_compat({
              from_subaccount = null;
              from = auction.seller;
              to = Principal.fromActor(Dbank);
              amount = commission;
              fee = null;
              memo = null;
              created_at_time = null;
            });

            let updated = { auction with isActive = false };
            auctions.put(nftId, updated);

            return "Auction finalized successfully.";
          };
          case null {
            auctions.delete(nftId);
            switch (nfts.get(nftId)) {
              case (?nft) {
                let updatedNFT = { nft with status = "Owned" };
                nfts.put(nftId, updatedNFT);
              };
              case null {};
            };
            return "No bids were placed.";
          };
        };
      };
      case null { return "Auction not found."; };
    };
  };

  public shared(msg) func withdrawAuction(nftId : Nat) : async Text {
    switch (auctions.get(nftId)) {
      case (?auction) {
        if (auction.seller != msg.caller) return "Not your auction.";
        if (bidsPlaced.get(nftId) == ?true) return "Cannot withdraw; bids exist.";
        auctions.delete(nftId);
        return "Auction withdrawn successfully.";
      };
      case null return "No auction found.";
    };
  };

  public shared(msg) func finalizeAuctionEarly(nftId : Nat) : async Text {
    switch (auctions.get(nftId)) {
      case (?auction) {
        if (auction.seller != msg.caller) return "Not your auction.";
        if (auction.highestBidder == null) return "No bids to accept.";
        return await finalizeAuction(nftId);
      };
      case null return "No auction found.";
    };
  };

  public shared(msg) func placeForSale(nftId : Nat, price : Nat) : async Text {
    switch (nfts.get(nftId)) {
      case (?nft) {
        if (nft.owner != msg.caller) return "Error: Only owner can place NFT for sale";

        let listingFee = (price) / 100;
        ignore await Dbank.icrc1_transfer_from_compat({
          from_subaccount = null;
          from = msg.caller;
          to = Principal.fromActor(Dbank);
          amount = listingFee;
          fee = null;
          memo = null;
          created_at_time = null;
        });

        let sale : SaleInfo = {
          nftId = nftId;
          seller = msg.caller;
          price = price;
          isActive = true;
        };

        salesInfo.put(nftId, sale);

        let updatedNFT = { nft with status = "isOnSale"; price = price };
        nfts.put(nftId, updatedNFT);

        return "NFT listed for sale at " # Nat.toText(price) #
              " (1% listing fee deducted: " # Nat.toText(listingFee) # ")";
      };
      case null { return "NFT not found"; };
    };
  };

  public shared(msg) func buyNFT(nftId : Nat) : async Text {
    switch (salesInfo.get(nftId)) {
      case (?sale) {
        if (not (sale.isActive)) return "Sale inactive";

        ignore await Dbank.icrc1_transfer_from_compat({
          from_subaccount = null;
          from = msg.caller;
          to = sale.seller;
          amount = sale.price;
          fee = null;
          memo = null;
          created_at_time = null;
        });

        let commission = (sale.price * 25) / 1000;
        ignore await Dbank.icrc1_transfer_from_compat({
          from_subaccount = null;
          from = sale.seller;
          to = Principal.fromActor(Dbank);
          amount = commission;
          fee = null;
          memo = null;
          created_at_time = null;
        });

        ignore await transferOwnership(msg.caller, nftId);
        salesInfo.put(nftId, { sale with isActive = false });

        return "NFT purchased successfully by " # Principal.toText(msg.caller) #
              " (2.5% commission deducted from seller: " # Nat.toText(commission) # ")";
      };
      case null { return "NFT not for sale"; };
    };
  };

  public shared query func getAuctionInfo(nftId : Nat) : async [AuctionInfo] {
    switch (auctions.get(nftId)) {
      case (?auction) { [auction] };
      case null { [] };
    };
  };
};
