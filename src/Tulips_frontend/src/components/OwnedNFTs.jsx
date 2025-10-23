import React, { useState, useEffect } from "react";
import { useNFT } from "../hooks/useNFT";
import Base64Image from "./Base64Image";
import ListNFTModal from "./ListNFTModal";

export default function OwnedNFTs() {
  const { getUserNFTs, principal, withdrawNFT } = useNFT();
  const [ownedNFTs, setOwnedNFTs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedNft, setSelectedNft] = useState(null);
  const [showListModal, setShowListModal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(null);

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

  const listedNFTs = ownedNFTs.filter(n => n.status !== "Owned");
  const notListedNFTs = ownedNFTs.filter(n => n.status === "Owned");

  const handleListClick = (nft) => {
    setSelectedNft(nft);
    setShowListModal(true);
  };

  const handleCloseModal = () => {
    setShowListModal(false);
    setSelectedNft(null);
  };

  const handleListSuccess = () => {
    setMessage("NFT listed successfully!");
    loadOwnedNFTs();
    setTimeout(() => setMessage(""), 3000);
  };

  const handleWithdraw = async (nftId) => {
    setWithdrawing(nftId);
    try {
      const result = await withdrawNFT(nftId);
      if (result.success) {
        setMessage("NFT withdrawn from sale successfully!");
        loadOwnedNFTs();
      } else {
        setMessage(`Failed to withdraw: ${result.error}`);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
    setTimeout(() => setMessage(""), 3000);
    setWithdrawing(null);
  };

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
              style={{ opacity: nft.status !== "Owned" ? 0.7 : 1 }}
              data-testid={`owned-nft-${nft.id}`}
            >
              <div className="nft-image">
                <Base64Image base64String={nft.image} alt={nft.name} />
                {nft.status !== "Owned" && (
                  <div className={`nft-badge ${nft.status === "isOnBid" ? 'auction' : 'sale'}`}>
                    {nft.status === "isOnBid" ? "On Auction" : "Listed for Sale"}
                  </div>
                )}
              </div>
              <div className="nft-info">
                <h3>{nft.name} #{nft.id}</h3>
                <div className="nft-price">
                  {parseInt(nft.price).toLocaleString()} <span className="token">DAMN</span>
                </div>
                {nft.status !== "Owned" ? (
                  <div style={{ marginTop: '0.75rem' }}>
                    <p style={{ color: 'var(--success)', marginBottom: '0.75rem' }}>
                      {nft.status === "isOnBid" ? "On Auction" : "Listed for Sale"}
                    </p>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => handleWithdraw(nft.id)}
                      disabled={withdrawing === nft.id}
                      style={{ width: '100%' }}
                    >
                      {withdrawing === nft.id ? <span className="spinner"></span> : "Withdraw from Sale"}
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: '0.75rem' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Not Listed</p>
                    <button 
                      className="btn" 
                      onClick={() => handleListClick(nft)}
                      style={{ width: '100%' }}
                    >
                      List NFT
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ListNFTModal
        nft={selectedNft}
        isOpen={showListModal}
        onClose={handleCloseModal}
        onSuccess={handleListSuccess}
      />

      {message && (
        <div className={`notif ${message.includes("successfully") ? "" : "notif-disabled"}`}>
          {message}
        </div>
      )}
    </div>
  );
}
