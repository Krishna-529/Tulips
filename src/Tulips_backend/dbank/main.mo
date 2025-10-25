import Debug "mo:base/Debug";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Blob "mo:base/Blob";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Nat8 "mo:base/Nat8";
import Array "mo:base/Array";
import Nat64 "mo:base/Nat64";
import Nat "mo:base/Nat";
import Option "mo:base/Option";

// ICRC-1 Token Canister with 0.5% fee, one-time payout, debugBalances,
// and a compatibility icrc1_transfer_from for your marketplace.
actor class ICRC1Token() = this {
  // ---------- Types ----------
  public type Timestamp = Nat64;
  public type Subaccount = Blob;
  public type Account = { owner : Principal; subaccount : ?Subaccount };

  public type TransferArgs = {
    from_subaccount : ?Subaccount;
    to : Account;
    amount : Nat;
    fee : ?Nat;            // Optional override not supported; enforced as 0.5%
    memo : ?Blob;
    created_at_time : ?Timestamp;
  };

  public type TransferError = {
    #BadFee : { expected_fee : Nat };
    #InsufficientFunds : { balance : Nat };
    #GenericError : { error_code : Nat; message : Text };
    #TooOld;
    #CreatedInFuture : { ledger_time : Timestamp };
    #Duplicate : { duplicate_of : Nat };
    #TemporarilyUnavailable;
    #BadBurn : { min_burn_amount : Nat };
  };

  public type Value = {
    #Nat : Nat;
    #Int : Int;
    #Text : Text;
    #Blob : Blob;
  };

  public type Std = { name : Text; url : Text };
  public type Result<T, E> = Result.Result<T, E>;

  // ---------- Token constants ----------
  let NAME : Text = "DAMN Token";
  let SYMBOL : Text = "DAMN";
  let DECIMALS : Nat8 = 8;
  let INITIAL_SUPPLY : Nat = 1_000_000_000_000;

  // Use the canister itself as the initial treasury/minting account
  let deployer : Principal = Principal.fromActor(this);
  let treasury : Account = { owner = deployer; subaccount = null };

  // ---------- Stable state ----------
  // Store balances and claimed flags across upgrades
  stable var stableBalances : [ (Account, Nat) ] = [];
  stable var stableClaims : [ (Principal, Bool) ] = [];

  // ---------- In-memory state ----------
  // Equality compares both owner and subaccount
  var balances : HashMap.HashMap<Account, Nat> = HashMap.HashMap<Account, Nat>(
    256,
    func(a : Account, b : Account) : Bool =
      a.owner == b.owner and Option.equal<Blob>(a.subaccount, b.subaccount, Blob.equal),
    func(a : Account) = Principal.hash(a.owner)
  );

  var claimed : HashMap.HashMap<Principal, Bool> =
    HashMap.HashMap<Principal, Bool>(256, Principal.equal, Principal.hash);

  // ---------- Upgrade hooks ----------
  system func preupgrade() {
    stableBalances := Iter.toArray(balances.entries());
    stableClaims := Iter.toArray(claimed.entries());
  };

  system func postupgrade() {
    balances := HashMap.fromIter<Account, Nat>(
      stableBalances.vals(),
      256,
      func(a : Account, b : Account) : Bool =
        a.owner == b.owner and Option.equal<Blob>(a.subaccount, b.subaccount, Blob.equal),
      func(a : Account) = Principal.hash(a.owner)
    );

    claimed := HashMap.HashMap<Principal, Bool>(256, Principal.equal, Principal.hash);
    for ((p, wasClaimed) in stableClaims.vals()) {
      claimed.put(p, wasClaimed);
    };
  };

  // ---------- Constructor mint ----------
  ignore do {
    let cur = switch (balances.get(treasury)) { case (?b) b; case null 0 };
    balances.put(treasury, cur + INITIAL_SUPPLY);
  };

  // ---------- ICRC-1 queries ----------
  public shared query func icrc1_name() : async Text { NAME };

  public shared query func icrc1_symbol() : async Text { SYMBOL };

  public shared query func icrc1_decimals() : async Nat8 { DECIMALS };

  public shared query func icrc1_fee() : async Nat { 0 };

  public shared query func icrc1_total_supply() : async Nat {
    var sum : Nat = 0;
    for ((_, bal) in balances.entries()) { sum += bal };
    sum
  };

  public shared query func icrc1_minting_account() : async ?Account {
    ?treasury
  };

  public shared query func icrc1_balance_of(account : Account) : async Nat {
    switch (balances.get(account)) {
      case (?b) b;
      case null 0;
    }
  };

  public shared query func icrc1_metadata() : async [ (Text, Value) ] {
    [
      ("icrc1:name", #Text(NAME)),
      ("icrc1:symbol", #Text(SYMBOL)),
      ("icrc1:decimals", #Nat(Nat8.toNat(DECIMALS))),
      ("fee_rate", #Text("0.5% of transfer amount"))
    ]
  };

  public shared query func icrc1_supported_standards() : async [Std] {
    [ { name = "ICRC-1"; url = "https://github.com/dfinity/ICRC-1" } ]
  };

  // ---------- Core transfer ----------
  public shared(msg) func icrc1_transfer(args : TransferArgs)
    : async Result<Nat, TransferError>
  {
    let fromAcct : Account = { owner = msg.caller; subaccount = args.from_subaccount };
    let toAcct : Account = args.to;

    if (fromAcct.owner == toAcct.owner and Option.equal<Blob>(fromAcct.subaccount, toAcct.subaccount, Blob.equal)) {
      return #err(#GenericError { error_code = 1; message = "Cannot send to self" });
    };

    let feeAmt : Nat = (args.amount) / 200;

    if (args.fee != null and args.fee != ?feeAmt) {
      return #err(#BadFee { expected_fee = feeAmt });
    };

    let total = args.amount + feeAmt;

    let fromBal =
      switch (balances.get(fromAcct)) { case (?b) b; case null 0 };

    if (fromBal < total) {
      return #err(#InsufficientFunds { balance = fromBal });
    };

    balances.put(fromAcct, fromBal - total);

    let toBal = switch (balances.get(toAcct)) { case (?b) b; case null 0 };
    balances.put(toAcct, toBal + args.amount);

    let treasBal = switch (balances.get(treasury)) { case (?b) b; case null 0 };
    balances.put(treasury, treasBal + feeAmt);

    #ok(0)
  };

  // ---------- One-time payout ----------
  public shared(msg) func payOut() : async Text {
    let caller = msg.caller;

    switch (claimed.get(caller)) {
      case (?true) { return "Already Claimed" };
      case _ {};
    };

    let payoutAmount : Nat = 10_000;

    let treasBal = switch (balances.get(treasury)) { case (?b) b; case null 0 };
    if (treasBal < payoutAmount) {
      return "Insufficient funds in treasury";
    };

    balances.put(treasury, treasBal - payoutAmount);

    let userAcct : Account = { owner = caller; subaccount = null };
    let userBal = switch (balances.get(userAcct)) { case (?b) b; case null 0 };
    balances.put(userAcct, userBal + payoutAmount);

    claimed.put(caller, true);
    "Payout Successful"
  };

  // ---------- Debug ----------
  public shared query func debugBalances() : async [ (Account, Nat) ] {
    Iter.toArray(balances.entries())
  };

  //////////////////////////////////////////////////////////////////////
  // Compatibility wrapper
  //////////////////////////////////////////////////////////////////////
  public shared(msg) func icrc1_transfer_from_compat(args : {
      from_subaccount : ?[Nat8];
      from : Principal;
      to : Principal;
      amount : Nat;
      fee : ?Nat;
      memo : ?[Nat8];
      created_at_time : ?Nat64;
    }) : async { error : ?Text; height : Nat64 }
  {
    let adapted : TransferArgs = {
      from_subaccount = Option.map<[Nat8], Blob>(args.from_subaccount, Blob.fromArray);
      to = { owner = args.to; subaccount = null };
      amount = args.amount;
      fee = args.fee;
      memo = Option.map<[Nat8], Blob>(args.memo, Blob.fromArray);
      created_at_time = args.created_at_time;
    };

    let fromAcct : Account = { owner = args.from; subaccount = Option.map<[Nat8], Blob>(args.from_subaccount, Blob.fromArray) };

    let feeAmt : Nat = (adapted.amount) / 200;
    if (adapted.fee != null and adapted.fee != ?feeAmt) {
      return { error = ?("BadFee: expected " # Nat.toText(feeAmt)); height = 0 };
    };

    let total : Nat = adapted.amount + feeAmt;

    let fromBal =
      switch (balances.get(fromAcct)) { case (?b) b; case null 0 };

    if (fromBal < total) {
      return { error = ?("InsufficientFunds: balance=" # Nat.toText(fromBal)); height = 0 };
    };

    balances.put(fromAcct, fromBal - total);

    let toAcct : Account = adapted.to;
    let toBal = switch (balances.get(toAcct)) { case (?b) b; case null 0 };
    balances.put(toAcct, toBal + adapted.amount);

    let treasBal = switch (balances.get(treasury)) { case (?b) b; case null 0 };
    balances.put(treasury, treasBal + feeAmt);

    { error = null; height = 0 }
  };

  // ---------- Backward-compatible wrapper ----------
  public shared(msg) func icrc1_transfer_from(args : {
    from_subaccount : ?[Nat8];
    to : Principal;
    amount : Nat;
    fee : ?Nat;
    memo : ?[Nat8];
    created_at_time : ?Nat64;
  }) : async { error : ?Text; height : Nat64 }
{
  await icrc1_transfer_from_compat({
    from_subaccount = args.from_subaccount;
    from = msg.caller;
    to = args.to;
    amount = args.amount;
    fee = args.fee;
    memo = args.memo;
    created_at_time = args.created_at_time;
  })
};

}