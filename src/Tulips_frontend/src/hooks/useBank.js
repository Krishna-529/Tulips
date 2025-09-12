import { useEffect, useState, useCallback } from "react";
import { getActors } from "../utils/ic";
import { Principal } from "@dfinity/principal";

export function useBank() {
  const [bank, setBank] = useState(null);
  const [principal, setPrincipal] = useState(null);

  useEffect(() => {
    getActors().then(({ bank, principal }) => {
      setBank(bank);
      setPrincipal(principal);
    });
  }, []);

  const getBalance = useCallback(async () => {
    if (!bank || !principal) return "0";
    try {
      const bal = await bank.icrc1_balance_of({
        owner: Principal.fromText(principal),  // ensure proper Principal
        subaccount: [],                        // null in Motoko → [] in JS
      });
      return bal ? bal.toString() : "0";
    } catch (err) {
      console.error("Balance error:", err);
      return "Error";
    }
  }, [bank, principal]);

  const transfer = useCallback(async (destPrincipal, amount) => {
    if (!bank || !principal) return { ok: false, error: "Bank not ready" };

    try {
      const args = {
        from_subaccount: [],
        to: {
          owner: Principal.fromText(destPrincipal),
          subaccount: [],
        },
        amount: BigInt(amount),
        fee: [],              // null → []
        memo: [],
        created_at_time: [],
      };

      const res = await bank.icrc1_transfer(args);

      if ("ok" in res) {
        return { ok: true, height: res.ok };
      } else {
        return { ok: false, error: JSON.stringify(res.err) };
      }
    } catch (err) {
      console.error("Transfer error:", err);
      return { ok: false, error: err.message };
    }
  }, [bank, principal]);

  const payout = useCallback(async () => {
    if (!bank) return;
    try {
      return await bank.payOut();
    } catch {
      return false;
    }
  }, [bank]);

  return { bank, principal, getBalance, transfer, payout };
}
