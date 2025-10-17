import React, { useState, useEffect } from "react";
import Base64Image from "./Base64Image";

export default function OwnedNFTCard({ nft }) {
  const cardStyle = {
    opacity: nft.forSale ? 0.5 : 1, // fade when for sale
    transition: "opacity 0.3s ease",
    border: "1px solid #ccc",
    borderRadius: "10px",
    padding: "10px",
    textAlign: "center",
    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
    backgroundColor: "#fff",
  };

  return (
    <div className="nft-card" style={cardStyle}>
      <Base64Image base64String={nft.image} alt={nft.name} />
      <h3>
        {nft.name} #{nft.id}
      </h3>
      <p>Current Price: {nft.price} DAMN</p>
      {nft.forSale ? (
        <p style={{ color: "orange", fontWeight: "bold" }}>Listed for Sale</p>
      ) : (
        <p style={{ color: "gray" }}>Not for Sale</p>
      )}
    </div>
  );
}


function auctionedNFTCard({ nft, currentUser, onBid, onFinalize, showBidButton = true }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  
  const isOwner = nft.owner === currentUser;
  const canBid = showBidButton && !isOwner && nft.forSale && !isExpired;
  const canFinalize = isOwner && nft.forSale && isExpired;

  // Auction timer
  useEffect(() => {
    if (!nft.bidEndTime) return;

    const updateTimer = () => {
      const now = Date.now() * 1_000_000; // convert ms → ns
      const endTime = BigInt(nft.bidEndTime);
      const remaining = endTime - BigInt(now);

      if (remaining <= 0) {
        setTimeLeft("Auction Ended");
        setIsExpired(true);
        return;
      }

      const seconds = Number(remaining / 1_000_000_000n);
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      setTimeLeft(`${hours}h ${minutes}m ${secs}s`);
      setIsExpired(false);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [nft.bidEndTime]);

  const handleBidClick = () => {
    if (onBid && canBid) onBid(nft);
  };

  const handleFinalizeClick = () => {
    if (onFinalize && canFinalize) onFinalize(nft.id);
  };

  const formatPrice = (price) => parseInt(price).toLocaleString();

  const getMinBidAmount = () => {
    const currentPrice = parseInt(nft.price);
    return Math.ceil(currentPrice * 1.05);
  };

  return (
    <div className="nft-card">
      <div className="nft-image">
        {nft.metadata?.uri ? (
          <img
            src={nft.metadata.uri}
            alt={nft.metadata?.name || `NFT ${nft.id}`}
            onError={(e) => { e.target.src = "/placeholder-nft.png"; }}
          />
        ) : (
          <div className="nft-placeholder">NFT #{nft.id}</div>
        )}
      </div>

      <div className="nft-info">
        <h3>{nft.metadata?.name || `NFT #${nft.id}`}</h3>

        <div className="nft-owner">
          Owner: {isOwner ? "You" : `${nft.owner.slice(0, 8)}...`}
        </div>

        <div className="nft-price">
          Price: {formatPrice(nft.price)} <span className="token">DAMN</span>
        </div>

        {nft.forSale && (
          <div className="auction-info">
            <div className="time-left">Time Left: {timeLeft}</div>
            <div className="min-bid">Min Next Bid: {formatPrice(getMinBidAmount())} DAMN</div>
          </div>
        )}

        <div className="nft-actions">
          {canBid && <button className="btn btn-bid" onClick={handleBidClick}>🏆 Place Bid</button>}
          {canFinalize && <button className="btn btn-finalize" onClick={handleFinalizeClick}>✅ Finalize Auction</button>}
          {isOwner && !nft.forSale && <button className="btn btn-owned" disabled>✓ Owned by You</button>}
        </div>
      </div>
    </div>
  );
}