import { useEffect, useState, useCallback } from "react";
import { getActors } from "../utils/ic";

export function useMarketplace() {
  const [market, setMarket] = useState(null);
  const [principal, setPrincipal] = useState(null);

  useEffect(() => {
    getActors().then(({ market, principal }) => {
      setMarket(market);
      setPrincipal(principal);
    });
  }, []);

  const listForAuction = useCallback(async (tokenId, minBid, durationSec) => {
    if (!market) return;
    try { return await market.listForAuction(tokenId, BigInt(minBid), BigInt(durationSec)); }
    catch { return false; }
  }, [market]);

  const getAuctions = useCallback(async () => {
    if (!market) return [];
    try { return await market.getActiveAuctions() || []; }
    catch { return []; }
  }, [market]);

  const bid = useCallback(async (tokenId, amount) => {
    if (!market || !principal) return;
    try { return await market.bid(tokenId, BigInt(amount)); }
    catch { return false; }
  }, [market, principal]);

  const settle = useCallback(async (tokenId) => {
    if (!market) return;
    try { return await market.settleAuction(tokenId); }
    catch { return false; }
  }, [market]);

  return { market, principal, listForAuction, getAuctions, bid, settle };
}
