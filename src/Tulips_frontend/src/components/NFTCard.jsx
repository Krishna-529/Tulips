import React, { useState, useEffect } from "react";
import Base64Image from "./Base64Image";

export default function NFTCard({ nft, currentUser, onBid, onFinalize, showBidButton = true }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  
  const isOwner = nft.owner === currentUser;
  const canBid = showBidButton && !isOwner && nft.forSale && !isExpired;
  const canFinalize = isOwner && nft.forSale && isExpired;

  useEffect(() => {
    if (!nft.bidEndTime) return;

    const updateTimer = () => {
      const now = Date.now() * 1_000_000;
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
    <div className="nft-card" data-testid={`nft-card-${nft.id}`}>
      <div className="nft-image">
        {nft.image ? (
          <Base64Image base64String={nft.image} alt={nft.name || `NFT ${nft.id}`} />
        ) : (
          <div className="nft-placeholder">NFT #{nft.id}</div>
        )}
        {nft.forSale && (
          <div className={`nft-badge ${nft.isOnBid ? 'auction' : 'sale'}`}>
            {nft.isOnBid ? 'On Auction' : 'For Sale'}
          </div>
        )}
      </div>

      <div className="nft-info">
        <h3>{nft.name || `NFT #${nft.id}`}</h3>

        <div className="nft-owner">
          Owner: {isOwner ? "You" : `${nft.owner.slice(0, 8)}...`}
        </div>

        <div className="nft-price">
          {formatPrice(nft.price)} <span className="token">DAMN</span>
        </div>

        {nft.forSale && nft.bidEndTime && (
          <div className="auction-info">
            <div className="time-left">Time Left: {timeLeft}</div>
            <div className="min-bid">Min Next Bid: {formatPrice(getMinBidAmount())} DAMN</div>
          </div>
        )}

        <div className="nft-actions">
          {canBid && (
            <button 
              className="btn" 
              onClick={handleBidClick}
              data-testid={`bid-button-${nft.id}`}
            >
              Place Bid
            </button>
          )}
          {canFinalize && (
            <button 
              className="btn btn-secondary" 
              onClick={handleFinalizeClick}
              data-testid={`finalize-button-${nft.id}`}
            >
              Finalize Auction
            </button>
          )}
          {isOwner && !nft.forSale && (
            <button className="btn btn-secondary" disabled>
              Owned by You
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
