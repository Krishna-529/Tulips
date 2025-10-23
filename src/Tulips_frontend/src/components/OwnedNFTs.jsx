import React, { useState, useEffect } from "react";
import { useNFT } from "../hooks/useNFT";
import Base64Image from "./Base64Image";

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
      setOwnedNFTs(nfts.filter(Boolean));
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
        <div className="empty-collection">
          <h3>Connect Your Wallet</h3>
          <p>Please connect your wallet to view your NFT collection.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="owned-nfts-container">
        <h2>My NFT Collection</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Loading your collection...</p>
      </div>
    );
  }

  const listedNFTs = ownedNFTs.filter(n => n.forSale);
  const notListedNFTs = ownedNFTs.filter(n => !n.forSale);

  return (
    <div className="owned-nfts-container">
      <div style={{ marginBottom: '2rem' }}>
        <h2>My NFT Collection</h2>
        <p style={{ color: 'var(--text-secondary)' }}>These are the NFTs you currently own</p>
        <div style={{ 
          display: 'flex', 
          gap: '2rem', 
          marginTop: '1rem',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem'
        }}>
          <div>Total Owned: <strong style={{ color: 'var(--accent-primary)' }}>{ownedNFTs.length}</strong></div>
          <div>Listed for Sale: <strong style={{ color: 'var(--success)' }}>{listedNFTs.length}</strong></div>
          <div>Not for Sale: <strong style={{ color: 'var(--text-primary)' }}>{notListedNFTs.length}</strong></div>
        </div>
      </div>

      {ownedNFTs.length === 0 ? (
        <div className="empty-collection">
          <div className="empty-icon">📦</div>
          <h3>No NFTs Found</h3>
          <p>You don't own any NFTs yet. Create your first NFT to get started!</p>
        </div>
      ) : (
        <div className="nft-grid">
          {ownedNFTs.map((nft) => (
            <div 
              key={nft.id} 
              className="nft-card"
              style={{ opacity: nft.forSale ? 0.7 : 1 }}
              data-testid={`owned-nft-${nft.id}`}
            >
              <div className="nft-image">
                <Base64Image base64String={nft.image} alt={nft.name} />
                {nft.forSale && (
                  <div className="nft-badge sale">
                    Listed for Sale
                  </div>
                )}
              </div>
              <div className="nft-info">
                <h3>{nft.name} #{nft.id}</h3>
                <div className="nft-price">
                  {parseInt(nft.price).toLocaleString()} <span className="token">DAMN</span>
                </div>
                {nft.forSale ? (
                  <p style={{ color: 'var(--success)', marginTop: '0.5rem' }}>Listed for Sale</p>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Not for Sale</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {message && (
        <div className="notif notif-disabled">
          {message}
        </div>
      )}
    </div>
  );
}
