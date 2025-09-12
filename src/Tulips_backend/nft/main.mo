import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Option "mo:base/Option";
import Hash "mo:base/Hash";
import Time "mo:base/Time";
import Random "mo:base/Random";
import Nat8 "mo:base/Nat8";
import Blob "mo:base/Blob";

// ----------------- Types -----------------


// ----------------- Actor -----------------
actor class NFTCanister(dBank: actor {
    icrc1_balance_of : shared query ({ owner : Principal; subaccount : ?[Nat8] }) -> async Nat;
    icrc1_transfer : shared ({
      from_subaccount : ?[Nat8];
      to : { owner : Principal; subaccount : ?[Nat8] };
      amount : Nat;
      fee : ?Nat;
      memo : ?[Nat8];
      created_at_time : ?Nat64;
    }) -> async { #Ok : Nat; #Err : Text };
  }) = this {

  public type TokenId = Nat;
  public type Metadata = { uri: Text; name: Text };
  public type NFT = {
    owner: Principal;
    metadata: Metadata;
    approved: ?Principal;
    currentPrice: Nat;
    basePrice: Nat;
    maxPrice: Nat;
    isOnBid: Bool;
    bidEndTime: ?Int;
    purchaser: ?Principal;
  };
  // --- State ---
  var tokens: HashMap.HashMap<TokenId, NFT> = HashMap.HashMap<TokenId, NFT>(
    64, Nat.equal, Hash.hash
  );
  stable var nextTokenId: TokenId = 0;

  // ----------------- Mint -----------------
  public shared(msg) func icrc7_mint(metadata: Metadata, desiredPrice: Nat) : async TokenId {
    let id = nextTokenId;
    nextTokenId += 1;

    // minting fee = random 40–60% of desired price
    let randBlob = await Random.blob();
    let randVal = Nat8.toNat(Blob.toArray(randBlob)[0]) % 21; // 0..20
    let feePercent = 40 + randVal;
    let mintFee = desiredPrice * feePercent / 100;

    let nft: NFT = {
      owner = msg.caller;
      metadata = metadata;
      approved = null;
      currentPrice = desiredPrice - mintFee;
      basePrice = desiredPrice;
      maxPrice = desiredPrice * 220 / 100; // max < 220%
      isOnBid = false;
      bidEndTime = null;
      purchaser = null;
    };
    tokens.put(id, nft);
    id
  };

  // ----------------- Transfer -----------------
  public shared(msg) func icrc7_transfer(to: Principal, id: TokenId, price: Nat) : async Bool {
    switch (tokens.get(id)) {
      case (?nft) {
        let isOwner = nft.owner == msg.caller;
        let isApproved = switch (nft.approved) {
          case (?p) p == msg.caller;
          case null false;
        };
        if (isOwner or isApproved) {
          // Transfer + freeze release logic can be implemented with dBank here
          let profit = if (price > nft.currentPrice) price - nft.currentPrice else 0;
          let bankFee = profit * 5 / 100;

          // Transfer to bank and seller would be done via dBank
          // Example: await dBank.icrc1_transfer({...})

          let updated: NFT = {
            owner = to;
            metadata = nft.metadata;
            approved = null;
            currentPrice = price - bankFee;
            basePrice = nft.basePrice;
            maxPrice = nft.maxPrice;
            isOnBid = false;
            bidEndTime = null;
            purchaser = null;
          };
          tokens.put(id, updated);
          true
        } else false;
      };
      case null return false;
    }
  };

  // ----------------- Approve/Revoke -----------------
  public shared(msg) func icrc7_approve(operator: Principal, id: TokenId) : async Bool {
    switch (tokens.get(id)) {
      case (?nft) {
        if (nft.owner == msg.caller) {
          let updated: NFT = { nft with approved = ?operator };
          tokens.put(id, updated);
          true
        } else false;
      };
      case null return false;
    }
  };

  public shared(msg) func icrc7_revoke(id: TokenId) : async Bool {
    switch (tokens.get(id)) {
      case (?nft) {
        if (nft.owner == msg.caller) {
          let updated: NFT = { nft with approved = null };
          tokens.put(id, updated);
          true
        } else false;
      };
      case null return false;
    }
  };

  // ----------------- Auction Logic -----------------
  public shared(msg) func startBid(id: TokenId, durationSeconds: Nat, base: Nat) : async Bool {
    switch(tokens.get(id)) {
      case (?nft) {
        if (nft.owner != msg.caller) return false;
        if (base >= nft.maxPrice) return false;
        let updated = { nft with
          isOnBid = true;
          bidEndTime = ?(Time.now() + (Int.abs(durationSeconds) * 1_000_000_000));
          basePrice = base;
        };
        tokens.put(id, updated);
        true
      };
      case null return false;
    }
  };

  public shared(msg) func setBid(id: TokenId, newBid: Nat) : async Bool {
    switch(tokens.get(id)) {
      case (?nft) {
        if (not nft.isOnBid) return false;
        if (newBid < nft.basePrice) return false;
        if (newBid < nft.currentPrice + (nft.currentPrice * 5 / 100)) return false;

        let updated = { nft with currentPrice = newBid; purchaser = ?msg.caller };
        tokens.put(id, updated);
        true
      };
      case null return false;
    }
  };

  public shared(msg) func finalizeBid(id: TokenId) : async ?Principal {
    switch(tokens.get(id)) {
      case (?nft) {
        switch(nft.bidEndTime) {
          case (?t) {
            if (Time.now() >= t and nft.purchaser != null) {
              switch (nft.purchaser) {
                case (?winner) {
                  let profit = if (nft.currentPrice > nft.basePrice) nft.currentPrice - nft.basePrice else 0;
                  let bankFee = profit * 5 / 100;

                  let updated = { nft with
                    owner = winner;
                    isOnBid = false;
                    bidEndTime = null;
                    purchaser = null;
                    currentPrice = nft.currentPrice - bankFee
                  };
                  tokens.put(id, updated);
                  return ?winner;
                };
                case null { return null };
              };
            };
            return null;
          };
          case null { return null };
        };
      };
      case null { return null };
    };
};


  // ----------------- Queries -----------------
  public query func icrc7_ownerOf(id: TokenId) : async ?Principal {
    switch (tokens.get(id)) { case (?nft) ?nft.owner; case null null }
  };

  public query func icrc7_getApproved(id: TokenId) : async ?Principal {
    switch (tokens.get(id)) { case (?nft) nft.approved; case null null }
  };

  public query func icrc7_tokenUri(id: TokenId) : async ?Text {
    switch (tokens.get(id)) { case (?nft) ?nft.metadata.uri; case null null }
  };

  public query func icrc7_tokensOf(owner: Principal) : async [TokenId] {
    let n = nextTokenId;
    let tokensArr = Array.tabulate<TokenId>(n, func(i: Nat): Nat { i });
    Array.filter<TokenId>(tokensArr, func (id) : Bool {
      switch (tokens.get(id)) { case (?nft) nft.owner == owner; case null false }
    })
  };

  public query func icrc7_metadata(id: TokenId) : async ?Metadata {
    switch (tokens.get(id)) { case (?nft) ?nft.metadata; case null null }
  };

  public query func getDetails(id: TokenId) : async ?NFT {
    tokens.get(id)
  };
};
