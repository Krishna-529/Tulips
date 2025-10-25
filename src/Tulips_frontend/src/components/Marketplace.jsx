import React, { useState, useEffect } from "react";
import { useNFT } from "../hooks/useNFT";
import NFTCard from "./NFTCard";
import BidNFT from "./BidNFT";

export default function Marketplace() {
  const { getAllNFTs, finalizeBid, buyNFT, principal } = useNFT();
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNft, setSelectedNft] = useState(null);
  const [showBidModal, setShowBidModal] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [buying, setBuying] = useState(null);

  useEffect(() => {
    loadNFTs();
    const interval = setInterval(refreshMarketplace, 30000);
    return () => clearInterval(interval);
  }, [getAllNFTs]);

  const loadNFTs = async () => {
    setLoading(true);
    try {
      const allNfts = await getAllNFTs();
      setNfts(allNfts.filter(nft => nft.status === "isOnSale" || nft.status === "isOnBid"));
    } catch (err) {
      console.error(err);
      setMessage("Failed to load marketplace NFTs");
      setTimeout(() => setMessage(""), 5000);
    }
    setLoading(false);
  };

  const refreshMarketplace = async () => {
    setRefreshing(true);
    try {
      const allNfts = await getAllNFTs();
      setNfts(allNfts.filter(nft => nft.status === "isOnSale" || nft.status === "isOnBid"));
    } catch (err) {
      console.error(err);
    }
    setRefreshing(false);
  };

  const handleBidClick = (nft) => {
    setSelectedNft(nft);
    setShowBidModal(true);
  };

  const handleCloseBidModal = () => {
    setShowBidModal(false);
    setSelectedNft(null);
  };

  const handleBidSuccess = () => {
    setMessage("Bid placed successfully!");
    refreshMarketplace();
    setTimeout(() => setMessage(""), 3000);
  };

  const handleFinalize = async (tokenId) => {
    try {
      setMessage("Finalizing auction...");
      const result = await finalizeBid(tokenId);
      if (result.success) {
        setMessage("Auction finalized successfully!");
        refreshMarketplace();
      } else {
        setMessage(`Failed to finalize: ${result.error}`);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
    setTimeout(() => setMessage(""), 5000);
  };

  const handleBuy = async (nft) => {
    setBuying(nft.id);
    try {
      setMessage("Purchasing NFT...");
      const result = await buyNFT(nft.id);
      if (result.success) {
        setMessage("NFT purchased successfully!");
        refreshMarketplace();
      } else {
        setMessage(`Failed to purchase: ${result.error}`);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
    setTimeout(() => setMessage(""), 3000);
    setBuying(null);
  };

  const sortNFTs = (nfts) => {
    const sorted = [...nfts];
    switch (sortBy) {
      case "price-low":
        return sorted.sort((a,b) => parseInt(a.price) - parseInt(b.price));
      case "price-high":
        return sorted.sort((a,b) => parseInt(b.price) - parseInt(a.price));
      case "newest":
      default:
        return sorted.sort((a,b) => parseInt(b.id) - parseInt(a.id));
    }
  };

  const filteredNFTs = sortNFTs(nfts.filter(nft => {
    if (filter === "auction") return nft.status === "isOnBid";
    if (filter === "buy-now") return nft.status === "isOnSale";
    return true;
  }));

  const auctionCount = nfts.filter(nft => nft.status === "isOnBid").length;
  const buyNowCount = nfts.filter(nft => nft.status === "isOnSale").length;

  if (loading) {
    return (
      <div className="marketplace-container">
        <p style={{ color: 'var(--text-secondary)' }}>Loading marketplace...</p>
      </div>
    );
  }

  return (
    <div className="marketplace-container">
      <div style={{ marginBottom: '2rem' }}>
        <h2>NFT Marketplace</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Discover and bid on unique digital assets</p>
        <div style={{ 
          display: 'flex', 
          gap: '2rem', 
          marginTop: '1rem',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem'
        }}>
          <div>Total Listed: <strong style={{ color: 'var(--accent-primary)' }}>{nfts.length}</strong></div>
          <div>Live Auctions: <strong style={{ color: 'var(--warning)' }}>{auctionCount}</strong></div>
          <div>Buy Now: <strong style={{ color: 'var(--success)' }}>{buyNowCount}</strong></div>
        </div>
      </div>

      <div className="marketplace-controls">
        <div className="filters">
          <button 
            className={filter==="all"?"active":""} 
            onClick={()=>setFilter("all")}
            data-testid="filter-all"
          >
            All ({nfts.length})
          </button>
          <button 
            className={filter==="auction"?"active":""} 
            onClick={()=>setFilter("auction")}
            data-testid="filter-auction"
          >
            Auctions ({auctionCount})
          </button>
          <button 
            className={filter==="buy-now"?"active":""} 
            onClick={()=>setFilter("buy-now")}
            data-testid="filter-buy-now"
          >
            Buy Now ({buyNowCount})
          </button>
        </div>

        <div className="sort">
          <label>Sort by:</label>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>

        <button 
          onClick={refreshMarketplace} 
          disabled={refreshing}
          className="btn btn-secondary"
          data-testid="refresh-marketplace"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {filteredNFTs.length === 0 ? (
        <div className="empty-marketplace">
          <h3>No NFTs Available</h3>
          <p>
            {filter==="auction"?"No live auctions":filter==="buy-now"?"No buy-now NFTs":"No NFTs listed"}.
          </p>
        </div>
      ) : (
        <div className="nft-grid" data-testid="marketplace-grid">
          {filteredNFTs.map(nft => (
            <NFTCard
              key={`${nft.id}-${nft.price}-${nft.status}`}
              nft={nft}
              currentUser={principal}
              onBid={handleBidClick}
              onBuy={handleBuy}
              onFinalize={handleFinalize}
              showBidButton={true}
            />
          ))}
        </div>
      )}

      <BidNFT
        nft={selectedNft}
        isOpen={showBidModal}
        onClose={handleCloseBidModal}
        onSuccess={handleBidSuccess}
      />

      {message && (
        <div className={`notif ${message.includes("successfully") || message.includes("finalized")?"":"notif-disabled"}`}>
          {message}
        </div>
      )}
    </div>
  );
}
