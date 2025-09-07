import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Option "mo:base/Option";
import Array "mo:base/Array";
import Time "mo:base/Time";
import Hash "mo:base/Hash";
import Debug "mo:base/Debug";
import Iter "mo:base/Iter";

// Marketplace actor class
actor class Marketplace(tokenCid: Principal, nftCid: Principal) = this {

  // -------- ICRC-1 Token Interface --------
  public type TransferArgs = {
    from_subaccount : ?[Nat8];
    to : Principal;
    amount : Nat;
    fee : ?Nat;
    memo : ?[Nat8];
    created_at_time : ?Nat64;
  };
  public type ICRC1 = actor {
    icrc1_transfer_from : (TransferArgs) -> async { error : ?Text; height : Nat64 };
  };

  // ------ Types ------
  public type TokenId = Nat;
  public type Metadata = { uri: Text; name: Text };
  public type NFT = actor {
    icrc7_ownerOf : (TokenId) -> async ?Principal;
    icrc7_approve : (Principal, TokenId) -> async Bool;
    icrc7_transfer : (Principal, TokenId) -> async Bool;
    icrc7_metadata : (TokenId) -> async ?Metadata;
    icrc7_getApproved : (TokenId) -> async ?Principal;
  };
  public type Auction = {
    tokenId       : TokenId;
    nftCid        : Principal;
    owner         : Principal;
    minBid        : Nat;
    highestBid    : Nat;
    highestBidder : ?Principal;
    endTime       : ?Nat64;
    metadata      : Metadata;
  };

  // ------ State ------
  let nft : NFT = actor(Principal.toText(nftCid));
  let token : ICRC1 = actor(Principal.toText(tokenCid));

  // in-memory HashMap for listings
  var listings : HashMap.HashMap<TokenId, Auction> =
    HashMap.HashMap<TokenId, Auction>(32, Nat.equal, Hash.hash);

  // ------ List Auction ------
  public shared(msg) func listForAuction(tokenId: TokenId, minBid: Nat, durationSec: Nat64) : async ?Text {
    let metaOpt = await nft.icrc7_metadata(tokenId);
    switch (metaOpt) {
      case null { return ?"Missing metadata" };
      case (?meta) {
        let ownerOpt = await nft.icrc7_ownerOf(tokenId);
        switch (ownerOpt) {
          case null { return ?"Not NFT owner" };
          case (?owner) { if (owner != msg.caller) { return ?"Not NFT owner" } };
        };
        let approvedOpt = await nft.icrc7_getApproved(tokenId);
        switch (approvedOpt) {
          case null { return ?"Marketplace not approved" };
          case (?approver) {
            if (approver != Principal.fromActor(this)) { return ?"Marketplace not approved" };
          };
        };

        // compute end time as Nat64
        let now64 : Nat64 = Nat64.fromIntWrap(Time.now());
        let addNanos : Nat64 = Nat64.mul(durationSec, Nat64.fromNat(1_000_000_000));
        let endTime64 : Nat64 = Nat64.add(now64, addNanos);

        let auction : Auction = {
          tokenId = tokenId;
          nftCid = nftCid;
          owner = msg.caller;
          minBid = minBid;
          highestBid = 0;
          highestBidder = null;
          endTime = ?endTime64;
          metadata = meta;
        };
        listings.put(tokenId, auction);
        return null;
      };
    };
  };

  // ------ Bid ------
  public shared(msg) func bid(tokenId: TokenId, bidAmt: Nat) : async ?Text {
    switch (listings.get(tokenId)) {
      case null { return ?"Not listed" };
      case (?auction) {
        let now64 : Nat64 = Nat64.fromIntWrap(Time.now());
        let ended = switch (auction.endTime) {
          case null { false };
          case (?end) end < now64;
        };
        if (ended) { return ?"Auction has ended" };

        let minValid =
          if (auction.highestBid == 0)
            auction.minBid
          else
            auction.highestBid + (auction.highestBid * 5) / 100;
        if (bidAmt < minValid) { return ?("Bid < min (" # Nat.toText(minValid) # ")") };

        // --- Payment: transfer bidAmt to escrow (marketplace canister) ---
        let payRes = await token.icrc1_transfer_from({
          from_subaccount = null;
          to = Principal.fromActor(this);
          amount = bidAmt;
          fee = null;
          memo = null;
          created_at_time = null;
        });
        switch (payRes.error) {
          case (?err) { return ?("Payment failed: " # err) };
          case null { /* proceed */ };
        };

        // --- Refund previous highest bidder, if any ---
        switch (auction.highestBidder) {
          case (?prev) {
            if (auction.highestBid > 0) {
              // Attempt refund (ignore failure)
              ignore await token.icrc1_transfer_from({
                from_subaccount = null;
                to = prev;
                amount = auction.highestBid;
                fee = null;
                memo = null;
                created_at_time = null;
              });
            };
          };
          case null { /* nothing to refund */ };
        };

        // --- Update auction record ---
        let updated : Auction = {
          tokenId = auction.tokenId;
          nftCid = auction.nftCid;
          owner = auction.owner;
          minBid = auction.minBid;
          highestBid = bidAmt;
          highestBidder = ?msg.caller;
          endTime = auction.endTime;
          metadata = auction.metadata;
        };
        listings.put(tokenId, updated);
        return null;
      };
    };
  };

  // ------ Settle Auction ------
  public shared(msg) func settleAuction(tokenId: TokenId) : async ?Text {
    switch (listings.get(tokenId)) {
      case null { return ?"No such auction" };
      case (?auction) {
        let now64 : Nat64 = Nat64.fromIntWrap(Time.now());
        switch (auction.endTime) {
          case null { return ?"Auction has no end time" };
          case (?end) { if (now64 < end) { return ?"Auction has not ended yet" } };
        };
        switch (auction.highestBidder) {
          case null { return ?"No winner" };
          case (?winner) {
            // --- Pay seller out of escrow ---
            let paySeller = await token.icrc1_transfer_from({
              from_subaccount = null;
              to = auction.owner;
              amount = auction.highestBid;
              fee = null;
              memo = null;
              created_at_time = null;
            });
            switch (paySeller.error) {
              case (?err) { return ?("Payout failed: " # err) };
              case null { /* proceed */ };
            };
            // --- Transfer NFT to winner ---
            ignore await nft.icrc7_transfer(winner, tokenId);
            // --- Close auction ---
            listings.delete(tokenId);
            return null;
          };
        };
      };
    };
  };

  // ------ Queries ------
  public query func getActiveAuctions() : async [Auction] {
    let now64 : Nat64 = Nat64.fromIntWrap(Time.now());
    let ids = Iter.toArray<TokenId>(listings.keys());
    // Map ids -> auctions (should exist)
    let auctions = Array.map<TokenId, Auction>(ids, func(id: TokenId) : Auction {
      switch (listings.get(id)) {
        case (?a) a;
        case null { Debug.trap("Invariant violated: missing auction for id") };
      }
    });
    // Filter active auctions (no endTime or end > now)
    Array.filter<Auction>(auctions, func(a: Auction) : Bool {
      switch (a.endTime) {
        case null { true };
        case (?end) end > now64;
      }
    })
  };
}
