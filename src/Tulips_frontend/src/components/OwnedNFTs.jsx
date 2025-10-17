import React, { useState, useEffect } from "react";
import { useNFT } from "../hooks/useNFT";
import OwnedNFTCard from "./NFTCard";
import { nft } from "../../../declarations/nft";

export default function OwnedNFTs() {
  const { getUserNFTs, principal } = useNFT();
  const [ownedNFTs, setOwnedNFTs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (principal) loadOwnedNFTs();
  }, [principal]);

  const loadOwnedNFTs = async () => {
    setLoading(true);
    try {
      const nfts = await getUserNFTs();
      setOwnedNFTs(nfts.filter(Boolean)); // Remove null/undefined
    } catch (err) {
      console.error(err);
      setMessage("Failed to load your NFT collection");
      setTimeout(() => setMessage(""), 5000);
    }
    setLoading(false);
  };

  if (!principal) {
    return (
      <div className="owned-nfts-container">
        <div className="connect-notice">
          <h3>Connect Your Wallet</h3>
          <p>Please connect your wallet to view your NFT collection.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="owned-nfts-container">
        <div className="owned-header">
          <h2>My NFT Collection</h2>
          <p>Loading your collection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="owned-nfts-container">
      <div className="owned-header">
        <h2>My NFT Collection</h2>
        <p>These are the NFTs you currently own</p>
        <div className="collection-stats">
          <div>Total Owned: {ownedNFTs.length}</div>
          <div>Listed for Sale: {ownedNFTs.filter(n => n.forSale).length}</div>
          <div>Not for Sale: {ownedNFTs.filter(n => !n.forSale).length}</div>
        </div>
      </div>

      {ownedNFTs.length === 0 ? (
        <div className="empty-collection">
          <div className="empty-icon">📦</div>
          <h3>No NFTs Found</h3>
          <p>You don't own any NFTs yet.</p>
        </div>
      ) : (
        <div className="nft-grid owned-grid">
          {ownedNFTs.map((nftObj) => (
            <OwnedNFTCard key={nftObj.id} nft={nftObj} />
          ))}
        </div>
      )}

      {message && (
        <div className={`notif ${message.includes("successfully") ? "" : "notif-disabled"}`}>
          {message}
        </div>
      )}
    </div>
  );
}