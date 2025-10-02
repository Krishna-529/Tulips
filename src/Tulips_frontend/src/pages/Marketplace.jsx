import React, { useState, useEffect } from "react";
import { useMarketplace } from "../hooks/useMarketplace";
import NFTCard from "../components/NFTCard";
import OwnedNFTs from "../components/OwnedNFTs";
import MintNFT from "../components/MintNFT";

export default function Marketplace({ nftActor, marketActor, principal }) {
  const { nfts, loading, txMsg, fetchNFTs, mintNFT, placeBid, finalizeSale } =
    useMarketplace(nftActor, marketActor, principal);

  useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  const ownedNFTs = nfts.filter((n) => n.owner === principal);
  const forSaleNFTs = nfts.filter((n) => n.owner !== principal && n.forSale);

  return (
    <div className="dashboard marketplace-dashboard">
      <h2>🌷 NFT Marketplace</h2>

      <MintNFT mintNFT={mintNFT} />

      {txMsg && <div className="notif">{txMsg}</div>}

      <h3>🎨 Owned NFTs</h3>
      <OwnedNFTs nfts={ownedNFTs} />

      <h3>🛒 NFTs for Sale/Auction</h3>
      {loading ? (
        <div>Loading NFTs...</div>
      ) : forSaleNFTs.length === 0 ? (
        <div>No NFTs available</div>
      ) : (
        <div className="nft-grid">
          {forSaleNFTs.map((nft) => (
            <NFTCard
              key={nft.id}
              nft={nft}
              principal={principal}
              placeBid={placeBid}
              finalizeSale={finalizeSale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
