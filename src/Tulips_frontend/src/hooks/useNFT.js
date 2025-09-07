import { useEffect, useState, useCallback } from "react";
import { getActors } from "../utils/ic";

export function useNFT() {
  const [nft, setNFT] = useState(null);
  const [principal, setPrincipal] = useState(null);

  useEffect(() => {
    getActors().then(({ nft, principal }) => {
      setNFT(nft);
      setPrincipal(principal);
    });
  }, []);

  // Get this user's NFTs, skips reload if unchanged
  const getMyTokens = useCallback(async () => {
    if (!nft || !principal) return [];
    const ids = await nft.icrc7_tokensOf(principal);
    return Promise.all((ids||[]).map(async (id) => {
      const [owner, meta, approved] = await Promise.all([
        nft.icrc7_ownerOf(id),
        nft.icrc7_metadata(id),
        nft.icrc7_getApproved(id),
      ]);
      return { id, owner, metadata: meta, approved };
    }));
  }, [nft, principal]);

  const approveForMarket = useCallback(async (tokenId, marketPrincipal) => {
    try { return await nft.icrc7_approve(marketPrincipal, tokenId); }
    catch { return false; }
  }, [nft]);

  const mintNFT = useCallback(async (metadata) => {
    try { return await nft.icrc7_mint(metadata); }
    catch { return false; }
  }, [nft]);

  return { nft, principal, getMyTokens, approveForMarket, mintNFT };
}
