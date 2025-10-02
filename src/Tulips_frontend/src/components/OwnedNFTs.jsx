import React, { useState, useEffect } from "react";
import { useNFT } from "../hooks/useNFT";
import NFTCard from "./NFTCard";
import AuctionModal from "./AuctionModal";

export default function OwnedNFTs() {
  const { getUserNFTs, startBid, principal } = useNFT();
  const [ownedNFTs, setOwnedNFTs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNft, setSelectedNft] = useState(null);
  const [showAuctionModal, setShowAuctionModal] = useState(false);
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

  const handleStartAuction = (nft) => {
    setSelectedNft(nft);
    setShowAuctionModal(true);
  };

  const handleCloseAuctionModal = () => {
    setShowAuctionModal(false);
    setSelectedNft(null);
  };

  const handleAuctionSuccess = () => {
    setMessage("Auction started successfully!");
    loadOwnedNFTs();
    setTimeout(() => setMessage(""), 3000);
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
        <div className="skeleton owned-skeleton"></div>
      </div>
    );
  }

  return (
    <div className="owned-nfts-container">
      <div className="owned-header">
        <h2>My NFT Collection</h2>
        <p>Manage and auction your digital assets</p>
        <div className="collection-stats">
          <div>Total Owned: {ownedNFTs.length}</div>
          <div>On Auction: {ownedNFTs.filter(nft => nft.isOnBid).length}</div>
          <div>Available: {ownedNFTs.filter(nft => !nft.isOnBid).length}</div>
        </div>
      </div>

      {ownedNFTs.length === 0 ? (
        <div className="empty-collection">
          <div className="empty-icon">📦</div>
          <h3>No NFTs Found</h3>
          <p>You don't own any NFTs yet.</p>
          <p>Create your first NFT or purchase one from the marketplace!</p>
        </div>
      ) : (
        <div className="nft-grid owned-grid">
          {ownedNFTs.map((nft) => (
            <div key={nft.id} className="owned-nft-wrapper">
              <NFTCard
                nft={nft}
                currentUser={principal}
                showBidButton={false}
              />
              <div className="owned-actions">
                {!nft.isOnBid ? (
                  <button
                    className="btn btn-auction"
                    onClick={() => handleStartAuction(nft)}
                  >
                    🏛️ Start Auction
                  </button>
                ) : (
                  <div className="auction-active">
                    <span className="status-badge">🔥 Live Auction</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AuctionModal
        nft={selectedNft}
        isOpen={showAuctionModal}
        onClose={handleCloseAuctionModal}
        onSuccess={handleAuctionSuccess}
      />

      {message && (
        <div className={`notif ${message.includes("successfully") ? "" : "notif-disabled"}`}>
          {message}
        </div>
      )}
    </div>
  );
}



// import React from "react";

// export default function OwnedNFTs({ nfts }) {
//   if (nfts.length === 0) return <div>No NFTs owned yet.</div>;
//   return (
//     <div className="nft-grid">
//       {nfts.map((nft) => (
//         <div key={nft.id} className="nft-card nft-owned">
//           <div className="nft-image">🎨 NFT #{nft.id}</div>
//           <div>Price: {nft.price} DAMN</div>
//           <div>Status: {nft.forSale ? "For Sale" : "Not for Sale"}</div>
//           <button className="btn btn-disabled" disabled>
//             Cannot Bid
//           </button>
//         </div>
//       ))}
//     </div>
//   );
// }
