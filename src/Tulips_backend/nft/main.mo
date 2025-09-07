import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Option "mo:base/Option";
import Hash "mo:base/Hash";
import Nat32 "mo:base/Nat32";

actor class NFTCanister() = this {

  // --- Types ---
  public type TokenId = Nat;
  public type Metadata = { uri: Text; name: Text };
  public type NFT = { owner: Principal; metadata: Metadata; approved: ?Principal };

  // --- State ---
  
//   transient var tokens : HashMap.HashMap<TokenId, NFT> = HashMap.HashMap<TokenId, NFT>(64, Nat.equal, Nat.hash);
  var tokens : HashMap.HashMap<TokenId, NFT> =
    HashMap.HashMap<TokenId, NFT>(
      64,
      Nat.equal,
      Hash.hash
    );
  stable var nextTokenId: TokenId = 0;
  // --- Mint ---
  public shared(msg) func icrc7_mint(metadata: Metadata) : async TokenId {
    let id = nextTokenId;
    nextTokenId += 1;
    let nft : NFT = { owner = msg.caller; metadata = metadata; approved = null };
    tokens.put(id, nft);
    id
  };

  // --- Transfer (owner or approved) ---
  public shared(msg) func icrc7_transfer(to: Principal, id: TokenId) : async Bool {
    switch (tokens.get(id)) {
      case (?nft) {
        let isOwner = nft.owner == msg.caller;
        let isApproved = switch (nft.approved) {
          case (?p) p == msg.caller;
          case null false;
        };
        if (isOwner or isApproved) {
          let updated : NFT = { owner = to; metadata = nft.metadata; approved = null };
          tokens.put(id, updated);
          return true;
        } else {
          return false;
        }
      };
      case null return false;
    }
  };

  // --- Approve ---
  public shared(msg) func icrc7_approve(operator: Principal, id: TokenId) : async Bool {
    switch (tokens.get(id)) {
      case (?nft) {
        if (nft.owner == msg.caller) {
          let updated : NFT = { owner = nft.owner; metadata = nft.metadata; approved = ?operator };
          tokens.put(id, updated);
          return true;
        } else {
          return false;
        }
      };
      case null return false;
    }
  };

  // --- Revoke ---
  public shared(msg) func icrc7_revoke(id: TokenId) : async Bool {
    switch (tokens.get(id)) {
      case (?nft) {
        if (nft.owner == msg.caller) {
          let updated : NFT = { owner = nft.owner; metadata = nft.metadata; approved = null };
          tokens.put(id, updated);
          return true;
        } else {
          return false;
        }
      };
      case null return false;
    }
  };

  // --- Queries ---

  public query func icrc7_ownerOf(id: TokenId) : async ?Principal {
    switch (tokens.get(id)) {
      case (?nft) ?nft.owner;
      case null null;
    }
  };

  public query func icrc7_getApproved(id: TokenId) : async ?Principal {
    switch (tokens.get(id)) {
      case (?nft) nft.approved;
      case null null;
    }
  };

  public query func icrc7_tokenUri(id: TokenId) : async ?Text {
    switch (tokens.get(id)) {
      case (?nft) ?nft.metadata.uri;
      case null null;
    }
  };

  // Returns all token ids owned by `owner`
  public query func icrc7_tokensOf(owner: Principal) : async [TokenId] {
    let n = nextTokenId;
    let tokensArr = Array.tabulate<TokenId>(n, func(i: Nat): Nat { i });
    Array.filter<TokenId>(tokensArr, func (id) : Bool {
      switch (tokens.get(id)) { case (?nft) nft.owner == owner; case null false }
    })
  };

  public query func icrc7_metadata(id: TokenId) : async ?Metadata {
    switch (tokens.get(id)) {
      case (?nft) ?nft.metadata;
      case null null;
    }
  };
};
