import { useEffect, useState, useCallback } from "react";

export function useMarketplace(nftActor, marketActor, principal) {
  const [nfts, setNFTs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [txMsg, setTxMsg] = useState("");

  const fetchNFTs = useCallback(async () => {
    if (!nftActor) return;
    setLoading(true);
    try {
      const all = await nftActor.getAllNFTs();
      setNFTs(all);
    } catch (err) {
      console.error("Fetch NFTs error:", err);
    } finally {
      setLoading(false);
    }
  }, [nftActor]);

  const mintNFT = useCallback(
    async (price) => {
      if (!nftActor) return;
      setTxMsg("Minting NFT...");
      try {
        const res = await nftActor.mintNFT(price);
        setTxMsg(res);
        await fetchNFTs();
      } catch (err) {
        console.error(err);
        setTxMsg("Minting failed");
      } finally {
        setTimeout(() => setTxMsg(""), 2500);
      }
    },
    [nftActor, fetchNFTs]
  );

  const placeBid = useCallback(
    async (nftId, bidAmount) => {
      if (!marketActor) return;
      setTxMsg("Placing bid...");
      try {
        const res = await marketActor.placeBid(nftId, bidAmount);
        setTxMsg(res);
        await fetchNFTs();
      } catch (err) {
        console.error(err);
        setTxMsg("Bid failed");
      } finally {
        setTimeout(() => setTxMsg(""), 2500);
      }
    },
    [marketActor, fetchNFTs]
  );

  const finalizeSale = useCallback(
    async (nftId) => {
      if (!marketActor) return;
      setTxMsg("Finalizing sale...");
      try {
        const res = await marketActor.finalizeSale(nftId);
        setTxMsg(res);
        await fetchNFTs();
      } catch (err) {
        console.error(err);
        setTxMsg("Finalize failed");
      } finally {
        setTimeout(() => setTxMsg(""), 2500);
      }
    },
    [marketActor, fetchNFTs]
  );

  return {
    nfts,
    loading,
    txMsg,
    fetchNFTs,
    mintNFT,
    placeBid,
    finalizeSale,
  };
}
