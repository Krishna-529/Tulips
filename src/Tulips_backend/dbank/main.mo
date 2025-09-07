import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Option "mo:base/Option";
import Iter "mo:base/Iter";

// --------- Main Canister ---------
actor class DBank() = this {
  public type Account = { owner: Principal };

  stable let treasury : Account = { owner = Principal.fromActor(this) };

  // --- PERSISTED (stable) state ---
  stable var balancesEntries : [ (Account, Nat) ] = [];
  stable var claimed : [Principal] = [];

  // --- in-memory state ---
  var balances : HashMap.HashMap<Account, Nat> = HashMap.HashMap<Account, Nat>(
    128,
    func (a, b) = a.owner == b.owner,
    func (a) = Principal.hash(a.owner)
  );

  // Restore balances from stable on upgrade
  system func postupgrade() {
    balances := HashMap.HashMap<Account, Nat>(
      128,
      func (a, b) = a.owner == b.owner,
      func (a) = Principal.hash(a.owner)
    );
    for ((acct, bal) in balancesEntries.vals()) {
      balances.put(acct, bal);
    };
  };

  // Save balances to stable on upgrade
  system func preupgrade() {
    balancesEntries := Iter.toArray(balances.entries());
    // claimed is already stable, is not "reset"
  };

  // --- Optionally, this is now redundant since balance will be (re)set in candid args or upgrade, but for local dev do this:
  public func init() : async () {
    if (Option.isNull(balances.get(treasury))) {
      balances.put(treasury, 1_000_000_000_000);
    }
  };

  public shared query func icrc1_total_supply() : async Nat {
    var sum = 0;
    for ((_, bal) in balances.entries()) { sum += bal };
    sum
  };

  public shared query func icrc1_balance_of(account: Account) : async Nat {
    switch (balances.get(account)) {
      case (?bal) bal;
      case null 0;
    }
  };

  // Transfer with fixed 3% fee
  public shared(msg) func icrc1_transfer(to: Account, amount: Nat) : async Bool {
    let fromAcct = { owner = msg.caller };
    let fee = (amount * 3) / 100;
    let fromBal = switch (balances.get(fromAcct)) { case (?b) b; case null 0 };
    if (fromBal < amount + fee) return false;

    balances.put(fromAcct, fromBal - amount - fee);
    let toBal = switch (balances.get(to)) { case (?b) b; case null 0 };
    balances.put(to, toBal + amount);

    let treasBal = switch (balances.get(treasury)) { case (?b) b; case null 0 };
    balances.put(treasury, treasBal + fee);

    true
  };

  // One-time payout per principal
  public shared(msg) func payOut() : async Text {
    if (Array.find<Principal>(claimed, func(x) = x == msg.caller) != null)
      return "Already claimed";

    let acct: Account = { owner = msg.caller };
    let cur = switch (balances.get(acct)) { case (?b) b; case null 0 };
    balances.put(acct, cur + 1000);

    claimed := Array.append(claimed, [msg.caller]);

    "Payout successful"
  };
}
