import React, { useState } from "react";
import { useNFT } from "../hooks/useNFT";
import { useBank } from "../hooks/useBank";

export default function BidNFT({ nft, isOpen, onClose, onSuccess }) {
  const { placeBid } = useNFT();
  const { getBalance } = useBank();
  const [bidAmount, setBidAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !nft) return null;

  const currentPrice = parseInt(nft.price);
  const minBid = Math.ceil(currentPrice * 1.05);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const amount = parseInt(bidAmount);
    if (amount < minBid) {
      setError(`Bid must be at least ${minBid} DAMN (5% above current price)`);
      return;
    }

    setLoading(true);

    try {
      const balance = await getBalance();
      if (parseInt(balance) < amount) {
        setError("Insufficient balance");
        setLoading(false);
        return;
      }

      const result = await placeBid(nft.id, amount);
      if (result.success) {
        setBidAmount("");
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setError(result.error || "Failed to place bid");
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    }

    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Place Bid</h2>
          <button className="modal-close" onClick={onClose} data-testid="close-bid-modal">
            ×
          </button>
        </div>

        <div className="nft-info" style={{ marginBottom: '1.5rem' }}>
          <h3>{nft.name || `NFT #${nft.id}`}</h3>
          <div className="nft-owner">Owner: {nft.owner.slice(0, 8)}...</div>
          <div className="nft-price">
            Current Price: {currentPrice.toLocaleString()} <span className="token">DAMN</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Your Bid Amount</label>
            <input
              type="number"
              min={minBid}
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder={`Minimum: ${minBid.toLocaleString()} DAMN`}
              required
              data-testid="bid-amount-input"
            />
            <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>
              Minimum bid: {minBid.toLocaleString()} DAMN (5% above current price)
            </small>
          </div>

          {error && (
            <div className="notif notif-disabled" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="submit"
              className="btn"
              disabled={loading}
              style={{ flex: 1 }}
              data-testid="submit-bid-button"
            >
              {loading ? <span className="spinner"></span> : "Place Bid"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
