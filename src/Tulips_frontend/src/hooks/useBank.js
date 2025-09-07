import { useEffect, useState, useCallback } from "react";
import { getActors } from "../utils/ic";

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
      const bal = await bank.icrc1_balance_of({ owner: principal });
      return bal ? bal.toString() : "0";
    } catch { return "0"; }
  }, [bank, principal]);

  const transfer = useCallback(async (destPrincipal, amount) => {
    if (!bank || !principal) return false;
    return bank.icrc1_transfer({ owner: destPrincipal }, BigInt(amount || 0));
  }, [bank, principal]);

  const payout = useCallback(async () => {
    if (!bank) return;
    try { return await bank.payOut(); }
    catch { return false; }
  }, [bank]);

  return { bank, principal, getBalance, transfer, payout };
}
