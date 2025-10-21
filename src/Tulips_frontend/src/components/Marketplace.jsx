import React, { useState, useEffect } from "react";
import { useNFT } from "../hooks/useNFT";
import NFTCard from "./NFTCard";
// import BidNFT from "./BidNFT";

export default function Marketplace() {
  const { getAllNFTs, finalizeBid, principal } = useNFT();
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNft, setSelectedNft] = useState(null);
  const [showBidModal, setShowBidModal] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all"); // all, auction, buy-now
  const [sortBy, setSortBy] = useState("newest"); // newest, price-low, price-high

  useEffect(() => {
    loadNFTs();
    const interval = setInterval(refreshMarketplace, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [getAllNFTs]);

  const loadNFTs = async () => {
    setLoading(true);
    try {
      const allNfts = await getAllNFTs();
      setNfts(allNfts.filter(nft => nft.forSale || nft.isOnBid));
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
      setNfts(allNfts.filter(nft => nft.forSale || nft.isOnBid));
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
    setMessage("Bid placed successfully! 🎉");
    refreshMarketplace();
    setTimeout(() => setMessage(""), 3000);
  };

  const handleFinalize = async (tokenId) => {
    try {
      setMessage("Finalizing auction...");
      const result = await finalizeBid(tokenId);
      if (result.success) {
        setMessage(result.winner ? 
          `Auction finalized! Winner: ${result.winner.slice(0,8)}... 🏆` : 
          "Auction ended with no valid bids"
        );
        refreshMarketplace();
      } else {
        setMessage(`Failed to finalize: ${result.error}`);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
    setTimeout(() => setMessage(""), 5000);
  };

  const sortNFTs = (nfts) => {
    const sorted = [...nfts];
    switch (sortBy) {
      case "price-low":
        return sorted.sort((a,b) => parseInt(a.currentPrice || a.price) - parseInt(b.currentPrice || b.price));
      case "price-high":
        return sorted.sort((a,b) => parseInt(b.currentPrice || b.price) - parseInt(a.currentPrice || a.price));
      case "newest":
      default:
        return sorted.sort((a,b) => parseInt(b.id) - parseInt(a.id));
    }
  };

  const filteredNFTs = sortNFTs(nfts.filter(nft => {
    if (filter === "auction") return nft.isOnBid;
    if (filter === "buy-now") return !nft.isOnBid && nft.forSale;
    return true;
  }));

  const auctionCount = nfts.filter(nft => nft.isOnBid).length;
  const buyNowCount = nfts.filter(nft => !nft.isOnBid && nft.forSale).length;

  if (loading) return <div className="marketplace-container"><p>Loading marketplace...</p></div>;

  return (
    <div className="marketplace-container">
      <div className="marketplace-header">
        <h2>NFT Marketplace</h2>
        <p>Discover and bid on unique digital assets</p>
        <div className="marketplace-stats">
          <div>Total Listed: {nfts.length}</div>
          <div>Live Auctions: {auctionCount}</div>
          <div>Buy Now: {buyNowCount}</div>
        </div>
      </div>

      <div className="marketplace-controls">
        <div className="filters">
          <button className={filter==="all"?"active":""} onClick={()=>setFilter("all")}>All ({nfts.length})</button>
          <button className={filter==="auction"?"active":""} onClick={()=>setFilter("auction")}>Auctions ({auctionCount})</button>
          <button className={filter==="buy-now"?"active":""} onClick={()=>setFilter("buy-now")}>Buy Now ({buyNowCount})</button>
        </div>

        <div className="sort">
          <label>Sort by:</label>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>

        <button onClick={refreshMarketplace} disabled={refreshing}>
          {refreshing ? "Refreshing..." : "🔄 Refresh"}
        </button>
      </div>

      {filteredNFTs.length === 0 ? (
        <div className="empty-marketplace">
          <h3>No NFTs Available</h3>
          <p>{filter==="auction"?"No live auctions":filter==="buy-now"?"No buy-now NFTs":"No NFTs listed"}.</p>
        </div>
      ) : (
        <div className="nft-grid">
          {filteredNFTs.map(nft => (
            <NFTCard
              key={`${nft.id}-${nft.currentPrice}-${nft.isOnBid}`}
              nft={nft}
              currentUser={principal}
              onBid={handleBidClick}
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

      {message && <div className={`notif ${message.includes("successfully") || message.includes("finalized")?"":"notif-disabled"}`}>{message}</div>}
    </div>
  );
}

